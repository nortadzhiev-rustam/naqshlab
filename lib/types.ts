// Shared types used across Next.js and the separate backend API.
// Keep these in sync with your backend's response shapes.

export type Role = "CUSTOMER" | "ADMIN";
export type Category = "APPAREL" | "MUG" | "ACCESSORY" | "POSTER" | "OTHER";
export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ProductVariant = {
  id: string;
  productId: string;
  label: string;
  priceModifier: number;
  stock: number;
};

export type PresetDesign = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  category: Category;
  isCustomizable: boolean;
  images: string[];
  variantCount?: number;
  variants?: ProductVariant[];
  presetDesigns?: PresetDesign[];
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  presetDesignId: string | null;
  quantity: number;
  unitPrice: number;
  customizationData: unknown | null;
  product: { name: string; slug?: string; images?: string[] };
  variant?: { label: string } | null;
  presetDesign?: { name: string; imageUrl: string } | null;
};

export type Order = {
  id: string;
  userId: string;
  totalAmount: number;
  shippingAddress: Record<string, string>;
  stripePaymentIntentId: string | null;
  status: OrderStatus;
  items: OrderItem[];
  user?: { name: string | null; email: string };
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
};
