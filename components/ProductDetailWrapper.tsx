"use client";

import { useState } from "react";
import { ProductDetailClient } from "@/components/ProductDetailClient";

type Variant = {
  id: string;
  label: string;
  priceModifier: number;
  imageUrl?: string | null;
};

type PresetDesign = {
  id: string;
  name: string;
  imageUrl: string;
};

type ProductDetailWrapperProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    images: string[];
    isCustomizable: boolean;
    variants: Variant[];
    presetDesigns: PresetDesign[];
  };
  lang?: string;
  dict?: {
    addToCart: string;
    added: string;
    options: string;
    selectDesign: string;
    chooseDesign: string;
    customize: string;
    openStudio: string;
    studioTitle: string;
    studioDescription: string;
    preview3d: string;
  };
  emptyLabel?: string;
};

export function ProductDetailWrapper({ product, lang, dict, emptyLabel }: ProductDetailWrapperProps) {
  const [activeImage, setActiveImage] = useState<string>(product.images[0] ?? "");

  function handleVariantImageChange(url: string | null) {
    if (url) setActiveImage(url);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Images */}
      <div className="flex flex-col gap-4">
        <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              {emptyLabel}
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(src)}
                className={`h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
                  activeImage === src
                    ? "border-black dark:border-white"
                    : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${product.name} view ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details slot — rendered by parent as children */}
      <div className="flex flex-col gap-6">
        <ProductDetailClient
          lang={lang}
          dict={dict}
          product={product}
          onVariantImageChange={handleVariantImageChange}
        />
      </div>
    </div>
  );
}
