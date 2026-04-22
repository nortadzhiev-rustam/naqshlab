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
};

export function ProductDetailClient({ product }: ProductDetailClientProps) {
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
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              mode === "preset"
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Choose Design
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              mode === "custom"
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Customize
          </button>
        </div>
      )}

      {/* Preset designs */}
      {mode === "preset" && product.presetDesigns.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">Select Design</p>
          <div className="flex flex-wrap gap-3">
            {product.presetDesigns.map((design) => (
              <button
                key={design.id}
                onClick={() => setSelectedPresetId(design.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition-colors ${
                  selectedPresetId === design.id
                    ? "border-black dark:border-white"
                    : "border-transparent"
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
          <p className="text-sm font-medium mb-3">Options</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedVariantId === variant.id
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
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
        <p className="text-2xl font-bold">${unitPrice.toFixed(2)}</p>
        <button
          onClick={handleAddToCart}
          className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
            added
              ? "bg-green-600 text-white"
              : "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
