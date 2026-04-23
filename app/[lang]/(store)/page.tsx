import Link from "next/link";
import { ArrowRight, Palette, Truck, Shield, Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";
import { listProducts } from "@/lib/backend/store";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const { home, products: pd, nav } = dict;

  let featuredProducts: Product[] = [];
  try {
    featuredProducts = await listProducts({ take: 3, orderBy: "createdAt:desc" });
  } catch {
    // Show page without featured products if API is unreachable
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/60 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 px-4 py-28 text-center">
        {/* Decorative background ornament */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ornament.png" alt="" className="w-[600px] h-[600px] object-contain" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-400 mb-6">
            <Sparkles className="h-3 w-3" />
            {home.badge}
          </div>
          <h1 className="max-w-3xl mx-auto text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl lg:text-7xl leading-[1.1]">
            {home.headline1}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-amber-500 dark:text-amber-400">
                {home.headline2}
              </span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-amber-100 dark:bg-amber-900/40 -z-0 rounded" />
            </span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {home.subtext}
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              href={`/${locale}/products`}
              className="group flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-lg shadow-zinc-900/20 dark:shadow-amber-500/20"
            >
              {home.shopNow}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href={`/${locale}/products?customizable=true`}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all shadow-sm"
            >
              <Palette className="h-4 w-4" />
              {home.learnMore}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Palette, title: pd.chooseDesign, body: home.subtext, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { icon: Truck, title: nav.shop, body: home.subtext, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { icon: Shield, title: pd.customizable, body: home.subtext, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          ].map(({ icon: Icon, title, body, color, bg }) => (
            <div
              key={title}
              className="group flex flex-col gap-4 p-7 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-lg transition-all duration-300"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">{home.badge}</p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{home.featuredProducts}</h2>
            </div>
            <Link
              href={`/${locale}/products`}
              className="group flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              {home.viewAll}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/${locale}/products/${product.slug}`}
                className="group block overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-square bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/ornament.png" alt="" className="w-16 h-16 opacity-10" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">
                    {product.category}
                  </p>
                  <h3 className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      ${Number(product.basePrice).toFixed(2)}
                    </p>
                    <span className="text-xs font-medium text-amber-500 dark:text-amber-400 group-hover:underline">
                      {nav.shop} →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
