"use client";

import { useRef, useState } from "react";
import { Move } from "lucide-react";
import { CONTENT_HEIGHT_MM, CONTENT_WIDTH_MM } from "@/lib/types";
import type { HeaderLayout, RecordState } from "@/lib/types";

const MIN_WIDTH_MM = 40;
const MIN_HEIGHT_MM = 14;

interface DraggableHeaderTableProps {
  record: RecordState;
  layout: HeaderLayout;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
}

type DragMode = { kind: "move" } | { kind: "resize" };

/**
 * Free-floating, draggable + resizable wrapper around the record-header
 * table for canvas2pdf mode. Positioned absolutely within `.a4-content`
 * (mm units, same coordinate frame `lib/buildCanvasPdf.ts` draws it in), so
 * it sits independently of the flowing sections below — dragging it over
 * them means it visually overlaps rather than reflowing the text around it.
 *
 * Drag/resize gestures update local state for smooth visual feedback and
 * only commit to `onFieldChange("headerLayout", ...)` on pointer-up, so
 * every mousemove doesn't re-trigger pagination/preview recompute for the
 * whole app.
 */
export function DraggableHeaderTable({ record, layout, onFieldChange }: DraggableHeaderTableProps) {
  const [draft, setDraft] = useState<HeaderLayout | null>(null);
  const gestureRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startLayout: HeaderLayout;
    pxPerMm: number;
  } | null>(null);

  const current = draft || layout;

  function beginGesture(e: React.PointerEvent, mode: DragMode, pxPerMm: number) {
    e.preventDefault();
    e.stopPropagation();
    gestureRef.current = { mode, startX: e.clientX, startY: e.clientY, startLayout: layout, pxPerMm };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const dxMm = (e.clientX - gesture.startX) / gesture.pxPerMm;
    const dyMm = (e.clientY - gesture.startY) / gesture.pxPerMm;
    const { startLayout } = gesture;

    if (gesture.mode.kind === "move") {
      const x = clamp(startLayout.x + dxMm, 0, CONTENT_WIDTH_MM - startLayout.width);
      const y = clamp(startLayout.y + dyMm, 0, CONTENT_HEIGHT_MM - startLayout.height);
      setDraft({ ...startLayout, x, y });
    } else {
      const width = clamp(startLayout.width + dxMm, MIN_WIDTH_MM, CONTENT_WIDTH_MM - startLayout.x);
      const height = clamp(startLayout.height + dyMm, MIN_HEIGHT_MM, CONTENT_HEIGHT_MM - startLayout.y);
      setDraft({ ...startLayout, width, height });
    }
  }

  function handlePointerUp() {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    setDraft((finalDraft) => {
      if (finalDraft) onFieldChange("headerLayout", finalDraft);
      gestureRef.current = null;
      return null;
    });
  }

  function getPxPerMm(e: React.PointerEvent): number {
    // `.a4-editable-surface` has zero padding of its own, so its rendered
    // width equals the 176mm content area both this component's mm
    // coordinates and lib/buildCanvasPdf.ts's drawing use as their origin.
    const container = e.currentTarget.closest(".a4-editable-surface");
    return (container?.getBoundingClientRect().width || 1) / CONTENT_WIDTH_MM;
  }

  function onMoveHandlePointerDown(e: React.PointerEvent) {
    beginGesture(e, { kind: "move" }, getPxPerMm(e));
  }

  function onResizeHandlePointerDown(e: React.PointerEvent) {
    beginGesture(e, { kind: "resize" }, getPxPerMm(e));
  }

  return (
    <div
      className="header-layout-box"
      style={{
        position: "absolute",
        left: `${current.x}mm`,
        top: `${current.y}mm`,
        width: `${current.width}mm`,
        height: `${current.height}mm`,
      }}
    >
      <button
        type="button"
        className="header-layout-move-handle"
        onPointerDown={onMoveHandlePointerDown}
        aria-label="Drag to move header table"
        title="Drag to move"
      >
        <Move className="h-3 w-3" strokeWidth={2.5} />
      </button>

      <table className="record-header" style={{ height: "100%" }}>
        <tbody>
          <tr>
            <td className="record-meta">
              <div>
                <span className="label">EX NO :</span>{" "}
                <input
                  type="text"
                  className="record-header-input"
                  value={record.exercise_number}
                  onChange={(e) => onFieldChange("exercise_number", e.target.value)}
                  aria-label="Exercise number"
                />
              </div>
              <div className="record-meta-divider" />
              <div>
                <span className="label">DATE :</span>{" "}
                <input
                  type="date"
                  className="record-header-input"
                  value={record.date}
                  onChange={(e) => onFieldChange("date", e.target.value)}
                  aria-label="Date"
                />
              </div>
            </td>
            <td className="record-title">
              <input
                type="text"
                className="record-header-input record-header-input--title"
                value={record.title}
                onChange={(e) => onFieldChange("title", e.target.value)}
                aria-label="Experiment title"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className="header-layout-resize-handle"
        onPointerDown={onResizeHandlePointerDown}
        role="presentation"
        title="Drag to resize"
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
