"use client";

import { useActionState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { login } from "@/lib/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { useEffect, Suspense } from "react";
import { naqshlabLogo } from "@/lib/brand-assets";

function LoginForm({ lang }: { lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? `/${lang}`;
  const registered = searchParams.get("registered");

  const [state, action, pending] = useActionState(login, {});

  useEffect(() => {
    if (state.success) router.push(callbackUrl);
  }, [state.success, router, callbackUrl]);

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Link href={`/${lang}`} className="flex items-center gap-2">
          <span className="relative inline-flex items-center justify-center w-[150px] h-[70px]">
            <Image
              src="/ornament.png"
              alt=""
              width={70}
              height={70}
              className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ animationDuration: "14s" }}
              aria-hidden="true"
            />
            <Image
              src={naqshlabLogo}
              alt="Naqshlab"
              width={170}
              height={90}
              className="relative z-10"
              priority
            />
          </span>
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {lang === "ru" ? "Добро пожаловать" : "Хуш омадед"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {lang === "ru" ? "Войдите в аккаунт Naqshlab" : "Ба ҳисоби Naqshlab ворид шавед"}
          </p>
        </div>

        {registered && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            {lang === "ru" ? "Аккаунт создан! Войдите." : "Ҳисоб сохта шуд! Ворид шавед."}
          </div>
        )}

        <form action={action} className="space-y-4">
          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
              {state.error}
            </div>
          )}

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
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all shadow-sm mt-2"
          >
            {pending
              ? (lang === "ru" ? "Вход…" : "Воридшавӣ...")
              : (lang === "ru" ? "Войти" : "Воридшавӣ")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-400">
          {lang === "ru" ? "Нет аккаунта?" : "Ҳисоб надоред?"}{" "}
          <Link href={`/${lang}/register`} className="font-semibold text-amber-500 hover:text-amber-400 transition-colors">
            {lang === "ru" ? "Создать" : "Сохтан"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const pathname = usePathname();
  const lang = pathname.split("/")[1] ?? "tg";
  return <LoginForm lang={lang} />;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <Suspense>
        <LoginPageInner />
      </Suspense>
    </div>
  );
}

