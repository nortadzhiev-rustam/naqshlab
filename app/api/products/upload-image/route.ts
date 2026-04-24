import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!userId || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("image", file);

  const res = await fetch(`${BASE_URL}/products/upload-image`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.API_SECRET_KEY ?? "",
      "x-user-id": userId,
      "x-user-role": "admin",
    },
    body: upstream,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
