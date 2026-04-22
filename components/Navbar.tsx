import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { CartDrawer } from "@/components/CartDrawer";
import { Package, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import Image from "next/image";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 w-full">
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <div className="bg-white/75 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800/60">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span className="relative inline-flex items-center justify-center w-[110px] h-[44px]">
              <Image
                src="/ornament.png"
                alt=""
                width={60}
                height={60}
                className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ animationDuration: "14s" }}
                aria-hidden="true"
              />
              <Image
                src="/naqshlab.png"
                alt="Naqshlab"
                width={88}
                height={28}
                className="relative z-10"
                priority
              />
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            <Link
              href="/products"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-all"
            >
              Shop
            </Link>

            {session?.user ? (
              <>
                <Link
                  href="/orders"
                  className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-all"
                  aria-label="My orders"
                >
                  <Package className="h-[18px] w-[18px]" />
                </Link>

                {/* @ts-expect-error custom role field */}
                {session.user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-all"
                    aria-label="Admin panel"
                  >
                    <LayoutDashboard className="h-[18px] w-[18px]" />
                  </Link>
                )}

                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-all"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="ml-1 flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Register
                </Link>
              </>
            )}

            <div className="ml-1">
              <CartDrawer />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
