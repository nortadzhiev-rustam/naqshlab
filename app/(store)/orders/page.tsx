import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { listOrdersForUser } from "@/lib/backend/store";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/orders");

  let orders: Order[] = [];
  try {
    orders = await listOrdersForUser(session.user.id);
  } catch {
    // Show empty state if API is unreachable
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p>No orders yet.</p>
          <Link href="/products" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-2xl border p-6 hover:shadow-md transition-shadow dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="font-semibold text-sm">
                    {order.items.map((i) => i.product.name).join(", ")}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {order.items.reduce((acc, i) => acc + i.quantity, 0)} item(s) ·{" "}
                    ${Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}
                >
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
