"use client";

import React from "react";
import { useActionState } from "react";
import { updateProduct, addVariant, deleteVariant } from "@/lib/actions/admin";
import { Category } from "@/lib/types";

const ALL_CATEGORIES: Category[] = ["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"];
import Link from "next/link";
import { Trash2 } from "lucide-react";

type Variant = { id: string; label: string; priceModifier: number; stock: number };

type EditProductClientProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePrice: number;
    category: Category;
    isCustomizable: boolean;
    variants: Variant[];
  };
};

export function EditProductClient({ product }: EditProductClientProps) {
  const boundUpdate = updateProduct.bind(null, product.id);
  const [state, action, pending] = useActionState(boundUpdate, {});

  return (
    <div className="space-y-10">
      {/* Product form */}
      <form action={action} className="space-y-4 max-w-xl">
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {state.error}
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
          disabled={pending}
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
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Label</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">+Price</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Stock</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-zinc-800">
                {product.variants.map((v) => (
                  <tr key={v.id}>
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

        <form action={addVariant.bind(null, product.id)} className="flex gap-2 flex-wrap">
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
