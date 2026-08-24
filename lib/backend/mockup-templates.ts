import "server-only";

import { apiRequest } from "@/lib/api";

export type MockupTemplate = {
  id: string;
  productId: string | null;
  category: string | null;
  name: string;
  basePath: string;
  baseUrl: string;
  maskPath: string | null;
  maskUrl: string | null;
  printArea: { quad: [number, number][] };
  displacementScale: number;
  shadingStrength: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MockupTemplatePayload = {
  name: string;
  basePath: string;
  maskPath?: string | null;
  productId?: string | null;
  category?: string | null;
  printArea: { quad: [number, number][] };
  displacementScale: number;
  shadingStrength: number;
  isActive?: boolean;
};

function adminContext(userId?: string) {
  return { userId, role: "admin" as const };
}

export async function listMockupTemplates(userId?: string, productId?: string) {
  return apiRequest<MockupTemplate[]>("/admin/mockup-templates", {
    ...adminContext(userId),
    searchParams: productId ? { productId } : undefined,
  });
}

export async function getMockupTemplate(userId: string | undefined, id: string) {
  return apiRequest<MockupTemplate>(`/admin/mockup-templates/${id}`, adminContext(userId));
}

export async function createMockupTemplate(userId: string, payload: MockupTemplatePayload) {
  return apiRequest<MockupTemplate>("/admin/mockup-templates", {
    method: "POST",
    ...adminContext(userId),
    body: payload,
  });
}

export async function updateMockupTemplate(
  userId: string,
  id: string,
  payload: Partial<MockupTemplatePayload>
) {
  return apiRequest<MockupTemplate>(`/admin/mockup-templates/${id}`, {
    method: "PUT",
    ...adminContext(userId),
    body: payload,
  });
}

export async function deleteMockupTemplate(userId: string, id: string) {
  return apiRequest(`/admin/mockup-templates/${id}`, {
    method: "DELETE",
    ...adminContext(userId),
  });
}
