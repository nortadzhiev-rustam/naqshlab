import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { listOrdersForUser } from "@/lib/backend/store";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";

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

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const od = dict.orders;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?callbackUrl=/${locale}/orders`);

  let orders: Order[] = [];
  try {
    orders = await listOrdersForUser(session.user.id);
  } catch {
    // Show empty state if API is unreachable
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-1">{od.account}</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{od.title}</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-5">
            <Package className="h-8 w-8 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">{od.empty}</p>
            <p className="mt-1 text-sm text-zinc-400">{od.emptyDesc}</p>
          </div>
          <Link
            href={`/${locale}/products`}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all"
          >
            {od.startShopping} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${locale}/orders/${order.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                    {od.status[order.status]}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "tg-TJ", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-sm">
                  {order.items.map((i) => i.product.name).join(", ")}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)} {od.items}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  ${Number(order.totalAmount).toFixed(2)}
                </p>
                <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
