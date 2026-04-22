import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex h-14 items-center px-4 border-b dark:border-zinc-800">
          <Link href="/" className="font-semibold tracking-tight">Naqshlab</Link>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Admin</span>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/admin/products", icon: Package, label: "Products" },
            { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
