import Link from "next/link";
import { apiRequest } from "@/lib/api";
import type { Product, Category } from "@/lib/types";

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

  const products = await apiRequest<Product[]>("/products", {
    searchParams: {
      ...(category && Object.keys(CATEGORY_LABELS).includes(category)
        ? { category }
        : {}),
      ...(customizableOnly ? { customizable: "true" } : {}),
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">All Products</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <FilterLink href="/products" label="All" active={!category && !customizableOnly} />
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <FilterLink
            key={key}
            href={`/products?category=${key.toLowerCase()}`}
            label={label}
            active={category === key}
          />
        ))}
        <FilterLink href="/products?customizable=true" label="Customizable" active={customizableOnly} />
      </div>

      {products.length === 0 ? (
        <p className="text-center text-zinc-500 py-20">No products found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block overflow-hidden rounded-2xl border dark:border-zinc-800 hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400 text-xs">No image</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {CATEGORY_LABELS[product.category]}
                  </p>
                  {product.isCustomizable && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider dark:bg-zinc-800">
                      Custom
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm font-medium">${Number(product.basePrice).toFixed(2)}</p>
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
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-400"
      }`}
    >
      {label}
    </Link>
  );
}
