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
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex w-12 flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-bold uppercase tracking-[0.12em] transition-all ${
        active
          ? "bg-zinc-900 text-white dark:bg-amber-400 dark:text-zinc-950"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
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
    !isMug && !isApparel && mode === "preview" && Boolean(previewImage) && previewMockups.length > 0;
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
      setIsGeneratingMockups(true);

      try {
        const response = await fetch("/api/mockups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: product.category,
            baseImages: previewMockups,
            designDataUrl: previewImage,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to generate mockups");
        }

        const data = (await response.json()) as { mockups?: string[] };
        if (!controller.signal.aborted) {
          setGeneratedMockups(data.mockups ?? []);
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
  }, [shouldGenerateMockups, previewImage, previewMockups, product.category]);

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
    <div className="flex h-[calc(100dvh-4.125rem)] flex-col overflow-hidden bg-[#edeae5] dark:bg-zinc-900">

      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/${lang}/products/${product.slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{dict?.backToProduct ?? "Back"}</span>
          </Link>
          <div className="h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />
          <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {product.name}
          </span>
        </div>

        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-all ${
              mode === "edit"
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-all ${
              mode === "preview"
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:block">
            ${unitPrice.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={handleAddToCart}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                <span>{dict?.added ?? "Added!"}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span>{dict?.addToCart ?? "Add to Cart"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        <div className={isEditView ? "flex h-full" : "hidden h-full"}>
            {/* Left sidebar */}
            <div className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1 border-r border-zinc-200/80 bg-white/80 py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
              <SidebarTool
                icon={<Upload className="h-5 w-5" />}
                label="Upload"
                active={activeTool === "upload"}
                onClick={() => {
                  setActiveTool(null);
                  editorRef.current?.triggerUpload();
                }}
              />
              <SidebarTool
                icon={<Type className="h-5 w-5" />}
                label="Text"
                active={activeTool === "text"}
                onClick={() => {
                  setActiveTool(null);
                  editorRef.current?.addText();
                }}
              />
              {product.presetDesigns.length > 0 && (
                <SidebarTool
                  icon={<LayoutTemplate className="h-5 w-5" />}
                  label="Designs"
                  active={activeTool === "templates"}
                  onClick={() => toggleTool("templates")}
                />
              )}
            </div>

            {/* Templates slide-out panel */}
            {activeTool === "templates" && (
              <div className="w-60 shrink-0 overflow-y-auto border-r border-zinc-200/80 bg-white/95 p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-950/95">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                  Preset Designs
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPresetId(undefined)}
                    className={`flex h-24 items-center justify-center rounded-xl border-2 text-xs font-semibold transition-all ${
                      !selectedPresetId
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    Blank
                  </button>
                  {product.presetDesigns.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() =>
                        setSelectedPresetId(
                          design.id === selectedPresetId ? undefined : design.id
                        )
                      }
                      className={`relative h-24 overflow-hidden rounded-xl border-2 transition-all ${
                        selectedPresetId === design.id
                          ? "border-zinc-900 shadow-md dark:border-amber-400"
                          : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                      title={design.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={design.imageUrl}
                        alt={design.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                        {design.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas area */}
            <div
              className={`relative flex min-w-0 flex-1 overflow-hidden ${
                isApparel ? "items-stretch gap-5 p-5" : "items-center justify-center"
              }`}
            >
              <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden">
                {/* Undo / Redo / Delete floating bar */}
                <div
                  className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-zinc-200/80 bg-white/95 px-1 py-1 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 ${
                    isApparel ? "bottom-20" : "bottom-5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => editorRef.current?.undo()}
                    disabled={!canUndo}
                    title="Undo"
                    className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editorRef.current?.redo()}
                    disabled={!canRedo}
                    title="Redo"
                    className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
                  <button
                    type="button"
                    onClick={() => editorRef.current?.deleteSelected()}
                    title="Delete selected"
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

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

                {isApparel ? (
                  <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-2 py-2 shadow-lg backdrop-blur-sm dark:bg-zinc-900/90">
                    {APPAREL_EDITOR_SURFACES.map((surface) => {
                      const active = selectedApparelSurfaceId === surface.id;
                      return (
                        <button
                          key={surface.id}
                          type="button"
                          onClick={() => setSelectedApparelSurfaceId(surface.id)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-zinc-800 text-white dark:bg-white dark:text-zinc-950"
                              : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {surface.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Mini preview widget bottom-right */}
                {isMug ? (
                  <div className="absolute bottom-5 left-5 z-10 w-44 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                        3D Preview
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMiniPreview((p) => !p)}
                        className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showMiniPreview ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {showMiniPreview && (
                      <div className="h-36">
                        <ClientMugCanvas
                          modelPath="/models/mug.glb"
                          textureUrl={previewImage}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {isApparel ? (
                <div className="hidden w-[360px] shrink-0 lg:block">
                  <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/92 shadow-[0_26px_60px_-34px_rgba(15,23,42,0.38)] dark:border-zinc-700 dark:bg-zinc-950/90">
                    <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                          Live 3D Model
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Uploads apply here immediately
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <Box className="h-3.5 w-3.5" />
                        {activeApparelSurface?.label ?? "Front side"}
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 bg-black">
                      <ClientApparelCanvas
                        modelPath={DEFAULT_APPAREL_MODEL_PATH}
                        textureUrl={activeSurfacePreviewImage}
                        surfaceId={selectedApparelSurfaceId}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
        </div>

        <div className={isPreviewView ? "flex min-h-0 h-full w-full" : "hidden min-h-0 h-full w-full"}>
            <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-xl">
                <Studio3DPreview
                  productName={product.name}
                  productCategory={product.category}
                  apparelSurfaceId={isApparel ? selectedApparelSurfaceId : undefined}
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
            </div>

            {/* Right options panel */}
            <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200/80 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95">
              <div className="space-y-6 p-6">
                {isApparel ? (
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                      Placement
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {APPAREL_EDITOR_SURFACES.map((surface) => {
                        const active = selectedApparelSurfaceId === surface.id;
                        return (
                          <button
                            key={surface.id}
                            type="button"
                            onClick={() => setSelectedApparelSurfaceId(surface.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                              active
                                ? "border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                            }`}
                          >
                            {surface.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {product.variants.length > 0 && (
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                      {dict?.options ?? "Options"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => {
                        const color = getVariantColor(variant.label);
                        const isSelected = selectedVariantId === variant.id;
                        return color ? (
                          <button
                            key={variant.id}
                            type="button"
                            title={variant.label}
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`h-9 w-9 rounded-full border-2 transition-all ${
                              isSelected
                                ? "scale-110 border-zinc-900 shadow-md dark:border-amber-400"
                                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                            }`}
                            style={{
                              backgroundColor: color,
                              outline: color === "#ffffff" ? "1px solid #d4d4d8" : undefined,
                            }}
                          />
                        ) : (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${
                              isSelected
                                ? "border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                            }`}
                          >
                            {variant.label}
                            {variant.priceModifier > 0 && (
                              <span className="ml-1 opacity-60">
                                (+${variant.priceModifier.toFixed(2)})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.presetDesigns.length > 0 && (
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                      Design
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(undefined);
                          setMode("edit");
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          !selectedPresetId
                            ? "border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        Custom
                      </button>
                      {product.presetDesigns.map((design) => (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() => setSelectedPresetId(design.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                            selectedPresetId === design.id
                              ? "border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {design.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                    ${unitPrice.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      added
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
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
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="mt-2 w-full rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  >
                    Edit Design
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
