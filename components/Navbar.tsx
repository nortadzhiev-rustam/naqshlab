import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { CartDrawer } from "@/components/CartDrawer";
import { Package, LayoutDashboard } from "lucide-react";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur dark:bg-zinc-900/80 dark:border-zinc-800">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Naqshlab
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/products"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Shop
          </Link>

          {session?.user ? (
            <>
              <Link
                href="/orders"
                className="rounded-md p-2 text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                aria-label="My orders"
              >
                <Package className="h-5 w-5" />
              </Link>

              {/* @ts-expect-error custom role field */}
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-md p-2 text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                  aria-label="Admin"
                >
                  <LayoutDashboard className="h-5 w-5" />
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
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="ml-1 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                Register
              </Link>
            </>
          )}

          <CartDrawer />
        </div>
      </nav>
    </header>
  );
}
