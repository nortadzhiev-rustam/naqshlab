import { Navbar } from "@/components/Navbar";
import { CartStoreHydration } from "@/components/CartStoreHydration";
import Link from "next/link";
import Image from "next/image";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CartStoreHydration />
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <Image src="/naqshlab.png" alt="Naqshlab" width={100} height={32} />
              <p className="text-sm text-zinc-500 max-w-xs text-center md:text-left">
                Premium print-on-demand — your designs, beautifully crafted.
              </p>
            </div>
            {/* Links */}
            <div className="flex gap-12">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Shop</p>
                <Link href="/products" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">All Products</Link>
                <Link href="/products?customizable=true" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Custom Design</Link>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Account</p>
                <Link href="/orders" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">My Orders</Link>
                <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Sign In</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Naqshlab. All rights reserved.</p>
            <p className="text-xs text-zinc-400">Crafted with care ✦</p>
          </div>
        </div>
      </footer>
    </>
  );
}
