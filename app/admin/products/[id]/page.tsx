import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditProductClient } from "@/components/EditProductClient";
import type { Product } from "@/lib/types";
import { getAdminProductById } from "@/lib/backend/admin";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  let product: Product | null = null;
  try {
    product = await getAdminProductById(id, session?.user?.id);
  } catch {
    notFound();
  }

  if (!product) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">← Products</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit: {product.name}</h1>
      </div>

      <EditProductClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          basePrice: Number(product.basePrice),
          category: product.category,
          isCustomizable: product.isCustomizable,
          variants: (product.variants ?? []).map((v) => ({
            id: v.id,
            label: v.label,
            priceModifier: Number(v.priceModifier),
            stock: v.stock,
          })),
        }}
      />
    </div>
  );
}
