import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  PackageCheck,
  Palette,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { listProducts } from "@/lib/backend/store";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";

const stepIcons = [Palette, ScanLine, PackageCheck];

function productImageUrl(source: string) {
  try {
    const imageUrl = new URL(source);
    if (imageUrl.hostname !== "127.0.0.1" && imageUrl.hostname !== "localhost") {
      return source;
    }

    const apiOrigin = new URL(process.env.API_BASE_URL ?? "http://localhost:8000");
    imageUrl.protocol = apiOrigin.protocol;
    imageUrl.hostname = apiOrigin.hostname;
    imageUrl.port = apiOrigin.port;
    return imageUrl.toString();
  } catch {
    return source;
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const { home, products: pd } = dict;

  let featuredProducts: Product[] = [];
  try {
    featuredProducts = await listProducts({ take: 3, orderBy: "createdAt:desc" });
  } catch {
    // The story and customization path still work when the catalogue API is offline.
  }

  const heroProduct = featuredProducts.find((product) => product.images[0]);
  const secondaryProduct = featuredProducts.find(
    (product) => product.id !== heroProduct?.id && product.images[0]
  );

  return (
    <div className="overflow-hidden bg-landing text-landing-foreground">
      <section className="relative isolate border-b border-landing-border">
        <div className="naqsh-landing-grid absolute inset-0 -z-20 opacity-50 dark:opacity-20" />
        <div className="absolute -left-32 top-16 -z-10 h-80 w-80 rounded-full bg-landing-glow blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:px-10 lg:py-16">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-landing-subtle">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-landing-primary text-landing-on-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              {home.badge}
            </div>

            <h1 className="max-w-[800px] text-[clamp(3.6rem,7.2vw,7rem)] font-semibold leading-[0.84] tracking-[-0.065em]">
              <span className="block">{home.headline1}</span>
              <span className="naqsh-display mt-3 block font-normal italic tracking-[-0.045em] text-landing-brand">
                {home.headline2}
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-landing-muted sm:text-lg sm:leading-8">
              {home.subtext}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/${locale}/products`}
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-landing-primary px-6 text-sm font-bold text-landing-on-primary transition-all hover:-translate-y-0.5 hover:bg-landing-primary-hover"
              >
                {home.shopCollection}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href={`/${locale}/products?customizable=true`}
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-landing-border-strong bg-landing-control px-6 text-sm font-bold text-landing-foreground backdrop-blur transition-all hover:border-landing-border-hover hover:bg-landing-control-hover"
              >
                {home.startDesigning}
                <Palette className="h-4 w-4 transition-transform group-hover:rotate-12" />
              </Link>
            </div>

            <div className="mt-10 flex items-start gap-3 border-t border-landing-divider pt-5 text-xs font-medium leading-5 text-landing-subtle sm:max-w-xl">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-brand" />
              {home.trustLine}
            </div>
          </div>

          <div className="relative mx-auto min-h-[510px] w-full max-w-[650px] sm:min-h-[620px] lg:min-h-[660px]">
            <div className="absolute inset-x-[4%] inset-y-0 overflow-hidden rounded-[2.25rem] border border-landing-panel-border bg-landing-panel shadow-[var(--landing-shadow-hero)]">
              <Image
                src="/ornament.png"
                alt=""
                width={540}
                height={526}
                className="absolute -right-32 -top-28 h-auto w-[82%] opacity-[0.09] invert dark:opacity-[0.12]"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            <div className="absolute inset-x-[11%] bottom-[9%] top-[8%] overflow-hidden rounded-[1.75rem] border border-landing-panel-border-strong bg-landing-panel-media shadow-2xl">
              {heroProduct?.images[0] ? (
                <Image
                  src={productImageUrl(heroProduct.images[0])}
                  alt={heroProduct.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-landing-media-soft p-12">
                  <Image
                    src="/t-shirt tech drawing/front.svg"
                    alt="Custom-print T-shirt outline"
                    width={900}
                    height={900}
                    className="h-auto w-full opacity-70"
                  />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-6 pb-6 pt-20 text-landing-on-media sm:px-8 sm:pb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-landing-brand-on-media">
                  {heroProduct?.category ?? home.collectionLabel}
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-xl font-semibold sm:text-2xl">
                    {heroProduct?.name ?? pd.customizable}
                  </p>
                  {heroProduct && (
                    <p className="shrink-0 text-sm font-bold">
                      ${Number(heroProduct.basePrice).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute -left-1 top-[18%] rounded-2xl border border-landing-border bg-landing-card-raised/95 p-3.5 shadow-xl backdrop-blur sm:-left-5 sm:p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-landing-final text-landing-on-final">
                  <ScanLine className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-landing-muted">
                    {pd.preview3d}
                  </p>
                  <p className="mt-0.5 text-xs font-bold">360°</p>
                </div>
              </div>
            </div>

            {secondaryProduct?.images[0] && (
              <Link
                href={`/${locale}/products/${secondaryProduct.slug}`}
                className="group absolute -right-1 bottom-0 w-[42%] overflow-hidden rounded-2xl border-4 border-landing bg-landing-card shadow-2xl sm:-right-5"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-landing-media">
                  <Image
                    src={productImageUrl(secondaryProduct.images[0])}
                    alt={secondaryProduct.name}
                    fill
                    sizes="(max-width: 1024px) 36vw, 17vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
                  <p className="truncate text-xs font-bold sm:text-sm">{secondaryProduct.name}</p>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-landing-border bg-landing-soft">
        <div className="mx-auto grid max-w-[1440px] divide-y divide-landing-border px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-10">
          {home.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <article key={step.title} className="flex gap-5 py-8 md:px-6 md:first:pl-0 md:last:pr-0 lg:py-10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-landing-divider text-landing-brand-strong">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-landing-subtle">0{index + 1}</p>
                  <h2 className="mt-1.5 text-base font-bold">{step.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-landing-muted">{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-landing-brand-strong">
                {home.collectionLabel}
              </p>
              <h2 className="naqsh-display mt-3 text-4xl tracking-[-0.035em] sm:text-5xl">
                {home.featuredProducts}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-landing-muted sm:text-base">
                {home.featuredDescription}
              </p>
            </div>
            <Link
              href={`/${locale}/products`}
              className="group inline-flex w-fit items-center gap-3 border-b border-landing-border-hover pb-1.5 text-sm font-bold"
            >
              {home.viewAll}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className={`grid gap-5 ${featuredProducts.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/${locale}/products/${product.slug}`}
                className="group overflow-hidden rounded-[1.75rem] border border-landing-border bg-landing-card transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--landing-shadow-card-hover)]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-landing-media">
                  {product.images[0] ? (
                    <Image
                      src={productImageUrl(product.images[0])}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Image src="/ornament.png" alt="" width={120} height={117} className="opacity-10 dark:invert" />
                    </div>
                  )}
                  {product.isCustomizable && (
                    <span className="absolute left-4 top-4 rounded-full bg-landing-card-raised/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-landing-foreground shadow-sm backdrop-blur">
                      {pd.customizable}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-landing-brand-strong">
                      {product.category}
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-[-0.02em]">{product.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-landing-muted">
                      {pd.from} ${Number(product.basePrice).toFixed(2)}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-landing-divider transition-all group-hover:border-landing-primary group-hover:bg-landing-primary group-hover:text-landing-on-primary">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-landing-process text-landing-on-process">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-landing-brand-strong">
              {home.processEyebrow}
            </p>
            <h2 className="naqsh-display mt-4 max-w-lg text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {home.processTitle}
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-landing-process-muted sm:text-base">
              {home.processDescription}
            </p>
          </div>

          <div className="divide-y divide-landing-process-border border-y border-landing-process-border">
            {home.steps.map((step, index) => (
              <div key={step.title} className="grid gap-4 py-7 sm:grid-cols-[70px_1fr] sm:py-9">
                <p className="naqsh-display text-3xl italic text-landing-brand-strong">0{index + 1}</p>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-landing-process-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[2rem] bg-landing-final px-6 py-14 text-landing-on-final sm:px-12 sm:py-16 lg:flex lg:items-end lg:justify-between lg:gap-16 lg:px-16">
          <Image
            src="/ornament.png"
            alt=""
            width={340}
            height={331}
            className="absolute -right-16 -top-28 w-72 opacity-[0.12]"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]">NaqshLab</p>
            <h2 className="naqsh-display mt-4 text-4xl leading-none tracking-[-0.045em] sm:text-6xl">
              {home.finalTitle}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-landing-final-muted sm:text-base">{home.finalDescription}</p>
          </div>
          <Link
            href={`/${locale}/products?customizable=true`}
            className="group relative mt-9 inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-landing-final-button px-6 text-sm font-bold text-landing-on-final-button transition-all hover:-translate-y-0.5 hover:bg-landing-final-button-hover lg:mt-0"
          >
            {home.startDesigning}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
