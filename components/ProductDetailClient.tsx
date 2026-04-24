"use client";

import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { ShoppingCart, Check, ArrowRight, Cuboid } from "lucide-react";

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

type ProductDetailClientProps = {
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
  onVariantImageChange?: (url: string | null) => void;
};

export function ProductDetailClient({ lang, product, dict, onVariantImageChange }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    product.presetDesigns[0]?.id
  );
  const [added, setAdded] = useState(false);

  function handleSelectVariant(variantId: string) {
    setSelectedVariantId(variantId);
    const v = product.variants.find((v) => v.id === variantId);
    const img = v?.imageUrl ?? null;
    onVariantImageChange?.(img);
  }

  const addItem = useCartStore((s) => s.addItem);
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const unitPrice = product.basePrice + (selectedVariant?.priceModifier ?? 0);
  const selectedPreset = product.presetDesigns.find((d) => d.id === selectedPresetId);

  function handleAddToCart() {
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] ?? "",
      variantId: selectedVariantId,
      variantLabel: selectedVariant?.label,
      presetDesignId: selectedPresetId,
      presetDesignImage: selectedPreset?.imageUrl,
      quantity: 1,
      unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      {product.isCustomizable && lang && (
        <div className="rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(250,250,249,0.92))] p-5 shadow-sm dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.95),_rgba(9,9,11,0.96))]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <Cuboid className="h-3.5 w-3.5" /> {dict?.preview3d ?? "3D Preview"}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {dict?.studioTitle ?? "Customization Studio"}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {dict?.studioDescription ?? "Open the standalone studio to place artwork, switch variants, and inspect the product in a live angled preview before checkout."}
              </p>
            </div>
            <Link
              href={`/${lang}/studio/${product.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {dict?.openStudio ?? "Open Studio"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {!product.isCustomizable && product.presetDesigns.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">{dict?.selectDesign ?? "Select Design"}</p>
          <div className="flex flex-wrap gap-3">
            {product.presetDesigns.map((design) => (
              <button
                key={design.id}
                onClick={() => setSelectedPresetId(design.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                  selectedPresetId === design.id
                    ? "border-amber-400 shadow-md shadow-amber-400/20"
                    : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={design.imageUrl}
                  alt={design.name}
                  className="h-20 w-20 object-cover"
                />
                <p className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] text-white">
                  {design.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variants */}
      {product.variants.length > 0 && !product.isCustomizable && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">{dict?.options ?? "Options"}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleSelectVariant(variant.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                  selectedVariantId === variant.id
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                }`}
              >
                {variant.label}
                {variant.priceModifier > 0 && (
                  <span className="ml-1 text-xs opacity-70">
                    (+${variant.priceModifier.toFixed(2)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price + Add to cart */}
      <div className="flex items-center gap-4">
        <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">${unitPrice.toFixed(2)}</p>
        {product.isCustomizable && lang ? (
          <Link
            href={`/${lang}/studio/${product.slug}`}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 shadow-sm"
          >
            {dict?.openStudio ?? "Open Studio"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={handleAddToCart}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 shadow-sm"
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> {dict?.added ?? "Added!"}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" /> {dict?.addToCart ?? "Add to Cart"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
