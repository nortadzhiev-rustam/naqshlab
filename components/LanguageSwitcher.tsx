"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/app/[lang]/dictionaries";

const LABELS: Record<Locale, string> = {
  tg: "Тоҷикӣ",
  ru: "Русский",
  en: "English",
};

export function LanguageSwitcher({ currentLang }: { currentLang: Locale }) {
  const pathname = usePathname();

  function switchTo(lang: Locale) {
    // Replace the current locale segment with the new one
    const segments = pathname.split("/");
    segments[1] = lang;
    return segments.join("/");
  }

  return (
    <div className="flex items-center gap-1.5">
      {(Object.keys(LABELS) as Locale[]).map((lang) => (
        <Link
          key={lang}
          href={switchTo(lang)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
            lang === currentLang
              ? "bg-amber-400 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          {LABELS[lang]}
        </Link>
      ))}
    </div>
  );
}
