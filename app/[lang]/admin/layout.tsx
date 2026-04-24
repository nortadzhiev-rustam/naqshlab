import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Package, ShoppingBag, ExternalLink } from "lucide-react";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";
import { naqshlabLogo } from "@/lib/brand-assets";

export default async function AdminLayout({
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
  const ad = dict.admin;

  
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-zinc-950 dark:bg-black text-zinc-100">
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-800">
           <span className="relative inline-flex mt-2 items-center justify-center w-[100px] h-[30px]">
                      <Image
                        src="/ornament.png"
                        alt=""
                        width={40}
                        height={40}
                        className="absolute top-1/8 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ animationDuration: "14s" }}
                        aria-hidden="true"
                      />
                      <Image
                        src={naqshlabLogo}
                        alt="Naqshlab"
                        width={100}
                        height={30}
                        className="relative z-10"
                        priority
                      />
                    </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {[
            { href: `/${locale}/admin`, icon: LayoutDashboard, label: ad.dashboard },
            { href: `/${locale}/admin/products`, icon: Package, label: ad.products },
            { href: `/${locale}/admin/orders`, icon: ShoppingBag, label: ad.orders },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {ad.viewStore}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
