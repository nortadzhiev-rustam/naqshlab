import { auth } from "@/lib/auth";
import Link from "next/link";
import { Plus, Pencil, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { listAdminProducts } from "@/lib/backend/admin";

export default async function AdminProductsPage() {
  const session = await auth();

  let products: Product[] = [];
  try {
    products = await listAdminProducts(session?.user?.id);
  } catch {
    // Show empty table
  }

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Catalog</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Products</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-all shadow-sm shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Category</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Price</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Variants</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Custom</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100">{product.name}</td>
                <td className="px-5 py-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-500">{product.category}</span>
                </td>
                <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-100">${Number(product.basePrice).toFixed(2)}</td>
                <td className="px-5 py-4 text-zinc-500">{product.variantCount ?? 0}</td>
                <td className="px-5 py-4">
                  {product.isCustomizable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-400">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700">
                      No
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Package className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-400">No products yet.</p>
                    <Link href="/admin/products/new" className="text-xs font-medium text-amber-500 hover:text-amber-400 underline underline-offset-4">Create your first product</Link>
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

