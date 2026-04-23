"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { DesignEditor } from "@/components/DesignEditor";
import { ShoppingCart, Check } from "lucide-react";

type Variant = {
  id: string;
  label: string;
  priceModifier: number;
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
  };
};

export function ProductDetailClient({ product, dict }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    product.presetDesigns[0]?.id
  );
  const [customizationData, setCustomizationData] = useState<object | undefined>();
  const [mode, setMode] = useState<"preset" | "custom">(
    product.isCustomizable ? "preset" : "preset"
  );
  const [added, setAdded] = useState(false);

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
      presetDesignId: mode === "preset" ? selectedPresetId : undefined,
      presetDesignImage: mode === "preset" ? selectedPreset?.imageUrl : undefined,
      customizationData: mode === "custom" ? customizationData : undefined,
      quantity: 1,
      unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Mode toggle (only for customizable products) */}
      {product.isCustomizable && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("preset")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
              mode === "preset"
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-amber-500 dark:text-zinc-900 dark:border-amber-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            {dict?.chooseDesign ?? "Choose Design"}
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
              mode === "custom"
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-amber-500 dark:text-zinc-900 dark:border-amber-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            {dict?.customize ?? "Customize"}
          </button>
        </div>
      )}

      {/* Preset designs */}
      {mode === "preset" && product.presetDesigns.length > 0 && (
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

      {/* Custom editor */}
      {mode === "custom" && product.isCustomizable && (
        <DesignEditor
          backgroundImage={product.images[0]}
          onChange={setCustomizationData}
        />
      )}

      {/* Variants */}
      {product.variants.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">{dict?.options ?? "Options"}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
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
      </div>
    </div>
  );
}
