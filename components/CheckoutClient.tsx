"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createCheckout } from "@/lib/actions/checkout";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function PaymentForm({
  orderId,
  onSuccess,
}: {
  orderId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?payment=success`,
      },
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
      >
        {processing ? "Processing…" : "Pay Now"}
      </button>
    </form>
  );
}

export function CheckoutClient() {
  const { items, subtotal, clearCart } = useCartStore();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createCheckout(
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        presetDesignId: item.presetDesignId,
        customizationData: item.customizationData,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      formData
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setClientSecret(result.clientSecret!);
    setOrderId(result.orderId!);
    setLoading(false);
  }

  function handlePaymentSuccess() {
    clearCart();
    router.push(`/orders/${orderId}?payment=success`);
  }

  if (items.length === 0 && !orderId) {
    return (
      <p className="text-center text-zinc-500 py-20">
        Your cart is empty.{" "}
        <Link href="/products" className="underline underline-offset-4">
          Shop now
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Left: Address + Payment */}
      <div className="space-y-8">
        {!clientSecret ? (
          <>
            <h2 className="text-lg font-semibold">Shipping Address</h2>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              {[
                { name: "fullName", label: "Full Name", type: "text", autoComplete: "name" },
                { name: "addressLine1", label: "Address", type: "text", autoComplete: "address-line1" },
                { name: "addressLine2", label: "Apartment / Suite (optional)", type: "text", autoComplete: "address-line2", required: false },
                { name: "city", label: "City", type: "text", autoComplete: "address-level2" },
                { name: "postalCode", label: "Postal Code", type: "text", autoComplete: "postal-code" },
                { name: "country", label: "Country", type: "text", autoComplete: "country-name" },
              ].map((field) => (
                <div key={field.name} className="space-y-1">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required={field.required !== false}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                {loading ? "Preparing payment…" : "Continue to Payment"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Payment</h2>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                orderId={orderId!}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </>
        )}
      </div>

      {/* Right: Order Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
        <div className="rounded-2xl border p-6 dark:border-zinc-800 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.productName}
                {item.variantLabel && (
                  <span className="text-zinc-500"> — {item.variantLabel}</span>
                )}
                {" ×"}{item.quantity}
              </span>
              <span className="font-medium">
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t pt-4 flex justify-between font-semibold dark:border-zinc-700">
            <span>Total</span>
            <span>${subtotal().toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
