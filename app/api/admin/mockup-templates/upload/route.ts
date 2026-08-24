import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

/**
 * Multipart passes through a route rather than a server action: a base photo is
 * several megabytes, well past the server-action body limit.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!userId || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (kind !== "base" && kind !== "mask") {
    return NextResponse.json({ error: "Invalid image kind" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("image", file);
  upstream.append("kind", kind);

  const res = await fetch(`${BASE_URL}/admin/mockup-templates/upload`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.API_SECRET_KEY ?? "",
      "x-user-id": userId,
      "x-user-role": "admin",
    },
    body: upstream,
  });

  const text = await res.text();

  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return NextResponse.json({ error: text }, { status: res.status });
  }
}
