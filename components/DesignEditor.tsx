"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import dynamic from "next/dynamic";
import {
  ImageIcon,
  LayoutTemplate,
  Layers3,
  Move,
  Palette,
  RotateCcw,
  RotateCw,
  ScanLine,
  Trash2,
  Type,
} from "lucide-react";
import {
  Stage as RStage,
  Layer as RLayer,
  Image as RImage,
  Text as RText,
  Rect as RRect,
  Transformer as RTransformer,
  Line as RLine,
} from "react-konva";

type DesignTemplate = {
  id: string;
  name: string;
  imageUrl: string;
};

export interface DesignEditorHandle {
  addText: () => void;
  triggerUpload: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
}

interface DesignEditorProps {
  width?: number;
  height?: number;
  backgroundImage?: string;
  templates?: DesignTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate?: (templateId?: string) => void;
  onChange?: (data: object) => void;
  onPreviewChange?: (previewDataUrl: string) => void;
  hideBuiltinToolbar?: boolean;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  productCategory?: string;
}

type NodeRole = "background" | "template" | "upload" | "text";

interface BaseNode {
  id: string;
  role: NodeRole;
}

interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  draggable: boolean;
  templateId?: string;
}

interface TextNode extends BaseNode {
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  draggable: boolean;
}

type StudioNode = ImageNode | TextNode;
type HistoryEntry = StudioNode[];

interface InnerEditorProps extends DesignEditorProps {
  editorRef: React.Ref<DesignEditorHandle>;
}

const COLOR_SWATCHES = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function isTextNode(node: StudioNode | undefined): node is TextNode {
  return node?.type === "text";
}

function isImageNode(node: StudioNode | undefined): node is ImageNode {
  return node?.type === "image";
}

function formatLayerLabel(node: StudioNode, index: number) {
  if (node.role === "template") return `Template ${index + 1}`;
  if (node.role === "upload") return `Image ${index + 1}`;
  if (isTextNode(node)) return node.text.trim() || `Text ${index + 1}`;
  return `Layer ${index + 1}`;
}

function InnerEditor({
  editorRef,
  width = 400,
  height = 400,
  backgroundImage,
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  onChange,
  onPreviewChange,
  hideBuiltinToolbar = false,
  onHistoryChange,
  productCategory,
}: InnerEditorProps) {
  const stageRef = useRef<import("konva/lib/Stage").Stage | null>(null);
  const transformerRef = useRef<import("konva/lib/shapes/Transformer").Transformer | null>(null);
  const overlayLayerRef = useRef<import("konva/lib/Layer").Layer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes] = useState<StudioNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageElems, setImageElems] = useState<Record<string, HTMLImageElement>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const templateSyncRef = useRef<string>("");
  const nodesRef = useRef<StudioNode[]>([]);
  const historyIndexRef = useRef(0);
  const onChangeRef = useRef(onChange);

  const isMug = (productCategory ?? "").toUpperCase() === "MUG";
  const MUG_BLEED = 30;

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const ensureImageElem = useCallback(async (src: string) => {
    setImageElems((prev) => {
      if (prev[src]) return prev;
      return prev;
    });
    const elem = await loadImage(src);
    setImageElems((prev) => ({ ...prev, [src]: elem }));
    return elem;
  }, []);

  const emitPreview = useCallback(() => {
    if (!stageRef.current || !onPreviewChange) return;
    const stage = stageRef.current;

    const bgNode = stage.findOne("#bg-node");
    const phNode = stage.findOne("#ph-node");
    const overlayLayer = overlayLayerRef.current;

    if (bgNode) bgNode.visible(false);
    if (phNode) phNode.visible(false);
    if (overlayLayer) overlayLayer.visible(false);

    const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });

    if (bgNode) bgNode.visible(true);
    if (phNode) phNode.visible(true);
    if (overlayLayer) overlayLayer.visible(true);

    onPreviewChange(dataUrl);
  }, [onPreviewChange]);

  const commit = useCallback((next: StudioNode[]) => {
    setHistory((prev) => [...prev.slice(0, historyIndexRef.current + 1), next]);
    setHistoryIndex((index) => index + 1);
    onChangeRef.current?.(next as unknown as object);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => emitPreview(), 50);
    return () => clearTimeout(timer);
  }, [nodes, emitPreview]);

  useEffect(() => {
    onHistoryChange?.(historyIndex > 0, historyIndex < history.length - 1);
  }, [historyIndex, history.length, onHistoryChange]);

  useEffect(() => {
    async function init() {
      setReady(false);
      setSelectedId(null);

      const baseNodes: StudioNode[] = [];

      if (backgroundImage) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(backgroundImage)}`;
        const elem = await ensureImageElem(proxyUrl);
        const scale = Math.max(width / elem.naturalWidth, height / elem.naturalHeight);
        const w = elem.naturalWidth * scale;
        const h = elem.naturalHeight * scale;

        baseNodes.push({
          id: "bg",
          role: "background",
          type: "image",
          src: proxyUrl,
          x: (width - w) / 2,
          y: (height - h) / 2,
          width: w,
          height: h,
          draggable: false,
        });
      }

      const keep = nodesRef.current.filter(
        (node) => node.role !== "background" && node.role !== "template"
      );
      const initNext = [...baseNodes, ...keep];

      setNodes(initNext);
      setHistory([initNext]);
      setHistoryIndex(0);
      templateSyncRef.current = "";
      setReady(true);
    }

    void init();
  }, [backgroundImage, ensureImageElem, width, height]);

  useEffect(() => {
    const sig = selectedTemplateId ?? "";
    if (templateSyncRef.current === sig) return;
    templateSyncRef.current = sig;

    if (!selectedTemplateId) {
      const next = nodesRef.current.filter((node) => node.role !== "template");
      setNodes(next);
      commit(next);
      return;
    }

    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;

    void (async () => {
      const elem = await ensureImageElem(template.imageUrl);
      const scale = Math.min(
        (width * 0.6) / elem.naturalWidth,
        (height * 0.6) / elem.naturalHeight
      );
      const w = elem.naturalWidth * scale;
      const h = elem.naturalHeight * scale;
      const templateNode: ImageNode = {
        id: `tmpl-${template.id}`,
        role: "template",
        type: "image",
        src: template.imageUrl,
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
        draggable: true,
        templateId: template.id,
      };
      const without = nodesRef.current.filter((node) => node.role !== "template");
      const next = [...without, templateNode];
      setNodes(next);
      commit(next);
      setSelectedId(templateNode.id);
    })();
  }, [selectedTemplateId, templates, commit, ensureImageElem, width, height]);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    if (!selectedId) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }

    const node = stageRef.current.findOne(`#${CSS.escape(selectedId)}`);
    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, nodes]);

  const addText = useCallback(() => {
    const node: TextNode = {
      id: uid(),
      role: "text",
      type: "text",
      text: "Your text here",
      x: 60,
      y: 60,
      fontSize: 28,
      fill: "#111827",
      draggable: true,
    };
    const next = [...nodesRef.current, node];
    setNodes(next);
    commit(next);
    setSelectedId(node.id);
  }, [commit]);

  const addImageNode = useCallback(
    async (src: string, role: NodeRole) => {
      const elem = await ensureImageElem(src);
      const scale = Math.min(
        (width * 0.6) / elem.naturalWidth,
        (height * 0.6) / elem.naturalHeight
      );
      const w = elem.naturalWidth * scale;
      const h = elem.naturalHeight * scale;
      const node: ImageNode = {
        id: uid(),
        role,
        type: "image",
        src,
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
        draggable: true,
      };
      const next = [...nodesRef.current, node];
      setNodes(next);
      commit(next);
      setSelectedId(node.id);
    },
    [commit, ensureImageElem, width, height]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const src = URL.createObjectURL(file);
      await addImageNode(src, "upload");
      e.target.value = "";
    },
    [addImageNode]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const previous = history[historyIndex - 1];
    setNodes(previous);
    setHistoryIndex((index) => index - 1);
    setSelectedId(null);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setNodes(next);
    setHistoryIndex((index) => index + 1);
    setSelectedId(null);
  }, [history, historyIndex]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const selectedNode = nodesRef.current.find((node) => node.id === selectedId);
    if (!selectedNode || selectedNode.role === "background") return;
    const next = nodesRef.current.filter((node) => node.id !== selectedId);
    setNodes(next);
    commit(next);
    setSelectedId(null);
  }, [selectedId, commit]);

  useImperativeHandle(
    editorRef,
    () => ({
      addText,
      triggerUpload: () => fileInputRef.current?.click(),
      undo,
      redo,
      deleteSelected,
    }),
    [addText, undo, redo, deleteSelected]
  );

  const updateNodes = useCallback(
    (updater: (current: StudioNode[]) => StudioNode[]) => {
      const next = updater(nodesRef.current);
      setNodes(next);
      commit(next);
    },
    [commit]
  );

  const updateSelectedNode = useCallback(
    (updater: (node: StudioNode) => StudioNode) => {
      if (!selectedId) return;
      updateNodes((current) =>
        current.map((node) => (node.id === selectedId ? updater(node) : node))
      );
    },
    [selectedId, updateNodes]
  );

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateNodes((current) =>
        current.map((node) => (node.id === id ? { ...node, x, y } : node))
      );
    },
    [updateNodes]
  );

  const handleTransformEnd = useCallback(
    (id: string, attrs: Partial<ImageNode> | Partial<TextNode>) => {
      updateNodes((current) =>
        current.map((node) => (node.id === id ? ({ ...node, ...attrs } as StudioNode) : node))
      );
    },
    [updateNodes]
  );

  const alignSelected = useCallback(
    (axis: "horizontal" | "vertical") => {
      const selectedNode = nodesRef.current.find((node) => node.id === selectedId);
      if (!selectedNode) return;

      updateSelectedNode((node) => {
        if (axis === "horizontal") {
          const nodeWidth = isImageNode(node)
            ? node.width
            : Math.max(140, node.text.length * node.fontSize * 0.56);
          return { ...node, x: (width - nodeWidth) / 2 };
        }

        const nodeHeight = isImageNode(node) ? node.height : node.fontSize * 1.2;
        return { ...node, y: (height - nodeHeight) / 2 };
      });
    },
    [height, selectedId, updateSelectedNode, width]
  );

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const editableLayers = nodes.filter((node) => node.role !== "background");
  const textLayers = editableLayers.filter((node) => node.role === "text").length;
  const imageLayers = editableLayers.filter((node) => node.type === "image").length;
  const selectedIndex = editableLayers.findIndex((node) => node.id === selectedId);

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        {!hideBuiltinToolbar && templates.length > 0 && (
          <div className="rounded-[28px] border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              <LayoutTemplate className="h-4 w-4" />
              Template Gallery
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => onSelectTemplate?.(undefined)}
                className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[22px] border px-3 text-center text-xs font-semibold transition-all ${
                  !selectedTemplateId
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-950/10"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                Blank
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate?.(template.id)}
                  className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border-2 transition-all ${
                    selectedTemplateId === template.id
                      ? "border-zinc-900 shadow-lg shadow-zinc-950/10 dark:border-white"
                      : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                  title={template.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1.5 py-1 text-[10px] font-medium text-white">
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hideBuiltinToolbar && (
          <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-zinc-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <button
              type="button"
              onClick={addText}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:-translate-y-0.5 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <Type className="h-4 w-4" />
              Add Text
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:-translate-y-0.5 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </button>
            <div className="mx-1 h-7 w-px bg-zinc-200 dark:bg-zinc-700" />
            <button
              type="button"
              onClick={undo}
              disabled={!ready || historyIndex <= 0}
              title="Undo"
              className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!ready || historyIndex >= history.length - 1}
              title="Redo"
              className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={!selectedNode || selectedNode.role === "background"}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40 dark:border-red-950/60 dark:bg-red-950/30 dark:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-[32px] border border-zinc-200/80 bg-gradient-to-br from-white via-[#f6f3ee] to-[#ebe6dd] p-4 shadow-[0_28px_60px_-36px_rgba(24,24,27,0.45)] dark:border-zinc-700 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Design Studio
              </p>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Arrange your print area
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                Canvas {width} x {height}
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                Layers {editableLayers.length}
              </div>
              {isMug && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  Mug safe zone enabled
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(248,245,240,0.7)_55%,_rgba(238,233,225,0.9))] p-5 dark:border-zinc-700 dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.95),_rgba(24,24,27,0.92)_55%,_rgba(9,9,11,0.98))]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                <ScanLine className="h-4 w-4" />
                Workspace
              </div>
              <div className="rounded-full border border-zinc-200/80 bg-white/85 px-3 py-1 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-300">
                Click any layer to edit it
              </div>
            </div>

            <div
              className="flex justify-center overflow-auto rounded-[24px] border border-zinc-200/80 bg-[linear-gradient(45deg,rgba(255,255,255,0.82)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.82)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.82)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.82)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-5 shadow-inner dark:border-zinc-700 dark:bg-[linear-gradient(45deg,rgba(24,24,27,0.95)_25%,transparent_25%),linear-gradient(-45deg,rgba(24,24,27,0.95)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(24,24,27,0.95)_75%),linear-gradient(-45deg,transparent_75%,rgba(24,24,27,0.95)_75%)]"
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName === "CANVAS") {
                  setSelectedId(null);
                }
              }}
            >
              <div className="rounded-[24px] border border-zinc-300/80 bg-white p-3 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.55)] dark:border-zinc-600 dark:bg-zinc-950">
                <RStage
                  ref={stageRef as React.Ref<import("konva/lib/Stage").Stage>}
                  width={width}
                  height={height}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) setSelectedId(null);
                  }}
                  onTouchStart={(e) => {
                    if (e.target === e.target.getStage()) setSelectedId(null);
                  }}
                >
                  <RLayer>
                    <RRect
                      id="ph-node"
                      x={0}
                      y={0}
                      width={width}
                      height={height}
                      fill="#ffffff"
                      listening={false}
                    />

                    {nodes.map((node) => {
                      if (node.type === "image") {
                        const elem = imageElems[node.src];
                        if (!elem) return null;
                        return (
                          <RImage
                            key={node.id}
                            id={node.id}
                            image={elem}
                            x={node.x}
                            y={node.y}
                            width={node.width}
                            height={node.height}
                            draggable={node.draggable}
                            listening={node.draggable}
                            onClick={() => node.draggable && setSelectedId(node.id)}
                            onTap={() => node.draggable && setSelectedId(node.id)}
                            onDragEnd={(e) => handleDragEnd(node.id, e.target.x(), e.target.y())}
                            onTransformEnd={(e) => {
                              const current = e.target;
                              handleTransformEnd(node.id, {
                                x: current.x(),
                                y: current.y(),
                                width: Math.max(10, current.width() * current.scaleX()),
                                height: Math.max(10, current.height() * current.scaleY()),
                              });
                              current.scaleX(1);
                              current.scaleY(1);
                            }}
                          />
                        );
                      }

                      if (node.type === "text") {
                        return (
                          <RText
                            key={node.id}
                            id={node.id}
                            text={node.text}
                            x={node.x}
                            y={node.y}
                            fontSize={node.fontSize}
                            fill={node.fill}
                            draggable={node.draggable}
                            onClick={() => setSelectedId(node.id)}
                            onTap={() => setSelectedId(node.id)}
                            onDragEnd={(e) => handleDragEnd(node.id, e.target.x(), e.target.y())}
                            onTransformEnd={(e) => {
                              const current = e.target;
                              handleTransformEnd(node.id, {
                                x: current.x(),
                                y: current.y(),
                                fontSize: Math.max(8, node.fontSize * current.scaleX()),
                              });
                              current.scaleX(1);
                              current.scaleY(1);
                            }}
                          />
                        );
                      }

                      return null;
                    })}

                    <RTransformer
                      ref={
                        transformerRef as React.Ref<import("konva/lib/shapes/Transformer").Transformer>
                      }
                      rotateEnabled
                      enabledAnchors={[
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ]}
                      borderStroke="#18181b"
                      anchorFill="#ffffff"
                      anchorStroke="#18181b"
                      anchorSize={8}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) return oldBox;
                        return newBox;
                      }}
                    />
                  </RLayer>

                  {isMug && (
                    <RLayer
                      ref={overlayLayerRef as React.Ref<import("konva/lib/Layer").Layer>}
                      listening={false}
                    >
                      <RRect
                        x={0}
                        y={0}
                        width={width}
                        height={MUG_BLEED}
                        fill="#d6d0c8"
                        listening={false}
                      />
                      <RRect
                        x={0}
                        y={height - MUG_BLEED}
                        width={width}
                        height={MUG_BLEED}
                        fill="#d6d0c8"
                        listening={false}
                      />
                      <RRect
                        x={0.75}
                        y={MUG_BLEED}
                        width={width - 1.5}
                        height={height - MUG_BLEED * 2}
                        stroke="#555"
                        strokeWidth={1.5}
                        dash={[8, 6]}
                        fill="transparent"
                        listening={false}
                      />
                      {[1, 2].map((column) => (
                        <RLine
                          key={column}
                          points={[
                            Math.round(column * (width / 3)),
                            MUG_BLEED,
                            Math.round(column * (width / 3)),
                            height - MUG_BLEED,
                          ]}
                          stroke="#a1a1aa"
                          strokeWidth={1}
                          dash={[4, 6]}
                          listening={false}
                        />
                      ))}
                      {Array.from({ length: 7 }, (_, index) => {
                        const y = Math.round(
                          MUG_BLEED + ((index + 1) * (height - MUG_BLEED * 2)) / 8
                        );
                        return (
                          <RLine
                            key={index}
                            points={[0, y, width, y]}
                            stroke="#d4d4d8"
                            strokeWidth={0.5}
                            dash={[3, 5]}
                            listening={false}
                          />
                        );
                      })}
                    </RLayer>
                  )}
                </RStage>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 xl:w-[300px]">
        <div className="rounded-[28px] border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            <Layers3 className="h-4 w-4" />
            Layer Summary
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-zinc-100 px-3 py-3 text-center dark:bg-zinc-800">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Layers</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {editableLayers.length}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-100 px-3 py-3 text-center dark:bg-zinc-800">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Text</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {textLayers}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-100 px-3 py-3 text-center dark:bg-zinc-800">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Images</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {imageLayers}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={addText}
              disabled={!ready}
              className="flex-1 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Add text
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!ready}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Upload
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            <Move className="h-4 w-4" />
            Inspector
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {isTextNode(selectedNode) ? "Text layer" : "Image layer"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Layer {selectedIndex >= 0 ? selectedIndex + 1 : editableLayers.length} of{" "}
                      {editableLayers.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="rounded-xl border border-red-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-red-950/60 dark:hover:bg-red-950/40"
                    title="Delete selected"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">X position</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.x)}
                    onChange={(e) =>
                      updateSelectedNode((node) => ({
                        ...node,
                        x: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">Y position</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.y)}
                    onChange={(e) =>
                      updateSelectedNode((node) => ({
                        ...node,
                        y: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alignSelected("horizontal")}
                  className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Center X
                </button>
                <button
                  type="button"
                  onClick={() => alignSelected("vertical")}
                  className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Center Y
                </button>
              </div>

              {isImageNode(selectedNode) && (
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Image controls
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-500">Width</span>
                      <input
                        type="number"
                        min={10}
                        value={Math.round(selectedNode.width)}
                        onChange={(e) =>
                          updateSelectedNode((node) =>
                            isImageNode(node)
                              ? {
                                  ...node,
                                  width: Math.max(10, Number(e.target.value) || 10),
                                }
                              : node
                          )
                        }
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-500">Height</span>
                      <input
                        type="number"
                        min={10}
                        value={Math.round(selectedNode.height)}
                        onChange={(e) =>
                          updateSelectedNode((node) =>
                            isImageNode(node)
                              ? {
                                  ...node,
                                  height: Math.max(10, Number(e.target.value) || 10),
                                }
                              : node
                          )
                        }
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                </div>
              )}

              {isTextNode(selectedNode) && (
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    <Palette className="h-4 w-4" />
                    Text controls
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-zinc-500">Text</span>
                    <textarea
                      value={selectedNode.text}
                      onChange={(e) =>
                        updateSelectedNode((node) =>
                          isTextNode(node) ? { ...node, text: e.target.value } : node
                        )
                      }
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Font size {Math.round(selectedNode.fontSize)} px
                    </span>
                    <input
                      type="range"
                      min={12}
                      max={120}
                      step={1}
                      value={selectedNode.fontSize}
                      onChange={(e) =>
                        updateSelectedNode((node) =>
                          isTextNode(node)
                            ? { ...node, fontSize: Number(e.target.value) }
                            : node
                        )
                      }
                      className="w-full accent-zinc-900 dark:accent-white"
                    />
                  </label>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-zinc-500">Color</span>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_SWATCHES.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          onClick={() =>
                            updateSelectedNode((node) =>
                              isTextNode(node) ? { ...node, fill: color } : node
                            )
                          }
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 ${
                            selectedNode.fill === color
                              ? "border-zinc-900 dark:border-white"
                              : "border-zinc-200 dark:border-zinc-700"
                          }`}
                          style={{
                            backgroundColor: color,
                            outline: color === "#ffffff" ? "1px solid #d4d4d8" : undefined,
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedNode.fill}
                        onChange={(e) =>
                          updateSelectedNode((node) =>
                            isTextNode(node) ? { ...node, fill: e.target.value } : node
                          )
                        }
                        className="h-8 w-10 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              Select a text or image layer to edit its position, size, and styling. This panel is meant to feel like a production studio rather than a basic canvas.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            <Layers3 className="h-4 w-4" />
            Layer Stack
          </div>
          <div className="space-y-2">
            {editableLayers.length > 0 ? (
              [...editableLayers].reverse().map((node, reverseIndex) => {
                const actualIndex = editableLayers.length - reverseIndex - 1;
                const active = selectedId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-950/10 dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-white/20 dark:bg-zinc-200" : "bg-white dark:bg-zinc-900"
                      }`}
                    >
                      {node.role === "text" ? (
                        <Type className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {formatLayerLabel(node, actualIndex)}
                      </span>
                      <span
                        className={`block text-xs ${
                          active ? "text-white/70 dark:text-zinc-600" : "text-zinc-500"
                        }`}
                      >
                        {node.role}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="rounded-2xl bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-300">
                No editable layers yet. Add text, upload artwork, or apply a preset to begin.
              </p>
            )}
          </div>
        </div>
      </aside>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {!ready && <p className="text-sm text-zinc-400">Loading editor...</p>}
    </div>
  );
}

const ClientInnerEditor = dynamic(
  async () => {
    return { default: InnerEditor as React.ComponentType<InnerEditorProps> };
  },
  { ssr: false }
);

export const DesignEditor = forwardRef<DesignEditorHandle, DesignEditorProps>(
  function DesignEditorWrapper(props, ref) {
    const innerRef = useRef<DesignEditorHandle>(null);

    useImperativeHandle(ref, () => ({
      addText: () => innerRef.current?.addText(),
      triggerUpload: () => innerRef.current?.triggerUpload(),
      undo: () => innerRef.current?.undo(),
      redo: () => innerRef.current?.redo(),
      deleteSelected: () => innerRef.current?.deleteSelected(),
    }));

    return <ClientInnerEditor {...props} editorRef={innerRef} />;
  }
);
