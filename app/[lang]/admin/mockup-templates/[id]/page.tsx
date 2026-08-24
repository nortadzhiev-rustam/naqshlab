import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictionary, hasLocale, type Locale } from "@/app/[lang]/dictionaries";
import { MockupTemplateEditor } from "@/components/MockupTemplateEditor";
import { getMockupTemplate } from "@/lib/backend/mockup-templates";

export default async function EditMockupTemplatePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  const session = await auth();

  let template: Awaited<ReturnType<typeof getMockupTemplate>>;
  try {
    template = await getMockupTemplate(session?.user?.id, id);
  } catch {
    notFound();
  }

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{template.name}</h1>
      <MockupTemplateEditor
        lang={locale}
        dict={dict.admin.mockupTemplates}
        draft={{
          id: template.id,
          name: template.name,
          basePath: template.basePath,
          baseUrl: template.baseUrl,
          maskPath: template.maskPath,
          maskUrl: template.maskUrl,
          productId: template.productId,
          category: template.category,
          printArea: template.printArea,
          displacementScale: template.displacementScale,
          shadingStrength: template.shadingStrength,
          isActive: template.isActive,
        }}
      />
    </div>
  );
}
