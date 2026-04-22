import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { ArrowRight, Palette, Truck, Shield } from "lucide-react";
import type { Product } from "@/lib/types";

export default async function HomePage() {
  let featuredProducts: Product[] = [];
  try {
    featuredProducts = await apiRequest<Product[]>("/products", {
      searchParams: { take: "3", orderBy: "createdAt:desc" },
    });
  } catch {
    // Show page without featured products if API is unreachable
  }

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-24 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Your design, <br />
          <span className="text-zinc-500">perfectly printed.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Browse our catalog of premium apparel, mugs, and accessories — or
          upload your own artwork and create something unique.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/products"
            className="flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
          >
            Shop Now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/products?customizable=true"
            className="flex items-center gap-2 rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 transition-colors"
          >
            Customize a Product
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { icon: Palette, title: "Design It Your Way", body: "Upload your artwork or use our in-browser editor to create something truly yours." },
            { icon: Truck, title: "Fast Delivery", body: "Every order is handled with care and shipped directly to your door." },
            { icon: Shield, title: "Quality Guaranteed", body: "Premium materials and print-ready processes ensure your order looks great." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl border dark:border-zinc-800">
              <Icon className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">New Arrivals</h2>
            <Link href="/products" className="text-sm font-medium underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group block overflow-hidden rounded-2xl border dark:border-zinc-800 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-400 text-xs">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{product.category}</p>
                  <h3 className="mt-1 font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm font-medium">${Number(product.basePrice).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
