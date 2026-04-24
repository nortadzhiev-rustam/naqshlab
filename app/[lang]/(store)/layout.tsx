import { Navbar } from "@/components/Navbar";
import { CartStoreHydration } from "@/components/CartStoreHydration";
import Link from "next/link";
import Image from "next/image";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { naqshlabLogo } from "@/lib/brand-assets";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  return (
    <>
      <CartStoreHydration />
      <Navbar lang={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-3">
             <span className="relative inline-flex items-center justify-center w-[130px] h-[60px]">
                           <Image
                             src="/ornament.png"
                             alt=""
                             width={60}
                             height={60}
                             className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2  opacity-80 group-hover:opacity-100 transition-opacity"
                             
                             aria-hidden="true"
                           />
                           <Image
                             src={naqshlabLogo}
                             alt="Naqshlab"
                             width={120}
                             height={60}
                             className="relative z-10"
                             priority
                           />
                         </span>
              <p className="text-sm text-zinc-500 max-w-xs text-center md:text-left">
                Premium print-on-demand — your designs, beautifully crafted.
              </p>
            </div>
            {/* Links */}
            <div className="flex gap-12">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">{dict.nav.shop}</p>
                <Link href={`/${locale}/products`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">{dict.products.title}</Link>
                <Link href={`/${locale}/products?customizable=true`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">{dict.products.customizable}</Link>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">{dict.orders.account}</p>
                <Link href={`/${locale}/orders`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">{dict.orders.title}</Link>
                <Link href={`/${locale}/login`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">{dict.nav.signIn}</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Naqshlab.</p>
            <LanguageSwitcher currentLang={locale} />
          </div>
        </div>
      </footer>
    </>
  );
}
