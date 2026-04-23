import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { Product } from "@/lib/types";
import { getProductBySlug, listProducts } from "@/lib/backend/store";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

export async function generateStaticParams() {
  try {
    const products = await listProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const pd = dict.products;

  let product: Product | null = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  if (!product) notFound();

  const [currentImage, ...otherImages] = product.images;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Images */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            {currentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400">
                {pd.empty}
              </div>
            )}
          </div>
          {otherImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {otherImages.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${product.name} view ${i + 2}`}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover border dark:border-zinc-700"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-1">
              {product.category}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <ProductDetailClient
            lang={locale}
            dict={pd}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              basePrice: Number(product.basePrice),
              images: product.images,
              isCustomizable: product.isCustomizable,
              variants: (product.variants ?? []).map((v) => ({
                id: v.id,
                label: v.label,
                priceModifier: Number(v.priceModifier),
              })),
              presetDesigns: product.presetDesigns ?? [],
            }}
          />
        </div>
      </div>
    </div>
  );
}

