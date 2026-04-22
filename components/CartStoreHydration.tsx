"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

export function CartStoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
