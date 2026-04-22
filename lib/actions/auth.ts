"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { registerBackendUser } from "@/lib/backend/auth";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

export type AuthFormState = {
  error?: string;
  success?: boolean;
};

export async function register(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await registerBackendUser(parsed.data);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : undefined;
    return { error: msg ?? "Registration failed. Please try again." };
  }
}

export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    return { error: "Something went wrong. Please try again." };
  }
}
