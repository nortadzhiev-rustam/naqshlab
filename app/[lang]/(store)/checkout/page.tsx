import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  const session = await auth();
  if (!session) redirect(`/${locale}/login?callbackUrl=/${locale}/checkout`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">{dict.checkout.title}</h1>
      <CheckoutClient lang={locale} dict={dict.checkout} />
    </div>
  );
}
