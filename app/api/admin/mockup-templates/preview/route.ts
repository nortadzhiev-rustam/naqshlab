import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Renders one mockup from unsaved template values so geometry can be tuned. */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!userId || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();

  const res = await fetch(`${BASE_URL}/admin/mockup-templates/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.API_SECRET_KEY ?? "",
      "x-user-id": userId,
      "x-user-role": "admin",
    },
    body,
  });

  const text = await res.text();

  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return NextResponse.json({ error: text }, { status: res.status });
  }
}
