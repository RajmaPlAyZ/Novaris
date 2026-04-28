"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Circle,
  Eraser,
  Hand,
  Info,
  Loader2,
  Maximize2,
  Minus,
  Palette,
  PenLine,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ActionTooltip } from "@/components/action-tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Tool = "pan" | "pen" | "eraser" | "rect" | "ellipse";

type Point = {
  x: number;
  y: number;
  timestamp: number;
};

type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
  timestamp: number;
};

type Shape = {
  id: string;
  type: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  timestamp: number;
};

type WhiteboardObject = {
  id: string;
  type: "stroke" | "shape";
  data: Stroke | Shape;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type Draft =
  | { type: "stroke"; data: Stroke }
  | { type: "shape"; data: Shape }
  | null;

const COLORS = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
];

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;
const GRID_SIZE = 48;
const TOOL_SHORTCUTS = {
  pan: "V",
  pen: "B",
  eraser: "E",
  rect: "R",
  ellipse: "O",
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeObject = (object: any): WhiteboardObject | null => {
  if (!object || !object.type || !object.data) return null;

  const id = object.id ?? object._id ?? object.data.id ?? makeId();
  const data = {
    ...object.data,
    id: object.data.id ?? id,
  };

  return {
    id,
    type: object.type,
    data,
  };
};

const distanceFromPointToSegment = (
  point: Point,
  segmentStart: Point,
  segmentEnd: Point,
) => {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }

  const t = clamp(
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
      (dx * dx + dy * dy),
    0,
    1,
  );

  return Math.hypot(
    point.x - (segmentStart.x + t * dx),
    point.y - (segmentStart.y + t * dy),
  );
};

const strokeIntersectsPoint = (
  stroke: Stroke,
  point: Point,
  radius: number,
) => {
  if (stroke.points.length === 1) {
    return (
      Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) <=
      radius
    );
  }

  for (let index = 1; index < stroke.points.length; index++) {
    if (
      distanceFromPointToSegment(
        point,
        stroke.points[index - 1],
        stroke.points[index],
      ) <= radius
    ) {
      return true;
    }
  }

  return false;
};

const shapeIntersectsPoint = (shape: Shape, point: Point, radius: number) => {
  const left = Math.min(shape.x, shape.x + shape.width) - radius;
  const right = Math.max(shape.x, shape.x + shape.width) + radius;
  const top = Math.min(shape.y, shape.y + shape.height) - radius;
  const bottom = Math.max(shape.y, shape.y + shape.height) + radius;

  return (
    point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
  );
};

const screenToWorld = (
  x: number,
  y: number,
  rect: DOMRect,
  camera: Camera,
) => ({
  x: (x - rect.left - camera.x) / camera.zoom,
  y: (y - rect.top - camera.y) / camera.zoom,
  timestamp: Date.now(),
});

const Whiteboard = ({ documentId }: { documentId: Id<"documents"> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const objectsRef = useRef<WhiteboardObject[]>([]);
  const draftRef = useRef<Draft>(null);
  const isPanningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const originRef = useRef<Point | null>(null);

  const [size, setSize] = useState({ width: 1, height: 1 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#111827");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [draft, setDraft] = useState<Draft>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [colorSheetOpen, setColorSheetOpen] = useState(false);

  const { isAuthenticated } = useConvexAuth();
  const whiteboardData = useQuery(
    api.whiteboard.getByDocumentId,
    isAuthenticated ? { documentId } : "skip",
  );
  const addObject = useMutation(api.whiteboard.addObject);
  const removeObject = useMutation(api.whiteboard.removeObject);
  const clearWhiteboard = useMutation(api.whiteboard.clear);

  const isLoading = whiteboardData === undefined;

  const displayedObjects = useMemo(() => {
    if (!draft) return objects;
    return [
      ...objects,
      { id: draft.data.id, type: draft.type, data: draft.data },
    ];
  }, [objects, draft]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const updateDraft = useCallback(
    (nextDraft: Draft | ((current: Draft) => Draft)) => {
      setDraft((current) => {
        const next =
          typeof nextDraft === "function" ? nextDraft(current) : nextDraft;
        draftRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!whiteboardData) return;

    setObjects(
      (whiteboardData.objects || [])
        .map(normalizeObject)
        .filter(Boolean) as WhiteboardObject[],
    );
  }, [whiteboardData]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(1, Math.floor(entry.contentRect.width));
      const nextHeight = Math.max(1, Math.floor(entry.contentRect.height));
      setSize({ width: nextWidth, height: nextHeight });
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    drawGrid(ctx, size, camera);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    displayedObjects.forEach((object) => drawObject(ctx, object));
    ctx.restore();
  }, [camera, displayedObjects, size]);

  const setCameraState = useCallback((nextCamera: Camera) => {
    const normalized = {
      ...nextCamera,
      zoom: clamp(nextCamera.zoom, MIN_ZOOM, MAX_ZOOM),
    };
    cameraRef.current = normalized;
    setCamera(normalized);
  }, []);

  const zoomAt = useCallback(
    (screenX: number, screenY: number, nextZoom: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const current = cameraRef.current;
      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const worldX = (screenX - rect.left - current.x) / current.zoom;
      const worldY = (screenY - rect.top - current.y) / current.zoom;

      setCameraState({
        x: screenX - rect.left - worldX * clampedZoom,
        y: screenY - rect.top - worldY * clampedZoom,
        zoom: clampedZoom,
      });
    },
    [setCameraState],
  );

  const commitObject = useCallback(
    async (object: WhiteboardObject) => {
      setObjects((current) => [...current, object]);
      setIsSaving(true);
      try {
        await addObject({ documentId, object });
      } catch (error) {
        console.error("Failed to save whiteboard object:", error);
        setObjects((current) =>
          current.filter((item) => item.id !== object.id),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [addObject, documentId],
  );

  const eraseAt = useCallback(
    (point: Point) => {
      const radius = Math.max(14, strokeWidth * 2) / cameraRef.current.zoom;
      const target = [...objectsRef.current].reverse().find((object) => {
        if (object.type === "stroke") {
          return strokeIntersectsPoint(object.data as Stroke, point, radius);
        }

        return shapeIntersectsPoint(object.data as Shape, point, radius);
      });

      if (!target) return;

      const snapshot = objectsRef.current;
      setObjects((current) =>
        current.filter((object) => object.id !== target.id),
      );
      setIsSaving(true);
      removeObject({ documentId, objectId: target.id })
        .catch((error) => {
          console.error("Failed to remove whiteboard object:", error);
          setObjects(snapshot);
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [documentId, removeObject, strokeWidth],
  );

  const getWorldPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return screenToWorld(
      event.clientX,
      event.clientY,
      canvas.getBoundingClientRect(),
      cameraRef.current,
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAuthenticated) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };

    const shouldPan =
      tool === "pan" ||
      isSpacePanning ||
      event.button === 1 ||
      event.button === 2 ||
      event.altKey;
    if (shouldPan) {
      isPanningRef.current = true;
      return;
    }

    const point = getWorldPoint(event);
    if (!point) return;

    if (tool === "eraser") {
      eraseAt(point);
      isDrawingRef.current = true;
      return;
    }

    if (tool === "pen") {
      const id = makeId();
      isDrawingRef.current = true;
      updateDraft({
        type: "stroke",
        data: {
          id,
          points: [point],
          color,
          width: strokeWidth / cameraRef.current.zoom,
          tool: "pen",
          timestamp: Date.now(),
        },
      });
      return;
    }

    if (tool === "rect" || tool === "ellipse") {
      const id = makeId();
      isDrawingRef.current = true;
      originRef.current = point;
      updateDraft({
        type: "shape",
        data: {
          id,
          type: tool === "rect" ? "rect" : "ellipse",
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          color,
          strokeWidth: strokeWidth / cameraRef.current.zoom,
          filled: false,
          timestamp: Date.now(),
        },
      });
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const lastPointer = lastPointerRef.current;

    if (isPanningRef.current && lastPointer) {
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const current = cameraRef.current;
      setCameraState({ ...current, x: current.x + dx, y: current.y + dy });
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      return;
    }

    if (!isDrawingRef.current) return;

    const point = getWorldPoint(event);
    if (!point) return;

    if (tool === "eraser") {
      eraseAt(point);
      return;
    }

    updateDraft((current) => {
      if (!current) return current;

      if (current.type === "stroke") {
        return {
          ...current,
          data: {
            ...current.data,
            points: [...current.data.points, point],
          },
        };
      }

      const origin = originRef.current;
      if (!origin) return current;

      return {
        ...current,
        data: {
          ...current.data,
          x: Math.min(origin.x, point.x),
          y: Math.min(origin.y, point.y),
          width: Math.abs(point.x - origin.x),
          height: Math.abs(point.y - origin.y),
        },
      };
    });
  };

  const finishPointerAction = async () => {
    isPanningRef.current = false;
    lastPointerRef.current = null;

    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    originRef.current = null;

    const currentDraft = draftRef.current;

    if (!currentDraft || tool === "eraser") {
      updateDraft(null);
      return;
    }

    if (currentDraft.type === "stroke" && currentDraft.data.points.length < 2) {
      updateDraft(null);
      return;
    }

    if (
      currentDraft.type === "shape" &&
      (Math.abs(currentDraft.data.width) < 4 ||
        Math.abs(currentDraft.data.height) < 4)
    ) {
      updateDraft(null);
      return;
    }

    const object: WhiteboardObject = {
      id: currentDraft.data.id,
      type: currentDraft.type,
      data: currentDraft.data,
    };
    updateDraft(null);
    await commitObject(object);
  };

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      const nextZoom = cameraRef.current.zoom * Math.exp(-event.deltaY * 0.002);
      zoomAt(event.clientX, event.clientY, nextZoom);
      return;
    }

    const current = cameraRef.current;
    setCameraState({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    });
  }, [zoomAt, setCameraState]);

  // Attach wheel listener as non-passive so preventDefault works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const resetView = useCallback(() => {
    setCameraState({ x: 0, y: 0, zoom: 1 });
  }, [setCameraState]);

  const fitToContent = useCallback(() => {
    if (!objects.length) {
      resetView();
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    objects.forEach((object) => {
      if (object.type === "stroke") {
        const stroke = object.data as Stroke;
        stroke.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else {
        const shape = object.data as Shape;
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + shape.width);
        maxY = Math.max(maxY, shape.y + shape.height);
      }
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      resetView();
      return;
    }

    const contentWidth = Math.max(80, maxX - minX + 80);
    const contentHeight = Math.max(80, maxY - minY + 80);
    const nextZoom = clamp(
      Math.min(size.width / contentWidth, size.height / contentHeight),
      MIN_ZOOM,
      MAX_ZOOM,
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCameraState({
      zoom: nextZoom,
      x: size.width / 2 - centerX * nextZoom,
      y: size.height / 2 - centerY * nextZoom,
    });
  }, [objects, resetView, setCameraState, size.height, size.width]);

  const zoomFromCenter = useCallback(
    (nextZoom: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
    },
    [zoomAt],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePanning(true);
      }
      if (event.key.toLowerCase() === "v") setTool("pan");
      if (event.key.toLowerCase() === "b") setTool("pen");
      if (event.key.toLowerCase() === "e") setTool("eraser");
      if (event.key.toLowerCase() === "r") setTool("rect");
      if (event.key.toLowerCase() === "o") setTool("ellipse");
      if (event.key.toLowerCase() === "f") fitToContent();
      if (
        (event.key === "+" || event.key === "=") &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        zoomFromCenter(cameraRef.current.zoom * 1.12);
      }
      if (event.key === "-" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        zoomFromCenter(cameraRef.current.zoom / 1.12);
      }
      if (event.key === "0" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        resetView();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [fitToContent, resetView, zoomFromCenter]);

  const clearBoard = async () => {
    const shouldClear = window.confirm("Clear this whiteboard?");
    if (!shouldClear) return;

    const snapshot = objectsRef.current;
    setObjects([]);
    updateDraft(null);
    setIsSaving(true);
    try {
      await clearWhiteboard({ documentId });
    } catch (error) {
      console.error("Failed to clear whiteboard:", error);
      setObjects(snapshot);
    } finally {
      setIsSaving(false);
    }
  };

  const zoomPercent = Math.round(camera.zoom * 100);
  const activeToolLabel =
    tool === "rect"
      ? "Rectangle"
      : tool === "ellipse"
        ? "Ellipse"
        : tool === "eraser"
          ? "Eraser"
          : tool === "pan"
            ? "Pan"
            : "Pen";
  const isBoardEmpty = objects.length === 0 && !draft;

  if (!isAuthenticated) {
    return (
      <div className="bg-muted/20 text-muted-foreground flex h-full min-h-[520px] items-center justify-center rounded-lg border text-sm">
        Sign in to use the whiteboard.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="from-background via-background to-muted/20 relative h-full min-h-[720px] overflow-hidden rounded-lg border bg-gradient-to-br shadow-sm"
    >
      {isBoardEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="bg-background/85 flex max-w-xs flex-col items-center gap-2 rounded-lg border px-4 py-3 text-center shadow-sm backdrop-blur-md sm:max-w-xl sm:px-5 sm:py-4">
            <p className="text-sm font-semibold">Start sketching ideas</p>
            <p className="text-muted-foreground text-xs">
              <span className="sm:hidden">Tap a tool above to start drawing.</span>
              <span className="hidden sm:inline">
                Draw with <span className="text-foreground font-medium">B</span>,
                erase with <span className="text-foreground font-medium">E</span>,
                hold <span className="text-foreground font-medium">Space</span> to
                pan, and press{" "}
                <span className="text-foreground font-medium">F</span> to fit
                content.
              </span>
            </p>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerAction}
        onPointerCancel={finishPointerAction}
        onPointerLeave={finishPointerAction}
        className={cn(
          "h-full w-full touch-none",
          (tool === "pan" || isSpacePanning) &&
            "cursor-grab active:cursor-grabbing",
          tool === "pen" && "cursor-crosshair",
          tool === "eraser" && "cursor-cell",
          (tool === "rect" || tool === "ellipse") && "cursor-crosshair",
        )}
      />

      {/* ── Top center: tool selector (desktop) ── */}
      <div className="pointer-events-none absolute inset-x-0 top-3 hidden justify-center px-4 sm:flex">
        <div className="bg-background/92 pointer-events-auto flex items-center gap-1 rounded-lg border p-1 shadow-sm backdrop-blur-md">
          <div className="text-muted-foreground rounded-md px-2 py-1 text-xs">
            Tool: <span className="text-foreground font-medium">{activeToolLabel}</span>
          </div>
          <div className="bg-border h-5 w-px" />
          <ToolButton icon={Hand} label="Pan" shortcut={TOOL_SHORTCUTS.pan} active={tool === "pan"} onClick={() => setTool("pan")} />
          <ToolButton icon={PenLine} label="Pen" shortcut={TOOL_SHORTCUTS.pen} active={tool === "pen"} onClick={() => setTool("pen")} />
          <ToolButton icon={Eraser} label="Eraser" shortcut={TOOL_SHORTCUTS.eraser} active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <ToolButton icon={Square} label="Rectangle" shortcut={TOOL_SHORTCUTS.rect} active={tool === "rect"} onClick={() => setTool("rect")} />
          <ToolButton icon={Circle} label="Ellipse" shortcut={TOOL_SHORTCUTS.ellipse} active={tool === "ellipse"} onClick={() => setTool("ellipse")} />
        </div>
      </div>

      {/* ── Color + stroke panel (desktop only) ── */}
      <div className="bg-background/92 absolute top-3 left-3 hidden flex-col gap-2 rounded-lg border p-2 shadow-sm backdrop-blur-md sm:flex">
        <div className="grid grid-cols-4 gap-1">
          {COLORS.map((option) => (
            <button key={option} type="button" aria-label={`Use color ${option}`} onClick={() => setColor(option)}
              className={cn("size-6 rounded-sm border transition", color === option && "ring-primary ring-offset-background ring-2 ring-offset-2")}
              style={{ backgroundColor: option }}
            />
          ))}
        </div>
        <label className="text-muted-foreground flex w-36 items-center gap-2 text-xs">
          <span className="w-9">Size</span>
          <Slider min={1} max={24} value={[strokeWidth]} onValueChange={(v) => setStrokeWidth(v[0] ?? 4)} />
        </label>
      </div>

      {/* ── Mobile tool + color bottom bar ── */}
      <div className="absolute bottom-0 inset-x-0 sm:hidden">
        {/* Color sheet — slides up */}
        {colorSheetOpen && (
          <div className="bg-background/96 border-t px-4 pt-3 pb-2 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/70">Color & Size</span>
              <button onClick={() => setColorSheetOpen(false)} className="text-muted-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {COLORS.map((option) => (
                <button key={option} type="button" onClick={() => { setColor(option); setColorSheetOpen(false); }}
                  className={cn("h-8 w-8 rounded-md border-2 transition-transform active:scale-95 flex-1",
                    color === option ? "border-primary scale-110 shadow-md" : "border-transparent")}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
            <label className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0">Size</span>
              <Slider min={1} max={24} value={[strokeWidth]} onValueChange={(v) => setStrokeWidth(v[0] ?? 4)} className="flex-1" />
              <span className="w-4 text-right font-medium text-foreground">{strokeWidth}</span>
            </label>
          </div>
        )}

        {/* Mobile toolbar row */}
        <div className="bg-background/96 flex items-center justify-around border-t px-2 py-1.5 backdrop-blur-md">
          {/* Tool buttons */}
          <ToolButton icon={Hand} label="Pan" active={tool === "pan"} onClick={() => setTool("pan")} />
          <ToolButton icon={PenLine} label="Pen" active={tool === "pen"} onClick={() => setTool("pen")} />
          <ToolButton icon={Eraser} label="Eraser" active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <ToolButton icon={Square} label="Rectangle" active={tool === "rect"} onClick={() => setTool("rect")} />
          <ToolButton icon={Circle} label="Ellipse" active={tool === "ellipse"} onClick={() => setTool("ellipse")} />

          <div className="bg-border h-5 w-px" />

          {/* Color picker trigger — shows current color */}
          <button
            onClick={() => setColorSheetOpen((v) => !v)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all",
              colorSheetOpen ? "border-primary shadow-md scale-110" : "border-border",
            )}
            style={{ backgroundColor: color }}
            aria-label="Pick color"
          />

          {/* Zoom reset */}
          <button onClick={resetView}
            className="text-muted-foreground hover:bg-accent h-8 rounded-md px-2 text-xs font-medium">
            {zoomPercent}%
          </button>

          {/* Fit */}
          <Button variant="ghost" size="icon-sm" onClick={fitToContent}>
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Clear */}
          <Button variant="destructive" size="icon-sm" onClick={clearBoard}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Bottom left: zoom controls (desktop) ── */}
      <div className="bg-background/92 absolute bottom-3 left-3 hidden items-center gap-1 rounded-lg border p-1 shadow-sm backdrop-blur-md sm:flex">
        <ActionTooltip label="Zoom out">
          <Button variant="ghost" size="icon-sm" onClick={() => zoomFromCenter(camera.zoom / 1.2)}>
            <Minus className="h-4 w-4" />
          </Button>
        </ActionTooltip>
        <button type="button" onClick={resetView}
          className="text-muted-foreground hover:bg-accent hover:text-foreground h-8 min-w-14 rounded-md px-2 text-xs font-medium">
          {zoomPercent}%
        </button>
        <ActionTooltip label="Zoom in">
          <Button variant="ghost" size="icon-sm" onClick={() => zoomFromCenter(camera.zoom * 1.2)}>
            <Plus className="h-4 w-4" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Reset view (Ctrl/Cmd + 0)">
          <Button variant="ghost" size="icon-sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Fit content (F)">
          <Button variant="ghost" size="icon-sm" onClick={fitToContent}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      </div>

      {/* ── Top right: help ── */}
      <div className="absolute top-3 right-3">
        <Popover>
          <ActionTooltip label="Help">
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </ActionTooltip>
          <PopoverContent className="w-56 space-y-2 p-3 sm:w-64" align="end">
            <p className="text-sm font-semibold">Whiteboard Shortcuts</p>
            <p className="text-muted-foreground text-xs">`B` pen, `E` eraser, `R` rect, `O` ellipse, `V` pan</p>
            <p className="text-muted-foreground text-xs">Hold `Space` to pan, `Ctrl+scroll` zoom, `F` fit</p>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Bottom right: status + clear (desktop) ── */}
      <div className="absolute right-3 bottom-3 hidden items-center gap-2 sm:flex">
        {(isLoading || isSaving) && (
          <div className="bg-background/92 text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs shadow-sm backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </div>
        )}
        <div className="bg-background/92 text-muted-foreground rounded-md border px-2 py-1 text-xs shadow-sm backdrop-blur-md">
          {objects.length} objects
        </div>
        <ActionTooltip label="Clear board">
          <Button variant="destructive" size="icon-sm" onClick={clearBoard}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      </div>

      {/* Mobile saving indicator */}
      {(isLoading || isSaving) && (
        <div className="absolute top-3 left-3 sm:hidden">
          <div className="bg-background/92 text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs shadow-sm backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};

const ToolButton = ({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  active: boolean;
  onClick: () => void;
}) => (
  <ActionTooltip
    label={shortcut ? `${label} (${shortcut})` : label}
    side="bottom"
  >
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  </ActionTooltip>
);

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  camera: Camera,
) => {
  ctx.save();
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  ctx.fillRect(0, 0, size.width, size.height);

  const grid = GRID_SIZE * camera.zoom;
  if (grid < 8) {
    ctx.restore();
    return;
  }

  const offsetX = camera.x % grid;
  const offsetY = camera.y % grid;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = offsetX; x < size.width; x += grid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size.height);
  }

  for (let y = offsetY; y < size.height; y += grid) {
    ctx.moveTo(0, y);
    ctx.lineTo(size.width, y);
  }

  ctx.stroke();
  ctx.restore();
};

const drawObject = (
  ctx: CanvasRenderingContext2D,
  object: WhiteboardObject,
) => {
  if (object.type === "stroke") {
    drawStroke(ctx, object.data as Stroke);
    return;
  }

  drawShape(ctx, object.data as Shape);
};

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (!stroke.points.length) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
  } else {
    ctx.strokeStyle = stroke.color;
  }
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let index = 1; index < stroke.points.length; index++) {
    const current = stroke.points[index];
    const next = stroke.points[index + 1];

    if (next) {
      ctx.quadraticCurveTo(
        current.x,
        current.y,
        (current.x + next.x) / 2,
        (current.y + next.y) / 2,
      );
    } else {
      ctx.lineTo(current.x, current.y);
    }
  }

  ctx.stroke();
  ctx.restore();
};

const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.fillStyle = shape.color;

  if (shape.type === "rect") {
    if (shape.filled) ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  } else {
    ctx.beginPath();
    ctx.ellipse(
      shape.x + shape.width / 2,
      shape.y + shape.height / 2,
      Math.abs(shape.width / 2),
      Math.abs(shape.height / 2),
      0,
      0,
      Math.PI * 2,
    );
    if (shape.filled) ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

export default Whiteboard;
