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
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm"
      >
        {processing ? "Processing…" : "Pay Now"}
      </button>
    </form>
  );
}

export function CheckoutClient({ lang = "tg", dict }: { lang?: string; dict?: Record<string, string> }) {
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
    router.push(`/${lang}/orders/${orderId}?payment=success`);
  }

  if (items.length === 0 && !orderId) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 mb-3">{dict?.emptyCart ?? (lang === "ru" ? "Корзина пуста." : "Сабади шумо холӣ аст.")}</p>
        <Link href={`/${lang}/products`} className="text-sm font-semibold text-amber-500 hover:text-amber-400 underline underline-offset-4 transition-colors">
          Browse products →
        </Link>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-zinc-400";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Left: Address + Payment */}
      <div className="space-y-6">
        {!clientSecret ? (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">{dict?.shippingAddress ?? (lang === "ru" ? "Адрес доставки" : "Суроғаи таҳвил")}</h2>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
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
                <div key={field.name} className="space-y-1.5">
                  <label htmlFor={field.name} className={labelClass}>
                    {field.label}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required={field.required !== false}
                    className={inputClass}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm mt-2"
              >
                {loading ? (dict?.preparing ?? (lang === "ru" ? "Подготовка..." : "Омода кардан...")) : (dict?.continue ?? (lang === "ru" ? "Перейти к оплате" : "Ба пардохт гузаштан"))}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">{dict?.payment ?? (lang === "ru" ? "Оплата" : "Пардохт")}</h2>
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
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-4">{dict?.orderSummary ?? (lang === "ru" ? "Итог заказа" : "Хулосаи фармоиш")}</h2>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.productName}
                {item.variantLabel && (
                  <span className="text-zinc-400"> — {item.variantLabel}</span>
                )}
                {" ×"}{item.quantity}
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3 flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
            <span>{dict?.total ?? (lang === "ru" ? "Итого" : "Ҷамъ")}</span>
            <span>${subtotal().toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
