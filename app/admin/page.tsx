import { auth } from "@/lib/auth";
import { ShoppingBag, Package, DollarSign, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { AdminStats } from "@/lib/types";
import { getAdminStats } from "@/lib/backend/admin";

export default async function AdminDashboard() {
  const session = await auth();

  let stats: AdminStats = { totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0 };
  try {
    stats = await getAdminStats(session?.user?.id);
  } catch {
    // Show zeros if API unreachable
  }

  const statCards = [
    {
      label: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      trend: "All time",
    },
    {
      label: "Pending",
      value: stats.pendingOrders.toLocaleString(),
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      trend: "Needs action",
    },
    {
      label: "Revenue",
      value: `$${Number(stats.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      trend: "Excl. cancelled",
    },
    {
      label: "Products",
      value: stats.totalProducts.toLocaleString(),
      icon: Package,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      trend: "In catalog",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Admin</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, trend }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-zinc-500">{label}</p>
              <div className={`rounded-xl p-2 ${iconBg}`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
            <p className="mt-1 text-xs text-zinc-400">{trend}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { href: "/admin/products/new", icon: Package, title: "Add Product", desc: "Create a new product listing", color: "text-purple-500", bg: "bg-purple-500/10" },
          { href: "/admin/orders?status=pending", icon: TrendingUp, title: "Pending Orders", desc: `${stats.pendingOrders} orders need attention`, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map(({ href, icon: Icon, title, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <div className={`rounded-xl p-3 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm group-hover:text-amber-500 transition-colors">{title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


