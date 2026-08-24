import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MOCKUP_API_BASE_URL,
  mockupHeaders,
  relayMockupResponse,
} from "@/lib/mockup-proxy";

/** Polled by the studio while a render is still queued. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cacheKey: string }> }
) {
  const { cacheKey } = await params;

  if (!/^[a-f0-9]{64}$/.test(cacheKey)) {
    return NextResponse.json({ error: "Invalid mockup key" }, { status: 400 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${MOCKUP_API_BASE_URL}/mockups/${cacheKey}`, {
      headers: mockupHeaders(req),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Mockup service unavailable" }, { status: 502 });
  }

  return relayMockupResponse(upstream);
}
