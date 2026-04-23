"use client";

import { useCartStore } from "@/lib/cart-store";
import { ShoppingCart, X, Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function CartDrawer() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const { items, removeItem, updateQuantity, subtotal, totalItems } =
        useCartStore();

    return (
        <>
            {/* Cart icon button — stays inside Navbar */}
            <button
                onClick={() => setOpen(true)}
                className="relative p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Open cart"
            >
                <ShoppingCart className="h-5 w-5" />
                {totalItems() > 0 && (
                    <span
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {totalItems()}
                    </span>
                )}
            </button>

            {/* Backdrop + drawer — portalled to <body> to escape sticky/backdrop-filter ancestor */}
            {mounted && createPortal(
                <>
                    {/* Backdrop */}
                    {open && (
                        <div
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />
                    )}

                    {/* Drawer */}
                    <div
                        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white dark:bg-zinc-950 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"
                            }`}
                    >
                {/* Amber accent line */}
                <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
                    <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Cart <span className="text-zinc-400 font-normal text-sm">({totalItems()})</span></h2>
                    <button
                        onClick={() => setOpen(false)}
                        className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                            <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-4">
                                <ShoppingBag className="h-6 w-6 text-zinc-400" />
                            </div>
                            <p className="text-sm text-zinc-400">Your cart is empty</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="flex gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3">
                                {item.productImage && (
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                        <Image
                                            src={item.productImage}
                                            alt={item.productName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-1 flex-col gap-1 min-w-0">
                                    <p className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100 truncate">
                                        {item.productName}
                                    </p>
                                    {item.variantLabel && (
                                        <p className="text-xs text-zinc-400">{item.variantLabel}</p>
                                    )}
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        ${(item.unitPrice * item.quantity).toFixed(2)}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="text-sm w-5 text-center font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="ml-auto text-zinc-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Subtotal</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">${subtotal().toFixed(2)}</span>
                        </div>
                        <Link
                            href="/checkout"
                            onClick={() => setOpen(false)}
                            className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm"
                        >
                            Proceed to Checkout
                        </Link>
                    </div>
                )}
            </div>
                </>,
                document.body
            )}
        </>
    );
}

