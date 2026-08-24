"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMockupTemplate } from "@/lib/actions/mockup-templates";

type Point = [number, number];
type Quad = [Point, Point, Point, Point];

export type TemplateDraft = {
  id: string | null;
  name: string;
  basePath: string;
  baseUrl: string;
  maskPath: string | null;
  maskUrl: string | null;
  productId: string | null;
  category: string | null;
  printArea: { quad: Point[] };
  displacementScale: number;
  shadingStrength: number;
  isActive: boolean;
};

type Dict = Record<string, string>;

const CORNER_ORDER = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;

/** A centred box, used when a base photo is first attached. */
function defaultQuad(width: number, height: number): Quad {
  const x = width * 0.3;
  const y = height * 0.28;
  const w = width * 0.4;
  const h = height * 0.4;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/**
 * A grid with a horizon line, drawn client-side. Straight lines make the
 * perspective warp and the fold displacement obvious at a glance, which a logo
 * would not.
 */
function sampleDesign(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.strokeStyle = "#d81e5b";
  ctx.lineWidth = 6;
  for (let i = 0; i <= 8; i++) {
    const p = (i * canvas.width) / 8;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }

  ctx.fillStyle = "#111827";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NAQSHLAB", canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
}

export function MockupTemplateEditor({
  draft,
  dict,
  lang,
}: {
  draft: TemplateDraft;
  dict: Dict;
  lang: string;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(draft.name);
  const [category, setCategory] = useState(draft.category ?? "");
  const [basePath, setBasePath] = useState(draft.basePath);
  const [baseUrl, setBaseUrl] = useState(draft.baseUrl);
  const [maskPath, setMaskPath] = useState(draft.maskPath);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [quad, setQuad] = useState<Quad>(() => {
    const q = draft.printArea.quad;
    return q.length === 4 ? (q.map((p) => [p[0], p[1]]) as Quad) : defaultQuad(900, 900);
  });
  const [displacementScale, setDisplacementScale] = useState(draft.displacementScale);
  const [shadingStrength, setShadingStrength] = useState(draft.shadingStrength);
  const [isActive, setIsActive] = useState(draft.isActive);

  const [dragging, setDragging] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "upload" | "preview" | "save">(null);
  const [error, setError] = useState<string | null>(null);

  const size = natural ?? { w: 900, h: 900 };
  const handleRadius = Math.max(6, size.w / 90);

  const points = useMemo(() => quad.map((p) => p.join(",")).join(" "), [quad]);

  const toNatural = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return [0, 0];
      const x = ((clientX - rect.left) / rect.width) * size.w;
      const y = ((clientY - rect.top) / rect.height) * size.h;
      return [
        Math.round(Math.min(Math.max(x, 0), size.w)),
        Math.round(Math.min(Math.max(y, 0), size.h)),
      ];
    },
    [size.w, size.h]
  );

  async function uploadImage(file: File, kind: "base" | "mask") {
    setBusy("upload");
    setError(null);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("kind", kind);

      const res = await fetch("/api/admin/mockup-templates/upload", { method: "POST", body });
      if (!res.ok) throw new Error(dict.uploadFailed);

      const data = (await res.json()) as {
        path: string;
        url: string;
        width: number | null;
        height: number | null;
      };

      if (kind === "mask") {
        setMaskPath(data.path);
        return;
      }

      setBasePath(data.path);
      setBaseUrl(data.url);

      if (data.width && data.height) {
        setNatural({ w: data.width, h: data.height });
        setQuad(defaultQuad(data.width, data.height));
      }
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.uploadFailed);
    } finally {
      setBusy(null);
    }
  }

  async function renderPreview() {
    if (!basePath) {
      setError(dict.needBaseImage);
      return;
    }

    setBusy("preview");
    setError(null);

    try {
      const res = await fetch("/api/admin/mockup-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design: sampleDesign(),
          basePath,
          maskPath,
          printArea: { quad },
          displacementScale,
          shadingStrength,
        }),
      });

      const data = (await res.json()) as { dataUrl?: string; message?: string };
      if (!res.ok || !data.dataUrl) throw new Error(data.message ?? dict.previewFailed);

      setPreview(data.dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.previewFailed);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setError(null);

    const result = await saveMockupTemplate(draft.id, {
      name,
      basePath,
      maskPath,
      productId: draft.productId,
      category: category || null,
      printArea: { quad },
      displacementScale,
      shadingStrength,
      isActive,
    });

    setBusy(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(`/${lang}/admin/mockup-templates`);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-zinc-400";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-1">
            {dict.printArea}
          </h2>
          <p className="text-sm text-zinc-500">{dict.printAreaHelp}</p>
        </div>

        {baseUrl ? (
          <div
            ref={frameRef}
            className="relative select-none overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
          >
            {/* Not next/image: this is an admin tool that needs the browser's
                natural dimensions to map clicks onto image coordinates. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview ?? baseUrl}
              alt=""
              className="block w-full"
              onLoad={(e) => {
                if (preview) return;
                const img = e.currentTarget;
                if (!natural) {
                  setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  setQuad(defaultQuad(img.naturalWidth, img.naturalHeight));
                }
              }}
            />

            {!preview && (
              <svg
                viewBox={`0 0 ${size.w} ${size.h}`}
                className="absolute inset-0 h-full w-full touch-none"
                onPointerMove={(e) => {
                  if (dragging === null) return;
                  const point = toNatural(e.clientX, e.clientY);
                  setQuad((current) => {
                    const next = [...current] as Quad;
                    next[dragging] = point;
                    return next;
                  });
                }}
                onPointerUp={() => setDragging(null)}
                onPointerLeave={() => setDragging(null)}
              >
                <polygon
                  points={points}
                  fill="rgba(217, 30, 91, 0.12)"
                  stroke="#d81e5b"
                  strokeWidth={Math.max(2, size.w / 400)}
                />
                {quad.map((point, index) => (
                  <circle
                    key={CORNER_ORDER[index]}
                    cx={point[0]}
                    cy={point[1]}
                    r={handleRadius}
                    fill="#ffffff"
                    stroke="#d81e5b"
                    strokeWidth={Math.max(2, size.w / 400)}
                    className="cursor-grab"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDragging(index);
                    }}
                  />
                ))}
              </svg>
            )}

            {preview && (
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute right-3 top-3 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
              >
                {dict.backToCorners}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-sm text-zinc-500">
            {dict.needBaseImage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-500">
          {quad.map((point, index) => (
            <div key={CORNER_ORDER[index]} className="flex justify-between rounded-lg bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
              <span>{dict[CORNER_ORDER[index]]}</span>
              <span className="font-mono">
                {point[0]}, {point[1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="template-name">
            {dict.name}
          </label>
          <input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="template-category">
            {dict.category}
          </label>
          <select
            id="template-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">{dict.anyCategory}</option>
            {["APPAREL", "MUG", "ACCESSORY", "POSTER", "OTHER"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>{dict.basePhoto}</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file, "base");
            }}
            className="block w-full text-xs text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-amber-500 dark:file:text-zinc-900"
          />
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>{dict.mask}</span>
          <p className="text-xs text-zinc-500">{dict.maskHelp}</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file, "mask");
            }}
            className="block w-full text-xs text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-amber-500 dark:file:text-zinc-900"
          />
          {maskPath && <p className="text-xs text-emerald-600">{dict.maskAttached}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="displacement">
            {dict.displacement} — {displacementScale}
          </label>
          <input
            id="displacement"
            type="range"
            min={0}
            max={40}
            value={displacementScale}
            onChange={(e) => setDisplacementScale(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <p className="text-xs text-zinc-500">{dict.displacementHelp}</p>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="shading">
            {dict.shading} — {shadingStrength}
          </label>
          <input
            id="shading"
            type="range"
            min={0}
            max={100}
            value={shadingStrength}
            onChange={(e) => setShadingStrength(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <p className="text-xs text-zinc-500">{dict.shadingHelp}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-amber-500"
          />
          {dict.active}
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={renderPreview}
            disabled={busy !== null || !basePath}
            className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all"
          >
            {busy === "preview" ? dict.rendering : dict.preview}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy !== null || !basePath || name.trim().length < 2}
            className="flex-1 rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400 transition-all"
          >
            {busy === "save" ? dict.saving : dict.save}
          </button>
        </div>
      </div>
    </div>
  );
}
