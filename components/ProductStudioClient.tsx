"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Upload,
  Type,
  LayoutTemplate,
  RotateCcw,
  RotateCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Box,
  Eye,
  PencilLine,
  Sparkles,
  ShieldCheck,
  CircleDot,
} from "lucide-react";
import { DesignEditor, type DesignEditorHandle } from "@/components/DesignEditor";
import {
  Studio3DPreview,
  ClientApparelCanvas,
  ClientMugCanvas,
  DEFAULT_APPAREL_MODEL_PATH,
} from "@/components/Studio3DPreview";
import {
  APPAREL_EDITOR_SURFACES,
  APPAREL_EDITOR_CANVAS_HEIGHT,
  APPAREL_EDITOR_CANVAS_WIDTH,
  DEFAULT_APPAREL_SURFACE_ID,
  getApparelEditorSurface,
} from "@/lib/apparel-editor";
import { requestMockups, resolveMockups } from "@/lib/mockups";
import { useCartStore } from "@/lib/cart-store";
import { MUG_CANVAS_HEIGHT, MUG_CANVAS_WIDTH } from "@/lib/mug-wrap";

// Color label to CSS colour mapping
const COLOR_MAP: Record<string, string> = {
  black: "#18181b",
  white: "#ffffff",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  navy: "#1e3a5f",
  grey: "#9ca3af",
  gray: "#9ca3af",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  lime: "#84cc16",
  maroon: "#7f1d1d",
  brown: "#92400e",
};

function getVariantColor(label: string): string | null {
  const normalized = label.toLowerCase();
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return null;
}

type Variant = {
  id: string;
  label: string;
  priceModifier: number;
  imageUrl?: string | null;
};

type PresetDesign = {
  id: string;
  name: string;
  imageUrl: string;
};

type ProductStudioClientProps = {
  lang: string;
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    basePrice: number;
    images: string[];
    variants: Variant[];
    presetDesigns: PresetDesign[];
  };
  dict?: {
    addToCart: string;
    added: string;
    options: string;
    customize: string;
    openStudio: string;
    studioTitle: string;
    studioDescription: string;
    backToProduct: string;
    preview3d: string;
  };
};

type ActiveTool = "upload" | "text" | "templates" | null;

function SidebarTool({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
        active
          ? "border-amber-400/60 bg-amber-400/10 text-amber-950 shadow-sm dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100"
          : "border-black/8 bg-white/55 text-stone-700 hover:-translate-y-0.5 hover:border-amber-500/30 hover:bg-white hover:shadow-sm dark:border-white/8 dark:bg-white/[0.035] dark:text-stone-200 dark:hover:border-amber-300/25 dark:hover:bg-white/[0.07]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-amber-400 text-stone-950"
            : "bg-stone-950 text-white group-hover:bg-amber-400 group-hover:text-stone-950 dark:bg-stone-800"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold tracking-tight">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-stone-500 dark:text-stone-400">
          {description}
        </span>
      </span>
    </button>
  );
}

export function ProductStudioClient({ lang, product, dict }: ProductStudioClientProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    product.presetDesigns[0]?.id
  );
  const [editorCustomizationData, setEditorCustomizationData] = useState<object | undefined>();
  const [editorPreviewImage, setEditorPreviewImage] = useState<string | undefined>();
  const [selectedApparelSurfaceId, setSelectedApparelSurfaceId] =
    useState(DEFAULT_APPAREL_SURFACE_ID);
  const [apparelSurfaceData, setApparelSurfaceData] = useState<Record<string, object | undefined>>(
    {}
  );
  const [apparelSurfacePreviewImages, setApparelSurfacePreviewImages] = useState<
    Record<string, string | undefined>
  >({});
  const [paintedPreviewImage, setPaintedPreviewImage] = useState<string | undefined>();
  const [generatedMockups, setGeneratedMockups] = useState<string[]>([]);
  const [isGeneratingMockups, setIsGeneratingMockups] = useState(false);
  const [added, setAdded] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showMiniPreview, setShowMiniPreview] = useState(true);
  const [paintMode, setPaintMode] = useState(false);
  const [paintBrushColor, setPaintBrushColor] = useState("#111827");
  const [paintBrushSize, setPaintBrushSize] = useState(22);

  const editorRef = useRef<DesignEditorHandle>(null);
  const addItem = useCartStore((state) => state.addItem);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const selectedPreset = product.presetDesigns.find((d) => d.id === selectedPresetId);
  const canvasBg = selectedVariant?.imageUrl ?? product.images[0];
  const previewMockups = useMemo(
    () =>
      Array.from(
        new Set(
          [selectedVariant?.imageUrl, ...product.images].filter(
            (image): image is string => Boolean(image)
          )
        )
      ),
    [selectedVariant?.imageUrl, product.images]
  );
  const isMug = product.category.toUpperCase() === "MUG";
  const isApparel = product.category.toUpperCase() === "APPAREL";
  const isEditView = mode === "edit";
  const isPreviewView = mode === "preview";
  const activeApparelSurface = isApparel
    ? getApparelEditorSurface(selectedApparelSurfaceId)
    : null;
  const editorCanvasWidth = isMug
    ? MUG_CANVAS_WIDTH
    : isApparel
      ? APPAREL_EDITOR_CANVAS_WIDTH
      : 520;
  const editorCanvasHeight = isMug
    ? MUG_CANVAS_HEIGHT
    : isApparel
      ? APPAREL_EDITOR_CANVAS_HEIGHT
      : 520;
  const editorBackgroundImage = isMug
    ? undefined
    : isApparel
      ? activeApparelSurface?.backgroundImage
      : canvasBg;
  const activeSurfacePreviewImage = isApparel
    ? apparelSurfacePreviewImages[selectedApparelSurfaceId]
    : paintedPreviewImage ?? editorPreviewImage;
  const previewImage = activeSurfacePreviewImage;
  const shouldGenerateMockups =
    !isMug && !isApparel && mode === "preview" && Boolean(previewImage);
  const activeGeneratedMockups = shouldGenerateMockups ? generatedMockups : [];
  const displayMockups =
    isApparel ? [] : activeGeneratedMockups.length > 0 ? activeGeneratedMockups : previewMockups;
  const unitPrice = product.basePrice + (selectedVariant?.priceModifier ?? 0);
  const customizationData = useMemo(() => {
    if (isApparel) {
      return {
        surfaces: apparelSurfaceData,
        activeSurfaceId: selectedApparelSurfaceId,
      };
    }

    if (!paintedPreviewImage) {
      return editorCustomizationData;
    }

    if (editorCustomizationData) {
      return {
        editor: editorCustomizationData,
        mugPaintTextureDataUrl: paintedPreviewImage,
      };
    }

    return {
      mugPaintTextureDataUrl: paintedPreviewImage,
    };
  }, [apparelSurfaceData, editorCustomizationData, isApparel, paintedPreviewImage, selectedApparelSurfaceId]);

  useEffect(() => {
    if (!shouldGenerateMockups || !previewImage) {
      return;
    }

    const controller = new AbortController();

    async function generateMockups() {
      setGeneratedMockups([]);
      setIsGeneratingMockups(true);

      try {
        const queued = await requestMockups(
          {
            design: previewImage as string,
            productId: product.id,
            category: product.category,
          },
          controller.signal
        );

        const urls = await resolveMockups(queued, controller.signal);

        if (!controller.signal.aborted) {
          setGeneratedMockups(urls);
        }
      } catch {
        if (!controller.signal.aborted) {
          setGeneratedMockups([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsGeneratingMockups(false);
        }
      }
    }

    void generateMockups();

    return () => {
      controller.abort();
    };
  }, [shouldGenerateMockups, previewImage, product.id, product.category]);

  function toggleTool(tool: ActiveTool) {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }

  function handleEditorChange(nextData: object) {
    if (isApparel) {
      setApparelSurfaceData((current) => ({
        ...current,
        [selectedApparelSurfaceId]: nextData,
      }));
      return;
    }

    setEditorCustomizationData(nextData);
  }

  function handleEditorPreviewChange(nextPreviewImage: string) {
    if (isApparel) {
      setApparelSurfacePreviewImages((current) => ({
        ...current,
        [selectedApparelSurfaceId]: nextPreviewImage,
      }));
      return;
    }

    setEditorPreviewImage(nextPreviewImage);

    if (!isMug) {
      return;
    }

    setPaintedPreviewImage((current) =>
      current && current !== nextPreviewImage ? undefined : current
    );
    setPaintMode(false);
  }

  function handlePaintTextureCommit(nextPreviewImage: string) {
    setPaintedPreviewImage(nextPreviewImage);
  }

  function clearPaintLayer() {
    setPaintedPreviewImage(undefined);
    setPaintMode(false);
  }

  function handleAddToCart() {
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: canvasBg ?? product.images[0] ?? "",
      variantId: selectedVariantId,
      variantLabel: selectedVariant?.label,
      presetDesignId: selectedPresetId,
      presetDesignImage: selectedPreset?.imageUrl,
      customizationData,
      quantity: 1,
      unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex min-h-[calc(100dvh-4.125rem)] flex-col bg-[#eee9df] text-stone-950 dark:bg-[#11100e] dark:text-stone-50 xl:h-[calc(100dvh-4.125rem)] xl:overflow-hidden">
      <header className="relative z-20 shrink-0 border-b border-black/10 bg-[#f8f4ec]/95 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#171512]/95 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/${lang}/products/${product.slug}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 text-stone-600 transition-all hover:-translate-x-0.5 hover:border-black/20 hover:text-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:border-white/20 dark:hover:text-white"
              aria-label={dict?.backToProduct ?? "Back to product"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                  Naqsh Studio
                </span>
                <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {product.category}
                </span>
              </div>
              <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{product.name}</h1>
            </div>
          </div>

          <div className="order-3 flex w-full items-center justify-center sm:order-none sm:w-auto">
            <div className="grid w-full grid-cols-2 rounded-full border border-black/10 bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.05] sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all ${
                  isEditView
                    ? "bg-stone-950 text-white shadow-sm dark:bg-stone-100 dark:text-stone-950"
                    : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                }`}
              >
                <PencilLine className="h-3.5 w-3.5" />
                Create
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all ${
                  isPreviewView
                    ? "bg-stone-950 text-white shadow-sm dark:bg-stone-100 dark:text-stone-950"
                    : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold transition-all sm:px-5 ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-amber-400 text-stone-950 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.9)] hover:-translate-y-0.5 hover:bg-amber-300"
            }`}
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {added ? dict?.added ?? "Added!" : dict?.addToCart ?? "Add to Cart"}
            </span>
            {!added ? <span>${unitPrice.toFixed(2)}</span> : null}
          </button>
        </div>
      </header>

      <div className="grid flex-1 xl:min-h-0 xl:grid-cols-[248px_minmax(0,1fr)_320px]">
        <aside className="border-b border-black/10 bg-[#f8f4ec] dark:border-white/10 dark:bg-[#171512] xl:min-h-0 xl:overflow-y-auto xl:border-b-0 xl:border-r">
          {isEditView ? (
            <div className="space-y-6 p-4 sm:p-5">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">
                      Step 01
                    </p>
                    <h2 className="mt-1 text-sm font-bold">Choose placement</h2>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Active
                  </span>
                </div>

                {isApparel ? (
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                    {APPAREL_EDITOR_SURFACES.map((surface, index) => {
                      const active = selectedApparelSurfaceId === surface.id;
                      const hasArtwork = Boolean(apparelSurfacePreviewImages[surface.id]);
                      return (
                        <button
                          key={surface.id}
                          type="button"
                          onClick={() => setSelectedApparelSurfaceId(surface.id)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                            active
                              ? "border-amber-500/40 bg-amber-400/10 text-stone-950 dark:border-amber-300/30 dark:text-white"
                              : "border-black/8 bg-white/45 text-stone-500 hover:border-black/15 hover:text-stone-900 dark:border-white/8 dark:bg-white/[0.025] dark:text-stone-400 dark:hover:border-white/15 dark:hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black ${
                                active
                                  ? "bg-amber-400 text-stone-950"
                                  : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                              }`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-xs font-bold">{surface.label}</span>
                          </span>
                          {hasArtwork ? <CircleDot className="h-3.5 w-3.5 text-emerald-500" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-400/10 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-stone-950">
                        <Box className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold">Main print area</p>
                        <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                          {editorCanvasWidth} × {editorCanvasHeight} px canvas
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <div className="h-px bg-black/8 dark:bg-white/8" />

              <section>
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">
                    Step 02
                  </p>
                  <h2 className="mt-1 text-sm font-bold">Build your artwork</h2>
                </div>
                <div className="space-y-2">
                  <SidebarTool
                    icon={<Upload className="h-4 w-4" />}
                    label="Upload image"
                    description="PNG, JPG or artwork file"
                    active={activeTool === "upload"}
                    onClick={() => {
                      setActiveTool(null);
                      editorRef.current?.triggerUpload();
                    }}
                  />
                  <SidebarTool
                    icon={<Type className="h-4 w-4" />}
                    label="Add text"
                    description="Create an editable text layer"
                    active={activeTool === "text"}
                    onClick={() => {
                      setActiveTool(null);
                      editorRef.current?.addText();
                    }}
                  />
                  {product.presetDesigns.length > 0 ? (
                    <SidebarTool
                      icon={<LayoutTemplate className="h-4 w-4" />}
                      label="Use a design"
                      description={`${product.presetDesigns.length} curated starting points`}
                      active={activeTool === "templates"}
                      onClick={() => toggleTool("templates")}
                    />
                  ) : null}
                </div>
              </section>

              {activeTool === "templates" && product.presetDesigns.length > 0 ? (
                <section className="rounded-2xl border border-black/8 bg-white/45 p-3 dark:border-white/8 dark:bg-white/[0.025]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                      Design library
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedPresetId(undefined)}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-600 dark:text-amber-300"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {product.presetDesigns.map((design) => (
                      <button
                        key={design.id}
                        type="button"
                        onClick={() => setSelectedPresetId(design.id)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                          selectedPresetId === design.id
                            ? "border-amber-400 shadow-md"
                            : "border-transparent hover:border-stone-300 dark:hover:border-stone-600"
                        }`}
                        title={design.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={design.imageUrl}
                          alt={design.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute inset-x-1 bottom-1 truncate rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                          {design.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                onClick={() => setMode("preview")}
                className="group flex w-full items-center justify-between rounded-2xl bg-stone-950 p-3.5 text-left text-white transition-all hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
              >
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.2em] opacity-55">
                    Step 03
                  </span>
                  <span className="mt-0.5 block text-sm font-bold">Review your product</span>
                </span>
                <Eye className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col p-5">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-stone-950">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                  Final review
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">See it before we make it.</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  Rotate the model, inspect every placement and make sure the artwork feels right.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  "Artwork stays inside the print area",
                  `${isApparel ? "All product surfaces" : "The full product"} can be reviewed`,
                  "Your customization is saved with the cart item",
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-xs leading-5 text-stone-600 dark:text-stone-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMode("edit")}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-3 text-xs font-bold transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 xl:mt-auto"
              >
                <PencilLine className="h-4 w-4" />
                Continue editing
              </button>
            </div>
          )}
        </aside>

        <main className="min-w-0 bg-[#e6dfd3] p-3 dark:bg-[#0c0b0a] sm:p-4 xl:min-h-0 xl:overflow-hidden">
          {isEditView ? (
            <section className="flex h-[620px] min-h-[520px] flex-col overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#1b1916] shadow-[0_28px_70px_-42px_rgba(41,31,19,0.65)] dark:border-white/10 xl:h-full">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-stone-950">
                    <PencilLine className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-500">Artboard</p>
                    <p className="truncate text-xs font-bold text-white">
                      {activeApparelSurface?.label ?? "Main print area"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => editorRef.current?.undo()}
                    disabled={!canUndo}
                    title="Undo"
                    className="rounded-full p-2 text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editorRef.current?.redo()}
                    disabled={!canRedo}
                    title="Redo"
                    className="rounded-full p-2 text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => editorRef.current?.deleteSelected()}
                    title="Delete selected"
                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div
                className={`grid min-h-0 flex-1 gap-3 p-3 ${
                  isApparel ? "2xl:grid-cols-[minmax(0,1fr)_300px]" : ""
                }`}
              >
                <div className="relative min-h-0 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#12110f]">
                  <DesignEditor
                    key={isApparel ? `apparel-${selectedApparelSurfaceId}` : product.id}
                    ref={editorRef}
                    width={editorCanvasWidth}
                    height={editorCanvasHeight}
                    backgroundImage={editorBackgroundImage}
                    surfaceId={isApparel ? selectedApparelSurfaceId : undefined}
                    initialScene={isApparel ? apparelSurfaceData[selectedApparelSurfaceId] : undefined}
                    productCategory={product.category}
                    templates={product.presetDesigns}
                    selectedTemplateId={selectedPresetId}
                    onSelectTemplate={setSelectedPresetId}
                    onChange={handleEditorChange}
                    onPreviewChange={handleEditorPreviewChange}
                    hideBuiltinToolbar
                    onHistoryChange={(u, r) => {
                      setCanUndo(u);
                      setCanRedo(r);
                    }}
                  />

                  {isMug ? (
                    <div className="absolute bottom-3 left-3 z-20 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#1b1916]/95 shadow-xl backdrop-blur-sm">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">
                          Live object
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMiniPreview((current) => !current)}
                          className="text-stone-500 hover:text-white"
                          aria-label="Toggle 3D preview"
                        >
                          {showMiniPreview ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {showMiniPreview ? (
                        <div className="h-32 border-t border-white/8 bg-black">
                          <ClientMugCanvas modelPath="/models/mug.glb" textureUrl={previewImage} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {isApparel ? (
                  <div className="hidden min-h-0 overflow-hidden rounded-[1.35rem] border border-white/8 bg-black 2xl:flex 2xl:flex-col">
                    <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-500">Live model</p>
                        <p className="mt-0.5 text-xs font-bold text-white">Placement check</p>
                      </div>
                      <Box className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="min-h-0 flex-1">
                      <ClientApparelCanvas
                        modelPath={DEFAULT_APPAREL_MODEL_PATH}
                        textureUrl={activeSurfacePreviewImage}
                        surfaceId={selectedApparelSurfaceId}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-2.5 text-[10px] font-medium text-stone-500">
                <span>Drag, resize and rotate any selected layer</span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Safe print boundaries enabled
                </span>
              </div>
            </section>
          ) : (
            <section className="h-auto min-h-[620px] overflow-y-auto rounded-[1.75rem] border border-black/10 bg-[#f8f4ec] p-3 shadow-[0_28px_70px_-42px_rgba(41,31,19,0.65)] dark:border-white/10 dark:bg-[#171512] sm:p-5 xl:h-full">
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                      Product proof
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">Your idea, in context.</h2>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-[10px] font-bold text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
                    Drag the model to inspect
                  </span>
                </div>
                <Studio3DPreview
                  productName={product.name}
                  productCategory={product.category}
                  apparelSurfaceId={isApparel ? selectedApparelSurfaceId : undefined}
                  apparelSurfacePreviewImages={isApparel ? apparelSurfacePreviewImages : undefined}
                  variantLabel={selectedVariant?.label}
                  previewImage={previewImage}
                  mockupImages={displayMockups}
                  isGeneratingMockups={shouldGenerateMockups && isGeneratingMockups}
                  paintMode={paintMode}
                  brushColor={paintBrushColor}
                  brushSize={paintBrushSize}
                  hasPaintLayer={Boolean(paintedPreviewImage)}
                  onPaintModeChange={setPaintMode}
                  onBrushColorChange={setPaintBrushColor}
                  onBrushSizeChange={setPaintBrushSize}
                  onClearPaint={clearPaintLayer}
                  onPaintTextureCommit={handlePaintTextureCommit}
                />
              </div>
            </section>
          )}
        </main>

        <aside className="border-t border-black/10 bg-[#f8f4ec] dark:border-white/10 dark:bg-[#171512] xl:min-h-0 xl:overflow-y-auto xl:border-l xl:border-t-0">
          <div className="space-y-6 p-5">
            <section>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">Product</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{product.name}</h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Made to order · one custom piece
                  </p>
                </div>
                <div className="rounded-2xl bg-stone-950 px-3 py-2 text-right text-white dark:bg-stone-100 dark:text-stone-950">
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Total</p>
                  <p className="text-sm font-black">${unitPrice.toFixed(2)}</p>
                </div>
              </div>
            </section>

            {product.variants.length > 0 ? (
              <section className="border-t border-black/8 pt-5 dark:border-white/8">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                      {dict?.options ?? "Options"}
                    </p>
                    <p className="mt-1 text-sm font-bold">{selectedVariant?.label ?? "Choose a variant"}</p>
                  </div>
                  {selectedVariant?.priceModifier ? (
                    <span className="text-[10px] font-bold text-stone-400">
                      +${selectedVariant.priceModifier.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const color = getVariantColor(variant.label);
                    const isSelected = selectedVariantId === variant.id;
                    return color ? (
                      <button
                        key={variant.id}
                        type="button"
                        title={variant.label}
                        aria-label={variant.label}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                          isSelected
                            ? "scale-105 border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.16)]"
                            : "border-black/10 hover:scale-105 hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
                        }`}
                        style={{
                          backgroundColor: color,
                          boxShadow: color === "#ffffff" ? "inset 0 0 0 1px #d6d3d1" : undefined,
                        }}
                      >
                        {isSelected ? (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-stone-950">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-full border px-3 py-2 text-[11px] font-bold transition-all ${
                          isSelected
                            ? "border-stone-950 bg-stone-950 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950"
                            : "border-black/10 bg-white/45 text-stone-600 hover:border-black/25 dark:border-white/10 dark:bg-white/[0.025] dark:text-stone-300 dark:hover:border-white/25"
                        }`}
                      >
                        {variant.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="border-t border-black/8 pt-5 dark:border-white/8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Design summary</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/8 bg-white/45 dark:border-white/8 dark:bg-white/[0.025]">
                <div className="flex items-center justify-between border-b border-black/8 px-3 py-3 text-xs dark:border-white/8">
                  <span className="text-stone-500 dark:text-stone-400">Placement</span>
                  <span className="font-bold">{activeApparelSurface?.label ?? "Main area"}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-3 text-xs">
                  <span className="text-stone-500 dark:text-stone-400">Starting design</span>
                  <span className="max-w-[145px] truncate font-bold">
                    {selectedPreset?.name ?? "Custom artwork"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.07] p-3.5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Print-ready workflow</p>
                  <p className="mt-1 text-[11px] leading-4 text-emerald-800/65 dark:text-emerald-200/60">
                    Your exact placement and artwork are attached to this item when it enters the cart.
                  </p>
                </div>
              </div>
            </section>

            <section className="border-t border-black/8 pt-5 dark:border-white/8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Your custom piece</p>
                  <p className="mt-1 text-3xl font-black tracking-[-0.04em]">${unitPrice.toFixed(2)}</p>
                </div>
                <span className="pb-1 text-[10px] text-stone-400">Taxes at checkout</span>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-all ${
                  added
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-400 text-stone-950 shadow-[0_14px_30px_-16px_rgba(245,158,11,0.8)] hover:-translate-y-0.5 hover:bg-amber-300"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> {dict?.added ?? "Added!"}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" /> {dict?.addToCart ?? "Add to Cart"}
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[10px] leading-4 text-stone-400">
                You can review this customization again before payment.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
