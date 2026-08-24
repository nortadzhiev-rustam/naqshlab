import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  MOCKUP_API_BASE_URL,
  mockupHeaders,
  relayMockupResponse,
} from "@/lib/mockup-proxy";

/**
 * Compositing moved to the backend, which owns the mockup templates and the
 * print geometry. This route exists only so the browser never sees
 * API_SECRET_KEY -- it forwards the studio's request and nothing else.
 */
const requestSchema = z.object({
  // A data URL from the studio canvas. Capped here so an oversized canvas is
  // rejected before it crosses the wire rather than after.
  design: z.string().min(1).max(12_000_000),
  productId: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${MOCKUP_API_BASE_URL}/mockups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...mockupHeaders(req) },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Mockup service unavailable" }, { status: 502 });
  }

  return relayMockupResponse(upstream);
}
