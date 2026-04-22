import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { getOrderForUser } from "@/lib/backend/store";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40",
  SHIPPED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  PROCESSING: "bg-blue-400",
  SHIPPED: "bg-purple-400",
  DELIVERED: "bg-emerald-400",
  CANCELLED: "bg-red-400",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { payment } = await searchParams;

  let order: Order | null = null;
  try {
    order = await getOrderForUser(session.user.id, id);
  } catch {
    notFound();
  }

  if (!order || order.userId !== session.user.id) notFound();

  const address = order.shippingAddress as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {payment === "success" && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Payment successful!</p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
              Your order is confirmed and will be processed shortly.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> My Orders
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Order Details</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden mb-6 divide-y divide-zinc-50 dark:divide-zinc-800">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 p-5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              {(item.presetDesign?.imageUrl ?? item.product.images?.[0]) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.presetDesign?.imageUrl ?? item.product.images?.[0]}
                  alt={item.product.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{item.product.name}</p>
              {item.variant && (
                <p className="text-xs text-zinc-400 mt-0.5">{item.variant.label}</p>
              )}
              {item.presetDesign && (
                <p className="text-xs text-zinc-400">Design: {item.presetDesign.name}</p>
              )}
              {item.customizationData != null && (
                <p className="text-xs text-zinc-400">Custom design</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">
                Qty: {item.quantity} · ${Number(item.unitPrice).toFixed(2)} each
              </p>
            </div>
            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm shrink-0">
              ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Summary + Shipping */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Shipping Address</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-7">
            {address.fullName}<br />
            {address.addressLine1}<br />
            {address.addressLine2 && <>{address.addressLine2}<br /></>}
            {address.city}, {address.postalCode}<br />
            {address.country}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Order Summary</h3>
          <div className="flex justify-between text-sm text-zinc-500 mb-2">
            <span>Subtotal</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3 flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
            <span>Total</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
