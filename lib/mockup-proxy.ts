import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const MOCKUP_API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export function mockupHeaders(req: NextRequest): Record<string, string> {
  const forwardedFor = req.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((ip) => ip.trim())
    .find(Boolean);
  const realIp = req.headers.get("x-real-ip")?.trim();
  const clientIp = forwardedFor ?? realIp;

  return {
    "x-api-key": process.env.API_SECRET_KEY ?? "",
    // The backend throttles per client IP; only forward a normalized proxy-sourced
    // value so callers cannot spoof a fresh address for each expensive render.
    ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
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
