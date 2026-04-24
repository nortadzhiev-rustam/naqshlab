import { notFound } from "next/navigation";
import { ProductStudioClient } from "@/components/ProductStudioClient";
import { getProductBySlug, listProducts } from "@/lib/backend/store";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

export async function generateStaticParams() {
  try {
    const products = await listProducts({ customizable: true });
    return products.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export default async function ProductStudioPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  let product: Awaited<ReturnType<typeof getProductBySlug>> | null = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  if (!product?.isCustomizable) notFound();

  return (
    <ProductStudioClient
      lang={locale}
      dict={dict.products}
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        basePrice: Number(product.basePrice),
        images: product.images,
        variants: (product.variants ?? []).map((variant) => ({
          id: variant.id,
          label: variant.label,
          priceModifier: Number(variant.priceModifier),
          imageUrl: variant.imageUrl ?? null,
        })),
        presetDesigns: product.presetDesigns ?? [],
      }}
    />
  );
}