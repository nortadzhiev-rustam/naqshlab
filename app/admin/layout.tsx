import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Package, ShoppingBag, ExternalLink } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-zinc-950 dark:bg-black text-zinc-100">
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-800">
          <Image src="/naqshlab.png" alt="Naqshlab" width={80} height={26} className="brightness-0 invert opacity-90" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {[
            { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/admin/products", icon: Package, label: "Products" },
            { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            View Store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
