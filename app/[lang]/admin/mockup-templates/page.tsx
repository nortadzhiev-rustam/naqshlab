import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { listMockupTemplates } from "@/lib/backend/mockup-templates";

export default async function MockupTemplatesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const t = dict.admin.mockupTemplates;

  const session = await auth();

  let templates: Awaited<ReturnType<typeof listMockupTemplates>> = [];
  try {
    templates = await listMockupTemplates(session?.user?.id);
  } catch {
    templates = [];
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
        </div>
        <Link
          href={`/${locale}/admin/mockup-templates/new`}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all"
        >
          {t.newTemplate}
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-16 text-center">
          <p className="text-sm text-zinc-500">{t.empty}</p>
          <p className="mt-1 text-xs text-zinc-400">{t.emptyHelp}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/${locale}/admin/mockup-templates/${template.id}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all hover:border-amber-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.baseUrl} alt="" className="aspect-square w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{template.name}</span>
                  {!template.isActive && (
                    <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {t.inactive}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {template.category ?? t.anyCategory}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
