import Link from "next/link";
import { Palette } from "lucide-react";
import type { Category } from "@/lib/types";
import { listProducts } from "@/lib/backend/store";

const CATEGORY_LABELS: Record<Category, string> = {
  APPAREL: "Apparel",
  MUG: "Mugs",
  ACCESSORY: "Accessories",
  POSTER: "Posters",
  OTHER: "Other",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; customizable?: string }>;
}) {
  const params = await searchParams;
  const category = params.category?.toUpperCase() as Category | undefined;
  const customizableOnly = params.customizable === "true";

  const products = await listProducts({
    ...(category && Object.keys(CATEGORY_LABELS).includes(category) ? { category } : {}),
    ...(customizableOnly ? { customizable: true } : {}),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-1">Catalog</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">All Products</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        <FilterLink href="/products" label="All" active={!category && !customizableOnly} />
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <FilterLink
            key={key}
            href={`/products?category=${key.toLowerCase()}`}
            label={label}
            active={category === key}
          />
        ))}
        <FilterLink href="/products?customizable=true" label="✦ Customizable" active={customizableOnly} />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-zinc-400 text-sm">No products found.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ornament.png" alt="" className="w-14 h-14 opacity-10" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">
                    {CATEGORY_LABELS[product.category]}
                  </p>
                  {product.isCustomizable && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-400">
                      <Palette className="h-2.5 w-2.5" /> Custom
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ${Number(product.basePrice).toFixed(2)}
                  </p>
                  <span className="text-xs text-zinc-400 group-hover:text-amber-500 transition-colors">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
        active
          ? "border-amber-400 bg-amber-400 text-zinc-900 shadow-sm shadow-amber-200 dark:shadow-amber-900/30"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
}

