"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

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
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
      return { error: data.message ?? "Registration failed. Please try again." };
    }

    return { success: true };
  } catch {
    return { error: "Could not connect to the server. Please try again." };
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
