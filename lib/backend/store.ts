import "server-only";

import { apiRequest } from "@/lib/api";
import type { Category, Order, Product } from "@/lib/types";

export type ProductFilters = {
  take?: number;
  orderBy?: string;
  category?: Category;
  customizable?: boolean;
};

export async function listProducts(filters: ProductFilters = {}) {
  return apiRequest<Product[]>("/products", {
    searchParams: {
      ...(filters.take ? { take: String(filters.take) } : {}),
      ...(filters.orderBy ? { orderBy: filters.orderBy } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.customizable ? { customizable: "true" } : {}),
    },
  });
}

export async function getProductBySlug(slug: string) {
  return apiRequest<Product>(`/products/slug/${slug}`);
}

export async function listOrdersForUser(userId: string) {
  return apiRequest<Order[]>("/orders", { userId });
}

export async function getOrderForUser(userId: string, orderId: string) {
  return apiRequest<Order>(`/orders/${orderId}`, { userId });
}

export type CreateOrderPayload = {
  totalAmount: number;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  stripePaymentIntentId: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    presetDesignId: string | null;
    customizationData: object | null;
    quantity: number;
    unitPrice: number;
  }>;
};

export async function createOrderForUser(userId: string, payload: CreateOrderPayload) {
  return apiRequest<Order>("/orders", {
    method: "POST",
    userId,
    body: payload,
  });
}
