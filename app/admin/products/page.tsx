import { auth } from "@/lib/auth";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>

      <div className="rounded-2xl border overflow-hidden dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Price</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Variants</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Customizable</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-zinc-500">{product.category}</td>
                <td className="px-4 py-3">${Number(product.basePrice).toFixed(2)}</td>
                <td className="px-4 py-3">{product.variantCount ?? 0}</td>
                <td className="px-4 py-3">
                  {product.isCustomizable ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">Yes</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  No products yet.{" "}
                  <Link href="/admin/products/new" className="underline underline-offset-4">Create one</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
