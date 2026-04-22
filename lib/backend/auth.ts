import "server-only";

import { apiRequest } from "@/lib/api";
import type { Role } from "@/lib/types";

export type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: Role | string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function registerBackendUser(payload: RegisterPayload) {
  return apiRequest<BackendUser>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function loginBackendUser(payload: LoginPayload) {
  return apiRequest<BackendUser>("/auth/login", {
    method: "POST",
    body: payload,
  });
}
