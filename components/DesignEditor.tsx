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
  ArrowDown,
  ArrowUp,
  Copy,
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
import { type ApparelSurfaceId, getApparelPrintArea } from "@/lib/apparel-editor";

const MUG_HANDLE_CLEARANCE_RATIO = 0.18;

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
  surfaceId?: ApparelSurfaceId;
  initialScene?: unknown;
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
type HistoryEntry = {
  nodes: StudioNode[];
  designBackgroundColor: string | null;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNodeDimensions(node: StudioNode) {
  if (isImageNode(node)) {
    return { width: node.width, height: node.height };
  }

  return {
    width: Math.max(140, node.text.length * node.fontSize * 0.56),
    height: node.fontSize * 1.2,
  };
}

function getMugPrintableWidth(width: number, isMug: boolean) {
  if (!isMug) return width;
  return Math.max(0, width - Math.round(width * MUG_HANDLE_CLEARANCE_RATIO));
}

function sanitizeStoredNode(value: unknown): StudioNode | null {
  if (!value || typeof value !== "object") return null;

  const node = value as Partial<StudioNode> & Record<string, unknown>;

  if (node.type === "image") {
    if (
      typeof node.id !== "string" ||
      typeof node.role !== "string" ||
      typeof node.src !== "string" ||
      typeof node.x !== "number" ||
      typeof node.y !== "number" ||
      typeof node.width !== "number" ||
      typeof node.height !== "number"
    ) {
      return null;
    }

    return {
      id: node.id,
      role: node.role as NodeRole,
      type: "image",
      src: node.src,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      draggable: node.draggable !== false,
      templateId: typeof node.templateId === "string" ? node.templateId : undefined,
    };
  }

  if (node.type === "text") {
    if (
      typeof node.id !== "string" ||
      typeof node.role !== "string" ||
      typeof node.text !== "string" ||
      typeof node.x !== "number" ||
      typeof node.y !== "number" ||
      typeof node.fontSize !== "number" ||
      typeof node.fill !== "string"
    ) {
      return null;
    }

    return {
      id: node.id,
      role: node.role as NodeRole,
      type: "text",
      text: node.text,
      x: node.x,
      y: node.y,
      fontSize: node.fontSize,
      fill: node.fill,
      draggable: node.draggable !== false,
    };
  }

  return null;
}

function parseInitialScene(initialScene: unknown): HistoryEntry | null {
  if (!initialScene || typeof initialScene !== "object") return null;

  const scene = initialScene as {
    nodes?: unknown;
    designBackgroundColor?: unknown;
  };

  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.flatMap((node) => {
        const sanitized = sanitizeStoredNode(node);
        return sanitized ? [sanitized] : [];
      })
    : [];

  return {
    nodes,
    designBackgroundColor:
      typeof scene.designBackgroundColor === "string" ? scene.designBackgroundColor : null,
  };
}

function getEditableBounds(
  width: number,
  height: number,
  productCategory?: string,
  surfaceId?: ApparelSurfaceId
) {
  const normalizedCategory = (productCategory ?? "").toUpperCase();

  if (normalizedCategory === "MUG") {
    return {
      x: 0,
      y: 0,
      width: getMugPrintableWidth(width, true),
      height,
    };
  }

  if (normalizedCategory === "APPAREL") {
    return getApparelPrintArea(width, height, surfaceId);
  }

  return { x: 0, y: 0, width, height };
}

function constrainEditableNode(
  node: StudioNode,
  width: number,
  height: number,
  productCategory?: string,
  surfaceId?: ApparelSurfaceId
) {
  if (node.role === "background") {
    return node;
  }

  const bounds = getEditableBounds(width, height, productCategory, surfaceId);

  if (isImageNode(node)) {
    const safeWidth = Math.max(node.width, 1);
    const safeHeight = Math.max(node.height, 1);
    const scale = Math.min(1, bounds.width / safeWidth, bounds.height / safeHeight);
    const nextWidth = safeWidth * scale;
    const nextHeight = safeHeight * scale;
    const nextX = clamp(
      node.x,
      bounds.x,
      Math.max(bounds.x, bounds.x + bounds.width - nextWidth)
    );
    const nextY = clamp(
      node.y,
      bounds.y,
      Math.max(bounds.y, bounds.y + bounds.height - nextHeight)
    );

    return {
      ...node,
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    };
  }

  const textWidth = getNodeDimensions(node).width;
  const nextY = clamp(
    node.y,
    bounds.y,
    Math.max(bounds.y, bounds.y + bounds.height - getNodeDimensions(node).height)
  );
  const nextX = clamp(node.x, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - textWidth));

  return {
    ...node,
    x: nextX,
    y: nextY,
  };
}

function InnerEditor({
  editorRef,
  width = 400,
  height = 400,
  backgroundImage,
  surfaceId,
  initialScene,
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
  const stageViewportRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<StudioNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageElems, setImageElems] = useState<Record<string, HTMLImageElement>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([
    { nodes: [], designBackgroundColor: null },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [showCompactInspector, setShowCompactInspector] = useState(false);
  const [designBackgroundColor, setDesignBackgroundColor] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);

  const templateSyncRef = useRef<string>("");
  const nodesRef = useRef<StudioNode[]>([]);
  const historyIndexRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const designBackgroundColorRef = useRef<string | null>(null);
  const initialSceneRef = useRef<HistoryEntry | null>(parseInitialScene(initialScene));

  const isMug = (productCategory ?? "").toUpperCase() === "MUG";
  const isApparel = (productCategory ?? "").toUpperCase() === "APPAREL";
  const isCompactStudio = hideBuiltinToolbar;
  const MUG_BLEED = 30;
  const mugPrintableWidth = getMugPrintableWidth(width, isMug);
  const editableBounds = getEditableBounds(width, height, productCategory, surfaceId);
  const visibleCanvasWidth = isMug ? mugPrintableWidth : width;

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    designBackgroundColorRef.current = designBackgroundColor;
  }, [designBackgroundColor]);

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
    const transformer = transformerRef.current;

    if (bgNode) bgNode.visible(false);
    if (phNode) phNode.visible(false);
    if (overlayLayer) overlayLayer.visible(false);
    if (transformer) transformer.visible(false);

    const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });

    if (bgNode) bgNode.visible(true);
    if (phNode) phNode.visible(true);
    if (overlayLayer) overlayLayer.visible(true);
    if (transformer) transformer.visible(true);

    onPreviewChange(dataUrl);
  }, [onPreviewChange]);

  const emitChange = useCallback(
    (nextNodes: StudioNode[], nextDesignBackgroundColor: string | null) => {
      onChangeRef.current?.({
        nodes: nextNodes,
        designBackgroundColor: nextDesignBackgroundColor,
      });
    },
    []
  );

  const commit = useCallback(
    (
      next: StudioNode[],
      nextDesignBackgroundColor: string | null = designBackgroundColorRef.current
    ) => {
      setHistory((prev) => [
        ...prev.slice(0, historyIndexRef.current + 1),
        { nodes: next, designBackgroundColor: nextDesignBackgroundColor },
      ]);
      setHistoryIndex((index) => index + 1);
      emitChange(next, nextDesignBackgroundColor);
    },
    [emitChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => emitPreview(), 50);
    return () => clearTimeout(timer);
  }, [nodes, designBackgroundColor, imageElems, ready, emitPreview]);

  useEffect(() => {
    onHistoryChange?.(historyIndex > 0, historyIndex < history.length - 1);
  }, [historyIndex, history.length, onHistoryChange]);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) return;

    let frameId = 0;

    const measureScale = () => {
      frameId = 0;

      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const scaleCandidates = [1];

      if (availableWidth > 0) {
        scaleCandidates.push(availableWidth / visibleCanvasWidth);
      }

      if (availableHeight > 0) {
        scaleCandidates.push(availableHeight / height);
      }

      const nextScale = Math.min(...scaleCandidates);
      setStageScale((current) =>
        Math.abs(current - nextScale) < 0.01 ? current : nextScale
      );
    };

    const scheduleMeasure = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measureScale);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(viewport);
    scheduleMeasure();

    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [height, visibleCanvasWidth]);

  useEffect(() => {
    async function init() {
      setReady(false);
      setSelectedId(null);

      const baseNodes: StudioNode[] = [];

      if (backgroundImage) {
        const backgroundSrc =
          backgroundImage.startsWith("data:") || backgroundImage.startsWith("/")
          ? backgroundImage
          : `/api/image-proxy?url=${encodeURIComponent(backgroundImage)}`;
        const elem = await ensureImageElem(backgroundSrc);
        const scale = Math.max(width / elem.naturalWidth, height / elem.naturalHeight);
        const w = elem.naturalWidth * scale;
        const h = elem.naturalHeight * scale;

        baseNodes.push({
          id: "bg-node",
          role: "background",
          type: "image",
          src: backgroundSrc,
          x: (width - w) / 2,
          y: (height - h) / 2,
          width: w,
          height: h,
          draggable: false,
        });
      }

      const initialSceneData = initialSceneRef.current;
      const keep = initialSceneData
        ? initialSceneData.nodes.filter((node) => node.role !== "background")
        : nodesRef.current.filter((node) => node.role !== "background" && node.role !== "template");
      const initNext = [...baseNodes, ...keep].map((node) =>
        constrainEditableNode(node, width, height, productCategory, surfaceId)
      );
      const nextDesignBackgroundColor =
        initialSceneData?.designBackgroundColor ?? designBackgroundColorRef.current;

      setNodes(initNext);
      setDesignBackgroundColor(nextDesignBackgroundColor);
      setHistory([
        {
          nodes: initNext,
          designBackgroundColor: nextDesignBackgroundColor,
        },
      ]);
      setHistoryIndex(0);
      templateSyncRef.current = initialSceneData ? selectedTemplateId ?? "" : "";
      setReady(true);
    }

    void init();
  }, [backgroundImage, ensureImageElem, width, height, isMug, productCategory, selectedTemplateId, surfaceId]);

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
      const next = [...without, templateNode].map((node) =>
        constrainEditableNode(node, width, height, productCategory, surfaceId)
      );
      setNodes(next);
      commit(next);
      setSelectedId(templateNode.id);
    })();
  }, [selectedTemplateId, templates, commit, ensureImageElem, width, height, isMug, productCategory, surfaceId]);

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
      x:
        isMug || isApparel
          ? editableBounds.x + Math.max(24, (editableBounds.width - 140) / 2)
          : 60,
      y: isApparel ? editableBounds.y + 24 : 60,
      fontSize: 28,
      fill: "#111827",
      draggable: true,
    };
    const next = [
      ...nodesRef.current,
      constrainEditableNode(node, width, height, productCategory, surfaceId),
    ];
    setNodes(next);
    commit(next);
    setSelectedId(node.id);
  }, [commit, editableBounds.width, editableBounds.x, editableBounds.y, height, isApparel, isMug, productCategory, surfaceId, width]);

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
        x: editableBounds.x + (editableBounds.width - w) / 2,
        y: editableBounds.y + (editableBounds.height - h) / 2,
        width: w,
        height: h,
        draggable: true,
      };
      const next = [
        ...nodesRef.current,
        constrainEditableNode(node, width, height, productCategory, surfaceId),
      ];
      setNodes(next);
      commit(next);
      setSelectedId(node.id);
    },
    [commit, editableBounds.height, editableBounds.width, editableBounds.x, editableBounds.y, ensureImageElem, height, productCategory, surfaceId, width]
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
    setNodes(previous.nodes);
    setDesignBackgroundColor(previous.designBackgroundColor);
    setHistoryIndex((index) => index - 1);
    setSelectedId(null);
    emitChange(previous.nodes, previous.designBackgroundColor);
  }, [emitChange, history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setNodes(next.nodes);
    setDesignBackgroundColor(next.designBackgroundColor);
    setHistoryIndex((index) => index + 1);
    setSelectedId(null);
    emitChange(next.nodes, next.designBackgroundColor);
  }, [emitChange, history, historyIndex]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const selectedNode = nodesRef.current.find((node) => node.id === selectedId);
    if (!selectedNode || selectedNode.role === "background") return;
    const next = nodesRef.current.filter((node) => node.id !== selectedId);
    setNodes(next);
    commit(next);
    setSelectedId(null);
  }, [selectedId, commit]);

  const duplicateLayer = useCallback(
    (nodeId: string) => {
      const editable = nodesRef.current.filter((node) => node.role !== "background");
      const backgroundNodes = nodesRef.current.filter((node) => node.role === "background");
      const sourceIndex = editable.findIndex((node) => node.id === nodeId);
      if (sourceIndex === -1) return;

      const sourceNode = editable[sourceIndex];
      const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(sourceNode);
      const x = clamp(
        sourceNode.x + 18,
        editableBounds.x,
        Math.max(editableBounds.x, editableBounds.x + editableBounds.width - nodeWidth)
      );
      const y = clamp(
        sourceNode.y + 18,
        editableBounds.y,
        Math.max(editableBounds.y, editableBounds.y + editableBounds.height - nodeHeight)
      );

      const clone: StudioNode = isTextNode(sourceNode)
        ? {
            ...sourceNode,
            id: uid(),
            x,
            y,
          }
        : {
            ...sourceNode,
            id: uid(),
            role: sourceNode.role === "template" ? "upload" : sourceNode.role,
            templateId: undefined,
            x,
            y,
          };

      const nextEditable = [...editable];
      nextEditable.splice(
        sourceIndex + 1,
        0,
        constrainEditableNode(clone, width, height, productCategory, surfaceId)
      );

      const next = [...backgroundNodes, ...nextEditable];
      setNodes(next);
      commit(next);
      setSelectedId(clone.id);
    },
    [commit, editableBounds.height, editableBounds.width, editableBounds.x, editableBounds.y, productCategory, surfaceId, width, height]
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    duplicateLayer(selectedId);
  }, [duplicateLayer, selectedId]);

  const applyDesignBackgroundColor = useCallback(
    (nextColor: string | null) => {
      if (designBackgroundColorRef.current === nextColor) return;
      setDesignBackgroundColor(nextColor);
      commit(nodesRef.current, nextColor);
    },
    [commit]
  );

  const moveLayer = useCallback(
    (nodeId: string, direction: "forward" | "backward") => {
      const editable = nodesRef.current.filter((node) => node.role !== "background");
      const backgroundNodes = nodesRef.current.filter((node) => node.role === "background");
      const sourceIndex = editable.findIndex((node) => node.id === nodeId);
      if (sourceIndex === -1) return;

      const targetIndex = direction === "forward" ? sourceIndex + 1 : sourceIndex - 1;
      if (targetIndex < 0 || targetIndex >= editable.length) return;

      const nextEditable = [...editable];
      const [movedNode] = nextEditable.splice(sourceIndex, 1);
      if (!movedNode) return;

      nextEditable.splice(targetIndex, 0, movedNode);

      const next = [...backgroundNodes, ...nextEditable];
      setNodes(next);
      commit(next);
      setSelectedId(nodeId);
    },
    [commit]
  );

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
      const next = updater(nodesRef.current).map((node) =>
        constrainEditableNode(node, width, height, productCategory, surfaceId)
      );
      setNodes(next);
      commit(next);
    },
    [commit, height, productCategory, surfaceId, width]
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
          return { ...node, x: editableBounds.x + (editableBounds.width - nodeWidth) / 2 };
        }

        const nodeHeight = isImageNode(node) ? node.height : node.fontSize * 1.2;
        return { ...node, y: editableBounds.y + (editableBounds.height - nodeHeight) / 2 };
      });
    },
    [editableBounds.height, editableBounds.width, editableBounds.x, editableBounds.y, selectedId, updateSelectedNode]
  );

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const editableLayers = nodes.filter((node) => node.role !== "background");
  const textLayers = editableLayers.filter((node) => node.role === "text").length;
  const imageLayers = editableLayers.filter((node) => node.type === "image").length;
  const selectedIndex = editableLayers.findIndex((node) => node.id === selectedId);
  const compactInspectorVisible = isCompactStudio && showCompactInspector;
  const canMoveSelectedForward =
    selectedIndex >= 0 && selectedIndex < editableLayers.length - 1;
  const canMoveSelectedBackward = selectedIndex > 0;
  const rootClassName = isCompactStudio
    ? "flex h-full w-full min-h-0"
    : "flex w-full max-w-[1100px] flex-col gap-4 xl:h-full xl:min-h-0 xl:flex-row xl:items-stretch";
  const mainColumnClassName = isCompactStudio
    ? "min-w-0 flex-1"
    : "min-w-0 flex-1 space-y-4 xl:min-h-0";

  const renderMugBackgroundControls = () => {
    if (!isMug) return null;

    return (
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          <Palette className="h-4 w-4" />
          Print Background
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-300">
          Fill the mug wrap behind your artwork instead of keeping it transparent.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyDesignBackgroundColor(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              designBackgroundColor == null
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            Transparent
          </button>
          {COLOR_SWATCHES.map((color) => (
            <button
              key={`bg-${color}`}
              type="button"
              title={color}
              onClick={() => applyDesignBackgroundColor(color)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 ${
                designBackgroundColor === color
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
            value={designBackgroundColor ?? "#ffffff"}
            onChange={(e) => applyDesignBackgroundColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      </div>
    );
  };

  return (
    <div className={rootClassName}>
      <div className={mainColumnClassName}>
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
              onClick={duplicateSelected}
              disabled={!selectedNode || selectedNode.role === "background"}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:-translate-y-0.5 hover:border-zinc-400 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <Copy className="h-4 w-4" />
              Duplicate
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

        <div
          className={`overflow-hidden rounded-[32px] border border-zinc-200/80 bg-gradient-to-br from-white via-[#f6f3ee] to-[#ebe6dd] p-4 shadow-[0_28px_60px_-36px_rgba(24,24,27,0.45)] dark:border-zinc-700 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 ${
            isCompactStudio ? "h-full min-h-0 rounded-[36px] p-5" : ""
          }`}
        >
          {!isCompactStudio && (
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
                    Mug bleed and handle clearance enabled
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className={`rounded-[28px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(248,245,240,0.7)_55%,_rgba(238,233,225,0.9))] p-5 dark:border-zinc-700 dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.95),_rgba(24,24,27,0.92)_55%,_rgba(9,9,11,0.98))] ${
              isCompactStudio ? "relative flex h-full min-h-0 flex-col rounded-[30px] px-6 py-5" : ""
            }`}
          >
            {!isCompactStudio && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  <ScanLine className="h-4 w-4" />
                  Workspace
                </div>
                <div className="rounded-full border border-zinc-200/80 bg-white/85 px-3 py-1 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-300">
                  Click any layer to edit it
                </div>
              </div>
            )}

            {isCompactStudio && (
              <div className="absolute right-6 top-6 z-20">
                <button
                  type="button"
                  onClick={() => setShowCompactInspector((previous) => !previous)}
                  className={`rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
                    compactInspectorVisible
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-white/70 bg-white/90 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300"
                  }`}
                >
                  {compactInspectorVisible ? "Hide Inspector" : "Show Inspector"}
                </button>
              </div>
            )}

            <div
              ref={stageViewportRef}
              className={`flex justify-center overflow-auto rounded-[24px] border border-zinc-200/80 p-5 shadow-inner dark:border-zinc-700 ${
                isApparel
                  ? "bg-[#f4f1e7] dark:bg-zinc-900"
                  : "bg-[linear-gradient(45deg,rgba(255,255,255,0.82)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.82)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.82)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.82)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] dark:bg-[linear-gradient(45deg,rgba(24,24,27,0.95)_25%,transparent_25%),linear-gradient(-45deg,rgba(24,24,27,0.95)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(24,24,27,0.95)_75%),linear-gradient(-45deg,transparent_75%,rgba(24,24,27,0.95)_75%)]"
              } ${
                isCompactStudio ? "min-h-0 flex-1 items-center rounded-[28px] px-8 py-8" : ""
              }`}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedId(null);
                }
              }}
              onTouchStart={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedId(null);
                }
              }}
            >
              <div
                className="overflow-hidden rounded-[24px] border border-zinc-300/80 bg-white p-3 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.55)] dark:border-zinc-600 dark:bg-zinc-950"
                style={{
                  width: visibleCanvasWidth * stageScale + 24,
                  height: height * stageScale + 24,
                }}
              >
                <div
                  style={{
                    width,
                    height,
                    transform: `scale(${stageScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <RStage
                    ref={stageRef as React.Ref<import("konva/lib/Stage").Stage>}
                    width={width}
                    height={height}
                    onMouseDown={(e) => {
                      if (e.target === e.target.getStage()) {
                        setSelectedId(null);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.target === e.target.getStage()) {
                        setSelectedId(null);
                      }
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

                      {(isMug || isApparel) && designBackgroundColor ? (
                        <RRect
                          id="design-bg-node"
                          x={editableBounds.x}
                          y={editableBounds.y}
                          width={editableBounds.width}
                          height={editableBounds.height}
                          fill={designBackgroundColor}
                          listening={false}
                        />
                      ) : null}

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

                    {(isMug || isApparel) && (
                      <RLayer
                        ref={overlayLayerRef as React.Ref<import("konva/lib/Layer").Layer>}
                        listening={false}
                      >
                        {isMug ? (
                          <>
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
                              width={mugPrintableWidth - 1.5}
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
                                  Math.round(column * (mugPrintableWidth / 3)),
                                  MUG_BLEED,
                                  Math.round(column * (mugPrintableWidth / 3)),
                                  height - MUG_BLEED,
                                ]}
                                stroke="#a1a1aa"
                                strokeWidth={1}
                                dash={[4, 6]}
                                listening={false}
                              />
                            ))}
                            {[1, 3, 5].map((column) => (
                              <RLine
                                key={`mid-${column}`}
                                points={[
                                  Math.round(column * (mugPrintableWidth / 6)),
                                  MUG_BLEED,
                                  Math.round(column * (mugPrintableWidth / 6)),
                                  height - MUG_BLEED,
                                ]}
                                stroke="#d4d4d8"
                                strokeWidth={0.75}
                                dash={[3, 5]}
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
                          </>
                        ) : isApparel ? (
                          <RRect
                            x={editableBounds.x}
                            y={editableBounds.y}
                            width={editableBounds.width}
                            height={editableBounds.height}
                            stroke="#71717a"
                            strokeWidth={1.5}
                            dash={[7, 6]}
                            fill="transparent"
                            listening={false}
                          />
                        ) : null}
                      </RLayer>
                    )}
                  </RStage>
                </div>
              </div>
            </div>

            {compactInspectorVisible && (
              <div className="absolute bottom-6 right-6 z-20 max-h-[calc(100%-7rem)] w-[320px] overflow-y-auto rounded-[24px] border border-zinc-200/90 bg-white/96 p-4 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950/96">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  <Move className="h-4 w-4" />
                  Inspector
                </div>

                <div className="space-y-4">
                  {renderMugBackgroundControls()}

                  {selectedNode ? (
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={duplicateSelected}
                            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                            title="Duplicate selected"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLayer(selectedNode.id, "forward")}
                            disabled={!canMoveSelectedForward}
                            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                            title="Move layer up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLayer(selectedNode.id, "backward")}
                            disabled={!canMoveSelectedBackward}
                            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                            title="Move layer down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
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
                    </div>

                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                      Select a text or image layer on the canvas to edit it here.
                    </div>
                  )}

                  {selectedNode ? (
                    <>

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
                                  outline:
                                    color === "#ffffff" ? "1px solid #d4d4d8" : undefined,
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
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isCompactStudio && (
        <aside className="w-full shrink-0 space-y-4 xl:h-full xl:min-h-0 xl:w-[300px] xl:overflow-y-auto xl:pr-1">
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

          <div className="space-y-4">
            {renderMugBackgroundControls()}

            {selectedNode ? (
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={duplicateSelected}
                      className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                      title="Duplicate selected"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
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
              </div>

            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                Select a text or image layer to edit its position, size, and styling. This panel is meant to feel like a production studio rather than a basic canvas.
              </div>
            )}

            {selectedNode ? (
              <>

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
              </>
            ) : null}
          </div>
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
                const canMoveUp = actualIndex < editableLayers.length - 1;
                const canMoveDown = actualIndex > 0;
                return (
                  <div
                    key={node.id}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-950/10 dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          duplicateLayer(node.id);
                        }}
                        className={`rounded-xl p-2 transition-colors ${
                          active
                            ? "hover:bg-white/20 dark:hover:bg-zinc-200"
                            : "hover:bg-white dark:hover:bg-zinc-900"
                        }`}
                        title="Duplicate layer"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayer(node.id, "forward");
                        }}
                        disabled={!canMoveUp}
                        className={`rounded-xl p-2 transition-colors disabled:opacity-35 ${
                          active
                            ? "hover:bg-white/20 dark:hover:bg-zinc-200"
                            : "hover:bg-white dark:hover:bg-zinc-900"
                        }`}
                        title="Move layer up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayer(node.id, "backward");
                        }}
                        disabled={!canMoveDown}
                        className={`rounded-xl p-2 transition-colors disabled:opacity-35 ${
                          active
                            ? "hover:bg-white/20 dark:hover:bg-zinc-200"
                            : "hover:bg-white dark:hover:bg-zinc-900"
                        }`}
                        title="Move layer down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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
      )}

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
