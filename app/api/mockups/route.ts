import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getMockupPlacement } from "@/lib/mockup-templates";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

type MockupRequestBody = {
  category?: string;
  baseImages?: string[];
  designDataUrl?: string;
};

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }

  return Buffer.from(match[2], "base64");
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function resolveCandidateUrls(url: string, requestOrigin: string) {
  try {
    return [new URL(url).toString()];
  } catch {
    const trimmed = url.startsWith("/") ? url : `/${url}`;
    return [
      new URL(trimmed, requestOrigin).toString(),
      new URL(trimmed, API_BASE_URL).toString(),
    ];
  }
}

async function fetchImageBuffer(url: string, requestOrigin: string) {
  let lastError: string | undefined;

  for (const candidate of resolveCandidateUrls(url, requestOrigin)) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        lastError = `Failed to fetch base image (${response.status}) from ${candidate}`;
        continue;
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error instanceof Error ? error.message : `Failed to fetch ${candidate}`;
    }
  }

  throw new Error(lastError ?? "Failed to fetch base image");
}

async function renderMockup(
  baseImageUrl: string,
  designBuffer: Buffer,
  category: string | undefined,
  index: number,
  requestOrigin: string
) {
  const baseBuffer = await fetchImageBuffer(baseImageUrl, requestOrigin);
  const base = sharp(baseBuffer).rotate();
  const metadata = await base.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Base image metadata unavailable");
  }

  const placement = getMockupPlacement(category, index);
  const targetWidth = Math.max(64, Math.round(metadata.width * placement.width));
  const targetHeight = Math.max(64, Math.round(metadata.height * placement.height));

  const resizedDesign = sharp(designBuffer)
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

  const overlayBuffer = await resizedDesign
    .rotate(placement.rotate ?? 0, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const overlayMetadata = await sharp(overlayBuffer).metadata();
  const left = Math.round(metadata.width * placement.x);
  const top = Math.round(metadata.height * placement.y);

  const composited = await base
    .composite([
      {
        input: overlayBuffer,
        left: Math.max(0, Math.min(left, metadata.width - (overlayMetadata.width ?? targetWidth))),
        top: Math.max(0, Math.min(top, metadata.height - (overlayMetadata.height ?? targetHeight))),
        blend: "over",
      },
    ])
    .webp({ quality: 92 })
    .toBuffer();

  return toDataUrl(composited, "image/webp");
}

export async function POST(request: NextRequest) {
  let body: MockupRequestBody;

  try {
    body = (await request.json()) as MockupRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const designDataUrl = body.designDataUrl;
  const baseImages = body.baseImages?.filter(Boolean) ?? [];

  if (!designDataUrl || baseImages.length === 0) {
    return NextResponse.json(
      { error: "designDataUrl and baseImages are required" },
      { status: 400 }
    );
  }

  let designBuffer: Buffer;
  try {
    designBuffer = dataUrlToBuffer(designDataUrl);
  } catch {
    return NextResponse.json({ error: "Invalid designDataUrl" }, { status: 400 });
  }

  try {
    const settledResults = await Promise.allSettled(
      baseImages.slice(0, 4).map((imageUrl, index) =>
        renderMockup(imageUrl, designBuffer, body.category, index, request.nextUrl.origin)
      )
    );
    const mockups = settledResults
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value);

    if (mockups.length === 0) {
      const firstFailure = settledResults.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      return NextResponse.json(
        {
          error:
            firstFailure?.reason instanceof Error
              ? firstFailure.reason.message
              : "Failed to generate mockups",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ mockups });
  } catch {
    return NextResponse.json({ error: "Failed to generate mockups" }, { status: 500 });
  }
}
