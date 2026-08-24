import { notFound } from "next/navigation";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { MockupTemplateEditor } from "@/components/MockupTemplateEditor";

export default async function NewMockupTemplatePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        {dict.admin.mockupTemplates.newTemplate}
      </h1>
      <MockupTemplateEditor
        lang={locale}
        dict={dict.admin.mockupTemplates}
        draft={{
          id: null,
          name: "",
          basePath: "",
          baseUrl: "",
          maskPath: null,
          maskUrl: null,
          productId: null,
          category: "APPAREL",
          printArea: { quad: [] },
          displacementScale: 12,
          shadingStrength: 70,
          isActive: true,
        }}
      />
    </div>
  );
}
