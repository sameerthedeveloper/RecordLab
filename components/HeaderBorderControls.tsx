"use client";

import { useState } from "react";
import {
  HEADER_BORDER_MAX_WIDTH,
  HEADER_BORDER_MIN_WIDTH,
  HEADER_LINE_NAMES,
  headerLineCss,
  resolveHeaderBorders,
  type HeaderBorders,
  type HeaderBorderStyle,
  type HeaderLayout,
  type HeaderLine,
  type HeaderLineName,
} from "@/lib/types";

interface HeaderBorderControlsProps {
  layout: HeaderLayout;
  onChange: (next: HeaderLayout) => void;
  idPrefix: string;
}

const OUTER: HeaderLineName[] = ["top", "bottom", "left", "right"];
const INNER: HeaderLineName[] = ["insideH", "insideV"];

const LINE_LABEL: Record<HeaderLineName, string> = {
  top: "Top border",
  bottom: "Bottom border",
  left: "Left border",
  right: "Right border",
  insideH: "Inside horizontal border",
  insideV: "Inside vertical border",
};

const PEN_STYLES: { id: Exclude<HeaderBorderStyle, "none">; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "double", label: "Double" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];

const SWATCHES = ["#111827", "#c2410c", "#1d4ed8", "#15803d", "#6b7280"];

const OFF: HeaderLine = { style: "none", width: 1, color: "#111827" };

const isOn = (l: HeaderLine) => l.style !== "none";
const sameLine = (a: HeaderLine, b: HeaderLine) => a.style === b.style && a.width === b.width && a.color.toLowerCase() === b.color.toLowerCase();

/** "None", "Box" (outer edges only), "All" (outer + inside) or "Custom": Word's border presets. */
export function describeHeaderBorders(layout: Partial<HeaderLayout> | undefined): "None" | "Box" | "All" | "Custom" {
  const b = resolveHeaderBorders(layout);
  const outerOn = OUTER.every((n) => isOn(b[n]));
  const innerOn = INNER.every((n) => isOn(b[n]));
  const outerOff = OUTER.every((n) => !isOn(b[n]));
  const innerOff = INNER.every((n) => !isOn(b[n]));
  if (outerOff && innerOff) return "None";
  if (outerOn && innerOff) return "Box";
  if (outerOn && innerOn) return "All";
  return "Custom";
}

const seg = (active: boolean) =>
  `rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors max-md:min-h-9 ${
    active ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
  }`;

/**
 * Word-style table borders for the title table. Set the "pen" (style, thickness,
 * colour), then click an edge on the diagram, or a preset, to draw or erase it with that pen.
 */
export function HeaderBorderControls({ layout, onChange, idPrefix }: HeaderBorderControlsProps) {
  const borders = resolveHeaderBorders(layout);
  const firstOn = HEADER_LINE_NAMES.map((n) => borders[n]).find(isOn);
  const [pen, setPen] = useState<{ style: Exclude<HeaderBorderStyle, "none">; width: number; color: string }>({
    style: (firstOn?.style as Exclude<HeaderBorderStyle, "none">) ?? "solid",
    width: firstOn?.width ?? 1,
    color: firstOn?.color ?? "#111827",
  });
  const penLine: HeaderLine = {
    ...pen,
    width: pen.style === "double" ? Math.max(3, pen.width) : pen.width,
  };
  const preset = describeHeaderBorders(layout);

  function commit(next: HeaderBorders) {
    onChange({ ...layout, borders: next });
  }

  function toggle(name: HeaderLineName) {
    const cur = borders[name];
    commit({ ...borders, [name]: isOn(cur) && sameLine(cur, penLine) ? OFF : penLine });
  }

  function applyPreset(kind: "None" | "Box" | "All") {
    const next = { ...borders };
    for (const n of HEADER_LINE_NAMES) {
      const on = kind === "All" || (kind === "Box" && OUTER.includes(n));
      next[n] = on ? penLine : OFF;
    }
    commit(next);
  }

  function restyleAll() {
    const next = { ...borders };
    for (const n of HEADER_LINE_NAMES) if (isOn(borders[n])) next[n] = penLine;
    commit(next);
  }

  // Diagram geometry: a 28% / 72% two-cell table, left cell split in half horizontally.
  const edge = (name: HeaderLineName): React.CSSProperties => ({
    borderTop: isOn(borders[name]) ? headerLineCss({ ...borders[name], width: Math.min(4, borders[name].width) }) : "1px dashed #d9d2bf",
  });
  const vEdge = (name: HeaderLineName): React.CSSProperties => ({
    borderLeft: isOn(borders[name]) ? headerLineCss({ ...borders[name], width: Math.min(4, borders[name].width) }) : "1px dashed #d9d2bf",
  });
  const hit =
    "absolute z-10 cursor-pointer rounded-sm outline-none transition-colors hover:bg-accent/15 focus-visible:bg-accent/25 focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-start gap-4">
        {/* diagram */}
        <div className="shrink-0">
          <div className="relative h-[104px] w-[196px] rounded-lg border border-line bg-[#fdfcf8] p-5 shadow-inner">
            <div className="relative h-full w-full">
              <div aria-hidden className="absolute inset-0 grid grid-cols-[28%_1fr] text-[8px] font-bold tracking-wide text-ink-soft/40">
                <div className="grid grid-rows-2">
                  <span className="flex items-center justify-center">EX NO</span>
                  <span className="flex items-center justify-center">DATE</span>
                </div>
                <span className="flex items-center justify-center text-[9px]">TITLE</span>
              </div>

              {/* drawn lines */}
              <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-0" style={edge("top")} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0" style={edge("bottom")} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-0" style={vEdge("left")} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 top-0" style={vEdge("right")} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-[28%] top-0" style={vEdge("insideV")} />
              <div aria-hidden className="pointer-events-none absolute left-0 top-1/2 w-[28%]" style={edge("insideH")} />

              {/* hit zones */}
              <button type="button" aria-label={LINE_LABEL.top} aria-pressed={isOn(borders.top)} onClick={() => toggle("top")} className={`${hit} -top-2.5 left-0 right-0 h-5`} />
              <button type="button" aria-label={LINE_LABEL.bottom} aria-pressed={isOn(borders.bottom)} onClick={() => toggle("bottom")} className={`${hit} -bottom-2.5 left-0 right-0 h-5`} />
              <button type="button" aria-label={LINE_LABEL.left} aria-pressed={isOn(borders.left)} onClick={() => toggle("left")} className={`${hit} -left-2.5 bottom-0 top-0 w-5`} />
              <button type="button" aria-label={LINE_LABEL.right} aria-pressed={isOn(borders.right)} onClick={() => toggle("right")} className={`${hit} -right-2.5 bottom-0 top-0 w-5`} />
              <button type="button" aria-label={LINE_LABEL.insideV} aria-pressed={isOn(borders.insideV)} onClick={() => toggle("insideV")} className={`${hit} bottom-0 left-[28%] top-0 w-5 -translate-x-1/2`} />
              <button type="button" aria-label={LINE_LABEL.insideH} aria-pressed={isOn(borders.insideH)} onClick={() => toggle("insideH")} className={`${hit} left-0 top-1/2 h-5 w-[28%] -translate-y-1/2`} />
            </div>
          </div>
          <p className="mt-1.5 w-[196px] text-[11px] leading-snug text-ink-soft/70">Click an edge to draw or erase it with the pen.</p>
        </div>

        {/* presets */}
        <div className="min-w-[150px] flex-1">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Setting</span>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Border presets">
            {(["None", "Box", "All"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={preset === k} onClick={() => applyPreset(k)} className={seg(preset === k)}>
                {k}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-soft/70">
            {preset === "Custom" ? "Custom: edges set one by one." : preset === "None" ? "No lines around the table." : preset === "Box" ? "Outer box only." : "Box plus the two inside dividers."}
          </p>
          <button
            type="button"
            onClick={restyleAll}
            className="mt-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
          >
            Apply pen to all lines
          </button>
        </div>
      </div>

      {/* pen */}
      <div className="rounded-xl border border-line bg-paper/60 p-3">
        <span className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent">Pen</span>
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-white p-1" role="group" aria-label="Line style">
          {PEN_STYLES.map((s) => (
            <button key={s.id} type="button" aria-pressed={pen.style === s.id} onClick={() => setPen({ ...pen, style: s.id })} className={seg(pen.style === s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <label htmlFor={`${idPrefix}-w`} className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
              Thickness <span className="font-mono font-medium">{penLine.width}px</span>
            </label>
            <input
              id={`${idPrefix}-w`}
              type="range"
              min={HEADER_BORDER_MIN_WIDTH}
              max={HEADER_BORDER_MAX_WIDTH}
              step={0.5}
              value={pen.width}
              onChange={(e) => setPen({ ...pen, width: Number(e.target.value) })}
              className="w-full accent-[#c2410c]"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-c`} className="mb-1 block text-xs font-semibold text-ink-soft">
              Colour
            </label>
            <input
              id={`${idPrefix}-c`}
              type="color"
              value={pen.color}
              onChange={(e) => setPen({ ...pen, color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Pen colour ${c}`}
              onClick={() => setPen({ ...pen, color: c })}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                pen.color.toLowerCase() === c ? "border-accent ring-2 ring-accent/30" : "border-white shadow-[0_0_0_1px_#e5decb]"
              }`}
            />
          ))}
          <span
            aria-hidden
            className="ml-auto h-0 w-20"
            style={{ borderTop: headerLineCss(penLine) }}
            title="Pen preview"
          />
        </div>
      </div>
    </div>
  );
}
