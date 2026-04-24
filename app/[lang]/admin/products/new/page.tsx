"use client";

import React, { useState, useRef } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { createProduct } from "@/lib/actions/admin";
import { Category } from "@/lib/types";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

const ALL_CATEGORIES: Category[] = ["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"];
import Link from "next/link";

export default function NewProductPage() {
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "tg";
  const [state, action, pending] = useActionState(createProduct, {});

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <Link href={`/${lang}/admin/products`} className="text-sm text-zinc-500 hover:underline">
          ← {lang === "ru" ? "Товары" : "Маҳсулот"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {lang === "ru" ? "Новый товар" : "Маҳсулоти нав"}
        </h1>
      </div>

      <form action={action} className="space-y-4">
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

        <Field label={lang === "ru" ? "Название" : "Ном"} name="name" required />
        <Field label="Slug" name="slug" placeholder="e.g. classic-white-tee" required />
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            {lang === "ru" ? "Описание" : "Тавсиф"}
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-white resize-none"
          />
        </div>
        <Field label={lang === "ru" ? "Базовая цена ($)" : "Нархи асосӣ ($)"} name="basePrice" type="number" step="0.01" min="0" required />

        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">
            {lang === "ru" ? "Категория" : "Категория"}
          </label>
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

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {lang === "ru" ? "Фотографии" : "Аксҳо"}
          </label>

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
              {isUploading
                ? (lang === "ru" ? "Загрузка…" : "Бор мешавад…")
                : (lang === "ru" ? "Перетащите или нажмите для выбора" : "Кашед ё клик кунед")}
            </p>
            <p className="text-xs text-zinc-400">PNG, JPG, WEBP · {lang === "ru" ? "до 5 МБ" : "то 5 МБ"}</p>
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
          <input id="isCustomizable" name="isCustomizable" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isCustomizable" className="text-sm font-medium">
            {lang === "ru" ? "Разрешить кастомизацию" : "Фармоишпазир кардан"}
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || isUploading}
            className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
          >
            {pending
              ? (lang === "ru" ? "Создание…" : "Сохтан...")
              : (lang === "ru" ? "Создать товар" : "Маҳсулот сохтан")}
          </button>
          <Link
            href={`/${lang}/admin/products`}
            className="rounded-full border px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            {lang === "ru" ? "Отмена" : "Бекор кардан"}
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
