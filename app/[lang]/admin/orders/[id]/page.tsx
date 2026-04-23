import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusUpdater } from "@/components/OrderStatusUpdater";
import type { Order } from "@/lib/types";
import { getAdminOrderById } from "@/lib/backend/admin";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const od = dict.admin.orderDetail;
  const orders = dict.orders;

  const session = await auth();

  let order: Order | null = null;
  try {
    order = await getAdminOrderById(id, session?.user?.id);
  } catch {
    notFound();
  }

  if (!order) notFound();

  const address = order.shippingAddress as Record<string, string>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href={`/${locale}/admin/orders`} className="text-sm text-zinc-500 hover:underline">← {od.backToOrders}</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{od.orderDetail}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {new Date(order.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "tg-TJ")}
        </p>
      </div>

      {/* Customer */}
      <div className="rounded-2xl border p-5 mb-6 dark:border-zinc-800">
        <h2 className="font-semibold mb-2">{od.customer}</h2>
        <p className="text-sm">{order.user?.name ?? "—"}</p>
        <p className="text-sm text-zinc-500">{order.user?.email}</p>
      </div>

      {/* Status */}
      <div className="rounded-2xl border p-5 mb-6 dark:border-zinc-800">
        <h2 className="font-semibold mb-3">{od.updateStatus}</h2>
        <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      {/* Items */}
      <div className="rounded-2xl border overflow-hidden mb-6 dark:border-zinc-800">
        <div className="px-5 py-4 border-b dark:border-zinc-800">
          <h2 className="font-semibold">{od.items}</h2>
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between px-5 py-3 border-b last:border-0 text-sm dark:border-zinc-800">
            <div>
              <p className="font-medium">{item.product.name}</p>
              {item.variant && <p className="text-xs text-zinc-500">{item.variant.label}</p>}
              {item.presetDesign && <p className="text-xs text-zinc-500">{orders.design}: {item.presetDesign.name}</p>}
              {item.customizationData != null && <p className="text-xs text-zinc-500">{orders.customDesign}</p>}
              <p className="text-zinc-500 mt-0.5">{orders.qty}: {item.quantity}</p>
            </div>
            <p className="font-medium">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Shipping + Total */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-5 dark:border-zinc-800">
          <h2 className="font-semibold mb-2">{od.shippingAddress}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-6">
            {address.fullName}<br />
            {address.addressLine1}<br />
            {address.addressLine2 && <>{address.addressLine2}<br /></>}
            {address.city}, {address.postalCode}<br />
            {address.country}
          </p>
        </div>
        <div className="rounded-2xl border p-5 dark:border-zinc-800">
          <h2 className="font-semibold mb-2">{od.total}</h2>
          <p className="text-2xl font-bold">${Number(order.totalAmount).toFixed(2)}</p>
          {order.stripePaymentIntentId && (
            <p className="text-xs text-zinc-500 mt-1 break-all">
              Stripe PI: {order.stripePaymentIntentId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

