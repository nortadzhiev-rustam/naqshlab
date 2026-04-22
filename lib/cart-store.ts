import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string; // local cart item id (productId + variantId + presetDesignId)
  productId: string;
  productName: string;
  productImage: string;
  variantId?: string;
  variantLabel?: string;
  presetDesignId?: string;
  presetDesignImage?: string;
  customizationData?: object; // Fabric.js canvas JSON
  quantity: number;
  unitPrice: number; // in dollars
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
};

function buildId(item: Omit<CartItem, "id">) {
  return [item.productId, item.variantId ?? "", item.presetDesignId ?? ""].join(
    ":"
  );
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item) {
        const id = buildId(item);
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, id }] };
        });
      },

      removeItem(id) {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateQuantity(id, quantity) {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }));
      },

      clearCart() {
        set({ items: [] });
      },

      totalItems() {
        return get().items.reduce((acc, i) => acc + i.quantity, 0);
      },

      subtotal() {
        return get().items.reduce(
          (acc, i) => acc + i.unitPrice * i.quantity,
          0
        );
      },
    }),
    { name: "naqshlab-cart" }
  )
);
