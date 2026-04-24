"use server";

import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@/lib/types";
import { locales } from "@/app/[lang]/dictionaries";
import {
  addAdminProductVariant,
  createAdminProduct,
  deleteAdminProductVariant,
  updateAdminProduct,
  updateOrderStatusAsAdmin,
} from "@/lib/backend/admin";

function revalidateProductPages(slug?: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/products`);
    if (slug) revalidatePath(`/${locale}/products/${slug}`);
  }
}

const productSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens"
    ),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive(),
  category: z.enum(["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"]),
  isCustomizable: z.coerce.boolean(),
});

export type ProductFormState = {
  error?: string;
  success?: boolean;
};

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const admin = await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"),
    category: formData.get("category"),
    isCustomizable: formData.get("isCustomizable") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const images = (formData.getAll("images") as string[]).filter(Boolean);

  try {
    await createAdminProduct(admin.userId, { ...parsed.data, images });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create product." };
  }

  revalidateProductPages(parsed.data.slug);
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const admin = await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"),
    category: formData.get("category"),
    isCustomizable: formData.get("isCustomizable") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const images = (formData.getAll("images") as string[]).filter(Boolean);

  try {
    await updateAdminProduct(admin.userId, id, { ...parsed.data, images });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update product." };
  }

  revalidateProductPages(parsed.data.slug);
  return { success: true };
}

export async function addVariant(productId: string, formData: FormData) {
  const admin = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const priceModifier = Number(formData.get("priceModifier") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || undefined;

  if (!label) return;

  await addAdminProductVariant(admin.userId, productId, {
    label,
    priceModifier,
    stock,
    imageUrl,
  });

  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariant(id: string, productId: string) {
  const admin = await requireAdmin();

  await deleteAdminProductVariant(admin.userId, productId, id);

  revalidatePath(`/admin/products/${productId}`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const admin = await requireAdmin();

  await updateOrderStatusAsAdmin(admin.userId, orderId, status);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
