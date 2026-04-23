"use client";

import { useActionState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { register } from "@/lib/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "tg";
  const [state, action, pending] = useActionState(register, {});

  useEffect(() => {
    if (state.success) router.push(`/${lang}/login?registered=1`);
  }, [state.success, router, lang]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <Image src="/naqshlab.png" alt="Naqshlab" width={110} height={36} className="dark:brightness-0 dark:invert" />
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {lang === "ru" ? "Создать аккаунт" : "Ҳисоб сохтан"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {lang === "ru" ? "Присоединитесь к Naqshlab" : "Ба Naqshlab ворид шавед"}
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {lang === "ru" ? "Имя" : "Ном"}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {lang === "ru" ? "Эл. почта" : "Почтаи электронӣ"}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {lang === "ru" ? "Пароль" : "Рамз"}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm mt-2"
            >
              {pending
                ? (lang === "ru" ? "Создание…" : "Сохтан...")
                : (lang === "ru" ? "Создать аккаунт" : "Ҳисоб сохтан")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-400">
            {lang === "ru" ? "Уже есть аккаунт?" : "Ҳисоб доред?"}{" "}
            <Link href={`/${lang}/login`} className="font-semibold text-amber-500 hover:text-amber-400 transition-colors">
              {lang === "ru" ? "Войти" : "Воридшавӣ"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

