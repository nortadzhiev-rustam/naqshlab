import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const MOCKUP_API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export function mockupHeaders(req: NextRequest): Record<string, string> {
  const forwardedFor = req.headers.get("x-forwarded-for");

  return {
    "x-api-key": process.env.API_SECRET_KEY ?? "",
    // The backend throttles per client IP; without this every request would
    // look like it came from this server and share one bucket.
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
  };
}

export async function relayMockupResponse(upstream: Response) {
  const text = await upstream.text();

  if (!text) {
    return new NextResponse(null, { status: upstream.status });
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: upstream.status });
  } catch {
    return NextResponse.json({ error: text }, { status: upstream.status });
  }
}
