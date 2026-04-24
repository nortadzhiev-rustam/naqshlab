import { NextRequest, NextResponse } from "next/server";

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const EXTRA_ALLOWED_ORIGINS = (process.env.IMAGE_PROXY_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => normalizeOrigin(value.trim()))
  .filter(Boolean);

/** Normalise localhost ↔ 127.0.0.1 so both resolve to the same origin string. */
function normalizeOrigin(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "127.0.0.1") u.hostname = "localhost";
    return u.origin;
  } catch {
    return "";
  }
}

const ALLOWED_ORIGINS = new Set([
  normalizeOrigin(BASE_URL),
  ...EXTRA_ALLOWED_ORIGINS,
].filter(Boolean));

function isLocalDevelopmentOrigin(url: string): boolean {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
      (
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1" ||
        parsedUrl.hostname.endsWith(".test")
      )
    );
  } catch {
    return false;
  }
}

function isAllowedImageUrl(url: string): boolean {
  const normalizedUrl = normalizeOrigin(url);
  return ALLOWED_ORIGINS.has(normalizedUrl) || isLocalDevelopmentOrigin(url);
}

/**
 * Proxy images from the backend so Fabric.js (and other canvas uses)
 * can load them without CORS issues. Only URLs that originate from our
 * own backend or explicitly allowed asset hosts are allowed to prevent
 * open-redirect / SSRF. For local development, localhost/127.0.0.1/*.test
 * aliases are also accepted.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only proxy URLs that originate from our own backend
  if (!isAllowedImageUrl(url)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
