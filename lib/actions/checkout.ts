"use server";

import { auth } from "@/lib/auth";
import Stripe from "stripe";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import type { Order } from "@/lib/types";

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
  unitPrice: number;
};

export type CheckoutFormState = {
  error?: string;
  clientSecret?: string;
  orderId?: string;
};

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

  const totalAmount = cartItems.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
  });

  // Create Order via backend API
  const order = await apiRequest<Order>("/orders", {
    method: "POST",
    userId: session.user.id,
    body: {
      totalAmount,
      shippingAddress: parsedAddress.data,
      stripePaymentIntentId: paymentIntent.id,
      items: cartItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        presetDesignId: item.presetDesignId ?? null,
        customizationData: item.customizationData ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    orderId: order.id,
  };
}
