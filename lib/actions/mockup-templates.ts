"use server";

import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { locales } from "@/app/[lang]/dictionaries";
import {
  createMockupTemplate,
  deleteMockupTemplate,
  updateMockupTemplate,
  type MockupTemplatePayload,
} from "@/lib/backend/mockup-templates";

const point = z.tuple([z.number(), z.number()]);

const templateSchema = z.object({
  name: z.string().min(2),
  basePath: z.string().min(1),
  maskPath: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  printArea: z.object({ quad: z.tuple([point, point, point, point]) }),
  displacementScale: z.number().int().min(0).max(255),
  shadingStrength: z.number().int().min(0).max(100),
  isActive: z.boolean().optional(),
});

export type TemplateFormState = {
  error?: string;
  savedId?: string;
};

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId };
}

function revalidateTemplatePages(id?: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/admin/mockup-templates`);
    if (id) revalidatePath(`/${locale}/admin/mockup-templates/${id}`);
  }
}

export async function saveMockupTemplate(
  id: string | null,
  input: unknown
): Promise<TemplateFormState> {
  const admin = await requireAdmin();
  const parsed = templateSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid template" };
  }

  const payload = parsed.data as MockupTemplatePayload;

  try {
    const saved = id
      ? await updateMockupTemplate(admin.userId, id, payload)
      : await createMockupTemplate(admin.userId, payload);

    revalidateTemplatePages(saved.id);
    return { savedId: saved.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save the template." };
  }
}

export async function removeMockupTemplate(id: string) {
  const admin = await requireAdmin();
  await deleteMockupTemplate(admin.userId, id);
  revalidateTemplatePages();
}
