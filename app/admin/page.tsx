import { auth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { ShoppingBag, Package, DollarSign, Clock } from "lucide-react";
import type { AdminStats } from "@/lib/types";

export default async function AdminDashboard() {
  const session = await auth();

  let stats: AdminStats = { totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0 };
  try {
    stats = await apiRequest<AdminStats>("/admin/stats", {
      userId: session?.user?.id,
      role: "ADMIN",
    });
  } catch {
    // Show zeros if API unreachable
  }

  const statCards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "text-blue-600",
    },
    {
      label: "Pending",
      value: stats.pendingOrders,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Revenue",
      value: `$${Number(stats.totalRevenue).toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-6 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-zinc-500">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
