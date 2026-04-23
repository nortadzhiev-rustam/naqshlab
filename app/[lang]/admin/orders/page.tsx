import { auth } from "@/lib/auth";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { listAdminOrders } from "@/lib/backend/admin";
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

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const op = dict.admin.ordersPage;
  const od = dict.orders;

  const { status } = await searchParams;
  const statusFilter = status?.toUpperCase() as OrderStatus | undefined;
  const validStatuses: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  const session = await auth();

  let orders: Order[] = [];
  try {
    orders = await listAdminOrders(
      session?.user?.id,
      statusFilter && validStatuses.includes(statusFilter) ? statusFilter : undefined
    );
  } catch {
    // Show empty table
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">{op.management}</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{dict.admin.orders}</h1>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <StatusLink href={`/${locale}/admin/orders`} label={op.all} active={!statusFilter} />
        {validStatuses.map((s) => (
          <StatusLink key={s} href={`/${locale}/admin/orders?status=${s.toLowerCase()}`} label={od.status[s]} active={statusFilter === s} />
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">{op.customer}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">{op.date}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">{op.items}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">{op.total}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">{op.status}</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.user?.name ?? "—"}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{order.user?.email}</p>
                </td>
                <td className="px-5 py-4 text-zinc-500 text-xs">
                  {new Date(order.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "tg-TJ", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-5 py-4 text-zinc-500">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                </td>
                <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  ${Number(order.totalAmount).toFixed(2)}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                    {od.status[order.status]}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/${locale}/admin/orders/${order.id}`}
                    className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                  >
                    {op.view}
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <ShoppingBag className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-400">{op.noOrders}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-amber-400 bg-amber-400 text-zinc-900 shadow-sm"
          : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
}

