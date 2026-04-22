"use client";

import { useCartStore } from "@/lib/cart-store";
import { ShoppingCart, X, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, removeItem, updateQuantity, subtotal, totalItems } =
    useCartStore();

  return (
    <>
      {/* Cart icon button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Open cart"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems() > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white dark:bg-white dark:text-black">
            {totalItems()}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl dark:bg-zinc-900 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">Cart ({totalItems()})</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 mt-12">
              Your cart is empty
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {item.productImage && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border dark:border-zinc-700">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium leading-tight">
                    {item.productName}
                  </p>
                  {item.variantLabel && (
                    <p className="text-xs text-zinc-500">{item.variantLabel}</p>
                  )}
                  <p className="text-sm font-semibold">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border text-xs dark:border-zinc-700"
                    >
                      −
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border text-xs dark:border-zinc-700"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 py-4 dark:border-zinc-700 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">${subtotal().toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
