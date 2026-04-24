"use client";

import React, { useState, useRef } from "react";
import { useActionState } from "react";
import { updateProduct, addVariant, deleteVariant } from "@/lib/actions/admin";
import { Category } from "@/lib/types";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

const ALL_CATEGORIES: Category[] = ["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"];
import { Trash2 } from "lucide-react";

type Variant = { id: string; label: string; priceModifier: number; stock: number; imageUrl?: string | null };

type EditProductClientProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePrice: number;
    category: Category;
    isCustomizable: boolean;
    images: string[];
    variants: Variant[];
  };
};

export function EditProductClient({ product }: EditProductClientProps) {
  const boundUpdate = updateProduct.bind(null, product.id);
  const [state, action, pending] = useActionState(boundUpdate, {});

  const [imageUrls, setImageUrls] = useState<string[]>(product.images);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedVariantImage, setSelectedVariantImage] = useState<string>("");

  const { uploadFiles, isUploading, uploadError } = useImageUpload((urls) =>
    setImageUrls((prev) => [...prev, ...urls])
  );

  const handleFiles = (files: File[]) => uploadFiles(files);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-10">
      {/* Product form */}
      <form action={action} className="space-y-4 max-w-xl">
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </div>
        )}
        {uploadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {uploadError}
          </div>
        )}
        {state.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            Product updated successfully.
          </div>
        )}

        <Field label="Name" name="name" defaultValue={product.name} required />
        <Field label="Slug" name="slug" defaultValue={product.slug} required />
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={product.description ?? ""}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white resize-none"
          />
        </div>
        <Field label="Base Price ($)" name="basePrice" type="number" step="0.01" min="0" defaultValue={product.basePrice} required />

        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select
            id="category"
            name="category"
            defaultValue={product.category}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Photos</label>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
              dragging
                ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-800"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            {isUploading ? (
              <svg className="h-8 w-8 text-zinc-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12" />
              </svg>
            )}
            <p className="text-sm text-zinc-500">
              {isUploading ? "Uploading…" : "Drag & drop or click to select"}
            </p>
            <p className="text-xs text-zinc-400">PNG, JPG, WEBP · up to 5 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {imageUrls.map((url, i) => (
                <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border dark:border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`product-${i}`} className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <input type="hidden" name="images" value={url} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isCustomizable"
            name="isCustomizable"
            type="checkbox"
            defaultChecked={product.isCustomizable}
            className="h-4 w-4"
          />
          <label htmlFor="isCustomizable" className="text-sm font-medium">Allow customer customization</label>
        </div>

        <button
          type="submit"
          disabled={pending || isUploading}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Variants */}
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold mb-4">Variants</h2>

        {product.variants.length > 0 && (
          <div className="rounded-xl border overflow-hidden mb-4 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Photo</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Label</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">+Price</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Stock</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-zinc-800">
                {product.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2">
                      {v.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.imageUrl} alt={v.label} className="h-9 w-9 rounded-md object-cover border dark:border-zinc-700" />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700" />
                      )}
                    </td>
                    <td className="px-4 py-2">{v.label}</td>
                    <td className="px-4 py-2">${v.priceModifier.toFixed(2)}</td>
                    <td className="px-4 py-2">{v.stock}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteVariant.bind(null, v.id, product.id)}>
                        <button type="submit" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addVariant.bind(null, product.id)} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input name="label" placeholder="e.g. M / Black" required
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white w-36" />
            <input name="priceModifier" type="number" step="0.01" min="0" placeholder="+$0.00" defaultValue="0"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white w-24" />
            <input name="stock" type="number" min="0" placeholder="Stock" defaultValue="0"
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white w-20" />
            <button type="submit"
              className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors">
              Add
            </button>
          </div>

          {/* Photo picker */}
          <input type="hidden" name="imageUrl" value={selectedVariantImage} />
          {imageUrls.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500">Link a photo to this variant (optional)</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedVariantImage("")}
                  className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center text-xs text-zinc-400 transition-colors ${
                    selectedVariantImage === ""
                      ? "border-black dark:border-white bg-zinc-100 dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  None
                </button>
                {imageUrls.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelectedVariantImage(url)}
                    className={`relative h-12 w-12 rounded-lg border-2 overflow-hidden transition-colors ${
                      selectedVariantImage === url
                        ? "border-black dark:border-white"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {selectedVariantImage === url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white"
        {...rest}
      />
    </div>
  );
}
