import { auth } from "@/lib/auth";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { listAdminOrders } from "@/lib/backend/admin";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
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
      <h1 className="text-2xl font-bold tracking-tight mb-6">Orders</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <StatusLink href="/admin/orders" label="All" active={!statusFilter} />
        {validStatuses.map((s) => (
          <StatusLink
            key={s}
            href={`/admin/orders?status=${s.toLowerCase()}`}
            label={s}
            active={statusFilter === s}
          />
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Items</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{order.user?.name ?? "—"}</p>
                  <p className="text-xs text-zinc-500">{order.user?.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(order.createdAt).toLocaleDateString("en-US")}
                </td>
                <td className="px-4 py-3">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                </td>
                <td className="px-4 py-3 font-medium">
                  ${Number(order.totalAmount).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  No orders found.
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
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
      }`}
    >
      {label}
    </Link>
  );
}
