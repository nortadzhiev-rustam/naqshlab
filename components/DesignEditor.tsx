"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import { RotateCcw, RotateCw, Type, ImageIcon } from "lucide-react";

interface DesignEditorProps {
  width?: number;
  height?: number;
  backgroundImage?: string;
  onChange?: (data: object) => void;
}

export function DesignEditor({
  width = 400,
  height = 400,
  backgroundImage,
  onChange,
}: DesignEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  const saveHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      return [...slice, json];
    });
    setHistoryIndex((prev) => prev + 1);
    onChange?.(fabricRef.current.toJSON());
  }, [historyIndex, onChange]);

  useEffect(() => {
    let canvas: FabricCanvas;

    async function init() {
      const { Canvas, FabricImage, Rect } = await import("fabric");

      if (!canvasRef.current) return;

      canvas = new Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "#ffffff",
      });
      fabricRef.current = canvas;

      if (backgroundImage) {
        const img = await FabricImage.fromURL(backgroundImage, { crossOrigin: "anonymous" });
        img.scaleToWidth(width);
        img.set({ selectable: false, evented: false });
        canvas.add(img);
        canvas.sendObjectToBack(img);
      } else {
        // Default placeholder
        const rect = new Rect({
          width: width - 40,
          height: height - 40,
          left: 20,
          top: 20,
          fill: "#f4f4f5",
          stroke: "#d4d4d8",
          strokeWidth: 2,
          strokeDashArray: [8, 4],
          selectable: false,
          evented: false,
          rx: 8,
          ry: 8,
        });
        canvas.add(rect);
      }

      canvas.on("object:modified", saveHistory);
      canvas.on("object:added", saveHistory);
      canvas.on("object:removed", saveHistory);

      setReady(true);
    }

    init();

    return () => {
      canvas?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, backgroundImage]);

  const addText = useCallback(async () => {
    if (!fabricRef.current) return;
    const { IText } = await import("fabric");
    const text = new IText("Your text here", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  }, []);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !fabricRef.current) return;

      const { FabricImage } = await import("fabric");
      const url = URL.createObjectURL(file);
      const img = await FabricImage.fromURL(url);

      // Scale to fit canvas
      const scale = Math.min(
        (width * 0.6) / (img.width ?? 1),
        (height * 0.6) / (img.height ?? 1)
      );
      img.scale(scale);
      img.set({ left: 50, top: 50 });

      fabricRef.current.add(img);
      fabricRef.current.setActiveObject(img);
      fabricRef.current.renderAll();
      e.target.value = "";
    },
    [width, height]
  );

  const undo = useCallback(async () => {
    if (historyIndex <= 0 || !fabricRef.current) return;
    const prev = history[historyIndex - 1];
    await fabricRef.current.loadFromJSON(JSON.parse(prev));
    fabricRef.current.renderAll();
    setHistoryIndex((i) => i - 1);
  }, [history, historyIndex]);

  const redo = useCallback(async () => {
    if (historyIndex >= history.length - 1 || !fabricRef.current) return;
    const next = history[historyIndex + 1];
    await fabricRef.current.loadFromJSON(JSON.parse(next));
    fabricRef.current.renderAll();
    setHistoryIndex((i) => i + 1);
  }, [history, historyIndex]);

  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const active = fabricRef.current.getActiveObject() as FabricObject | null;
    if (active) {
      fabricRef.current.remove(active);
      fabricRef.current.renderAll();
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addText}
          disabled={!ready}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <Type className="h-4 w-4" /> Add Text
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!ready}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <ImageIcon className="h-4 w-4" /> Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <button
          onClick={undo}
          disabled={!ready || historyIndex <= 0}
          className="rounded-lg border p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          title="Undo"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!ready || historyIndex >= history.length - 1}
          className="rounded-lg border p-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          title="Redo"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={deleteSelected}
          disabled={!ready}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
        >
          Delete Selected
        </button>
      </div>

      {/* Canvas */}
      <div className="overflow-hidden rounded-xl border shadow-sm dark:border-zinc-700">
        <canvas ref={canvasRef} />
      </div>

      {!ready && (
        <p className="text-sm text-zinc-400">Loading editor…</p>
      )}
    </div>
  );
}
