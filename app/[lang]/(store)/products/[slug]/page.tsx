import { notFound } from "next/navigation";
import { ProductDetailWrapper } from "@/components/ProductDetailWrapper";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        <div className="mb-4">
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
        <ProductDetailWrapper
          lang={locale}
          dict={pd}
          emptyLabel={pd.empty}
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
              imageUrl: v.imageUrl ?? null,
            })),
            presetDesigns: product.presetDesigns ?? [],
          }}
        />
      </div>
    </div>
  );
}

