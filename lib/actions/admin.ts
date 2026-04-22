"use server";

import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";

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
  // @ts-expect-error role is a custom field
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireAdmin();

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

  try {
    await apiRequest("/products", {
      method: "POST",
      userId: session.user!.id,
      role: "ADMIN",
      body: { ...parsed.data, images: [] },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create product." };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireAdmin();

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

  try {
    await apiRequest(`/products/${id}`, {
      method: "PUT",
      userId: session.user!.id,
      role: "ADMIN",
      body: parsed.data,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update product." };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/products/${parsed.data.slug}`);
  return { success: true };
}

export async function addVariant(productId: string, formData: FormData) {
  const session = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const priceModifier = Number(formData.get("priceModifier") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);

  if (!label) return;

  await apiRequest(`/products/${productId}/variants`, {
    method: "POST",
    userId: session.user!.id,
    role: "ADMIN",
    body: { label, priceModifier, stock },
  });

  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariant(id: string, productId: string) {
  const session = await requireAdmin();

  await apiRequest(`/products/${productId}/variants/${id}`, {
    method: "DELETE",
    userId: session.user!.id,
    role: "ADMIN",
  });

  revalidatePath(`/admin/products/${productId}`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const session = await requireAdmin();

  await apiRequest(`/orders/${orderId}/status`, {
    method: "PATCH",
    userId: session.user!.id,
    role: "ADMIN",
    body: { status },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
