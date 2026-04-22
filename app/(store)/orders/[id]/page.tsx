import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { CheckCircle } from "lucide-react";
import { getOrderForUser } from "@/lib/backend/store";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {payment === "success" && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-6 py-4 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">Payment successful!</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your order is confirmed and will be processed shortly.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/orders" className="text-sm text-zinc-500 hover:underline">← My Orders</Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Order Details</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="rounded-2xl border dark:border-zinc-800 overflow-hidden mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4 border-b last:border-0 dark:border-zinc-800">
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
            <div className="flex-1">
              <p className="font-medium">{item.product.name}</p>
              {item.variant && (
                <p className="text-xs text-zinc-500">{item.variant.label}</p>
              )}
              {item.presetDesign && (
                <p className="text-xs text-zinc-500">Design: {item.presetDesign.name}</p>
              )}
              {item.customizationData != null && (
                <p className="text-xs text-zinc-500">Custom design</p>
              )}
              <p className="text-sm mt-1">
                Qty: {item.quantity} · ${Number(item.unitPrice).toFixed(2)} each
              </p>
            </div>
            <p className="font-semibold text-sm">
              ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Summary + Shipping */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border p-5 dark:border-zinc-800">
          <h3 className="font-semibold mb-3">Shipping Address</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-6">
            {address.fullName}<br />
            {address.addressLine1}<br />
            {address.addressLine2 && <>{address.addressLine2}<br /></>}
            {address.city}, {address.postalCode}<br />
            {address.country}
          </p>
        </div>
        <div className="rounded-2xl border p-5 dark:border-zinc-800">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="flex justify-between text-sm mb-2">
            <span>Subtotal</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold dark:border-zinc-700">
            <span>Total</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
