import Stripe from "stripe";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { apiRequest } from "@/lib/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await apiRequest(`/orders/by-payment-intent/${intent.id}`, {
      method: "PATCH",
      body: { status: "PROCESSING" },
    });
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await apiRequest(`/orders/by-payment-intent/${intent.id}`, {
      method: "PATCH",
      body: { status: "CANCELLED" },
    });
  }

  return Response.json({ received: true });
}
