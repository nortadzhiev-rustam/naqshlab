"use server";

import { auth } from "@/lib/auth";
import Stripe from "stripe";
import { z } from "zod";
import {
  createOrderForUser,
  quoteOrderForUser,
  type OrderLineInput,
} from "@/lib/backend/store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const addressSchema = z.object({
  fullName: z.string().min(2),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().min(2),
});

type CartItemInput = {
  productId: string;
  variantId?: string;
  presetDesignId?: string;
  customizationData?: object;
  quantity: number;
};

export type CheckoutFormState = {
  error?: string;
  clientSecret?: string;
  orderId?: string;
  totalAmount?: number;
};

function toCents(amount: number) {
  return Math.round(amount * 100);
}

export async function createCheckout(
  cartItems: CartItemInput[],
  formData: FormData
): Promise<CheckoutFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to checkout." };
  }

  if (cartItems.length === 0) {
    return { error: "Your cart is empty." };
  }

  const parsedAddress = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
  });

  if (!parsedAddress.success) {
    return { error: "Please fill in all required address fields." };
  }

  const lines: OrderLineInput[] = cartItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? null,
    presetDesignId: item.presetDesignId ?? null,
    customizationData: item.customizationData ?? null,
    quantity: item.quantity,
  }));

  // The browser's cart carries prices for display only. Everything charged is
  // priced by the backend against the catalogue.
  let quotedTotal: number;
  try {
    quotedTotal = (await quoteOrderForUser(session.user.id, lines)).totalAmount;
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "We couldn't price your cart.",
    };
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(quotedTotal),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });
  } catch {
    return { error: "We couldn't start the payment. Please try again." };
  }

  let order: Awaited<ReturnType<typeof createOrderForUser>>;
  try {
    order = await createOrderForUser(session.user.id, {
      shippingAddress: parsedAddress.data,
      stripePaymentIntentId: paymentIntent.id,
      items: lines,
    });
  } catch (err) {
    // Nothing was reserved, so release the intent rather than leaving it hanging.
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
    return {
      error:
        err instanceof Error
          ? err.message
          : "We couldn't place your order. Please try again.",
    };
  }

  // The catalogue can change between the quote and the order; the order is
  // authoritative, so the intent follows it.
  if (toCents(order.totalAmount) !== toCents(quotedTotal)) {
    await stripe.paymentIntents.update(paymentIntent.id, {
      amount: toCents(order.totalAmount),
    });
  }

  return {
    clientSecret: paymentIntent.client_secret!,
    orderId: order.id,
    totalAmount: order.totalAmount,
  };
}
