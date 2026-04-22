"use client";

import React from "react";
import { useActionState } from "react";
import { createProduct } from "@/lib/actions/admin";
import { Category } from "@/lib/types";

const ALL_CATEGORIES: Category[] = ["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"];
import Link from "next/link";

export default function NewProductPage() {
  const [state, action, pending] = useActionState(createProduct, {});

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">← Products</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New Product</h1>
      </div>

      <form action={action} className="space-y-4">
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </div>
        )}

        <Field label="Name" name="name" required />
        <Field label="Slug" name="slug" placeholder="e.g. classic-white-tee" required />
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white resize-none"
          />
        </div>
        <Field label="Base Price ($)" name="basePrice" type="number" step="0.01" min="0" required />

        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select
            id="category"
            name="category"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input id="isCustomizable" name="isCustomizable" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isCustomizable" className="text-sm font-medium">Allow customer customization</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
          >
            {pending ? "Creating…" : "Create Product"}
          </button>
          <Link
            href="/admin/products"
            className="rounded-full border px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
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
