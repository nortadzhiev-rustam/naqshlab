import "server-only";

import { apiRequest } from "@/lib/api";
import type { AdminStats, Category, Order, OrderStatus, Product } from "@/lib/types";

export type AdminProductPayload = {
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  category: Category;
  isCustomizable: boolean;
  images?: string[];
};

function adminContext(userId?: string) {
  return { userId, role: "admin" as const };
}

export async function getAdminStats(userId?: string) {
  return apiRequest<AdminStats>("/admin/stats", adminContext(userId));
}

export async function listAdminProducts(userId?: string) {
  return apiRequest<Product[]>("/products", {
    ...adminContext(userId),
    searchParams: { includeVariantCount: "true" },
  });
}

export async function getAdminProductById(productId: string, userId?: string) {
  return apiRequest<Product>(`/products/${productId}`, adminContext(userId));
}

export async function createAdminProduct(userId: string, payload: AdminProductPayload) {
  return apiRequest<Product>("/products", {
    method: "POST",
    ...adminContext(userId),
    body: payload,
  });
}

export async function updateAdminProduct(
  userId: string,
  productId: string,
  payload: AdminProductPayload
) {
  return apiRequest<Product>(`/products/${productId}`, {
    method: "PUT",
    ...adminContext(userId),
    body: payload,
  });
}

export async function addAdminProductVariant(
  userId: string,
  productId: string,
  payload: { label: string; priceModifier: number; stock: number }
) {
  return apiRequest(`/products/${productId}/variants`, {
    method: "POST",
    ...adminContext(userId),
    body: payload,
  });
}

export async function deleteAdminProductVariant(userId: string, productId: string, variantId: string) {
  return apiRequest(`/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
    ...adminContext(userId),
  });
}

export async function listAdminOrders(userId: string | undefined, status?: OrderStatus) {
  return apiRequest<Order[]>("/admin/orders", {
    ...adminContext(userId),
    searchParams: status ? { status } : undefined,
  });
}

export async function getAdminOrderById(orderId: string, userId?: string) {
  return apiRequest<Order>(`/admin/orders/${orderId}`, adminContext(userId));
}

export async function updateOrderStatusAsAdmin(
  userId: string,
  orderId: string,
  status: OrderStatus
) {
  return apiRequest(`/orders/${orderId}/status`, {
    method: "PATCH",
    ...adminContext(userId),
    body: { status },
  });
}

export async function updateOrderStatusByPaymentIntent(intentId: string, status: OrderStatus) {
  return apiRequest(`/orders/by-payment-intent/${intentId}`, {
    method: "PATCH",
    body: { status },
  });
}
