"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_PAGE_BORDER,
  PAGE_BORDER_MAX_INSET_MM,
  PAGE_BORDER_MAX_RADIUS_MM,
  PAGE_BORDER_MAX_WIDTH,
  PAGE_BORDER_MIN_WIDTH,
  PAGE_BORDER_SIDES,
  pageBorderStyle,
  resolvePageBorder,
  type HeaderBorderStyle,
  type PageBorder,
  type PageBorderSide,
  type PageBorderSideName,
} from "@/lib/types";

interface PageBorderControlsProps {
  value: PageBorder | undefined;
  onChange: (next: PageBorder) => void;
  idPrefix: string;
}

type Target = "all" | PageBorderSideName;

const TARGETS: { id: Target; label: string }[] = [
  { id: "all", label: "All" },
  { id: "top", label: "Top" },
  { id: "right", label: "Right" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
];

const STYLES: { id: HeaderBorderStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "double", label: "Double" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
  { id: "none", label: "None" },
];

const SWATCHES = ["#111827", "#c2410c", "#1d4ed8", "#15803d", "#6b7280"];

const seg = (active: boolean) =>
  `rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors max-md:min-h-9 ${
    active ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
  }`;

/**
 * Per-side page border editor: pick All or one side, then set its style,
 * thickness, colour and distance from the page edge. A live A4 thumbnail
 * mirrors every change.
 */
export function PageBorderControls({ value, onChange, idPrefix }: PageBorderControlsProps) {
  const [target, setTarget] = useState<Target>("all");
  const pb = resolvePageBorder(value);
  const sides = target === "all" ? PAGE_BORDER_SIDES : [target];
  const shown: PageBorderSide = pb[sides[0]];
  const mixed = target === "all" && PAGE_BORDER_SIDES.some((s) => JSON.stringify(pb[s]) !== JSON.stringify(pb.top));
  const insetMixed = target === "all" && PAGE_BORDER_SIDES.some((s) => pb.inset[s] !== pb.inset.top);
  const off = shown.style === "none";

  function setSide(patch: Partial<PageBorderSide>) {
    const next: PageBorder = { ...pb };
    for (const s of sides) next[s] = { ...pb[s], ...patch };
    onChange(next);
  }

  function setInset(mmValue: number) {
    const inset = { ...pb.inset };
    for (const s of sides) inset[s] = mmValue;
    onChange({ ...pb, inset });
  }

  return (
    <div className="space-y-3.5">
      <div className="flex gap-4">
        {/* live thumbnail */}
        <div
          aria-hidden
          className="relative h-[118px] w-[84px] shrink-0 overflow-hidden rounded-sm border border-line bg-white shadow-sm"
        >
          <div
            className="absolute"
            style={{
              ...pageBorderStyle(pb),
              // Thumbnail is ~0.4x of 210mm wide: scale insets/radius, keep lines readable.
              top: `${pb.inset.top * 0.4}mm`,
              right: `${pb.inset.right * 0.4}mm`,
              bottom: `${pb.inset.bottom * 0.4}mm`,
              left: `${pb.inset.left * 0.4}mm`,
              borderRadius: `${pb.radius * 0.4}mm`,
            }}
          />
          <div className="absolute inset-x-5 top-6 space-y-1.5">
            <div className="h-1 rounded bg-ink/10" />
            <div className="h-1 w-3/4 rounded bg-ink/10" />
            <div className="h-1 w-1/2 rounded bg-ink/10" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Edit side</span>
          <div className="grid grid-cols-5 gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Border side">
            {TARGETS.map((t) => (
              <button key={t.id} type="button" aria-pressed={target === t.id} onClick={() => setTarget(t.id)} className={seg(target === t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-soft/70">
            {target === "all"
              ? mixed
                ? "Sides differ now. Changes here set all four."
                : "Changes apply to all four sides."
              : `Changes apply to the ${target} side only.`}
          </p>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold text-ink-soft">Line style</span>
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Line style">
          {STYLES.map((s) => (
            <button key={s.id} type="button" aria-pressed={shown.style === s.id} onClick={() => setSide({ style: s.id })} className={seg(!mixed && shown.style === s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-3 transition-opacity ${off ? "pointer-events-none opacity-40" : ""}`}>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <label htmlFor={`${idPrefix}-w`} className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
              Thickness <span className="font-mono font-medium">{shown.width}px</span>
            </label>
            <input
              id={`${idPrefix}-w`}
              type="range"
              min={PAGE_BORDER_MIN_WIDTH}
              max={PAGE_BORDER_MAX_WIDTH}
              step={0.5}
              value={shown.width}
              disabled={off}
              onChange={(e) => setSide({ width: Number(e.target.value) })}
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
              value={shown.color}
              disabled={off}
              onChange={(e) => setSide({ color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Border colour ${c}`}
              disabled={off}
              onClick={() => setSide({ color: c })}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                shown.color.toLowerCase() === c ? "border-accent ring-2 ring-accent/30" : "border-white shadow-[0_0_0_1px_#e5decb]"
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-i`} className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
          Distance from page edge
          <span className="font-mono font-medium">{insetMixed ? "mixed" : `${pb.inset[sides[0]]}mm`}</span>
        </label>
        <input
          id={`${idPrefix}-i`}
          type="range"
          min={0}
          max={PAGE_BORDER_MAX_INSET_MM}
          step={0.5}
          value={pb.inset[sides[0]]}
          onChange={(e) => setInset(Number(e.target.value))}
          className="w-full accent-[#c2410c]"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-r`} className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
          Corner radius <span className="font-mono font-medium">{pb.radius}mm</span>
        </label>
        <input
          id={`${idPrefix}-r`}
          type="range"
          min={0}
          max={PAGE_BORDER_MAX_RADIUS_MM}
          step={1}
          value={pb.radius}
          onChange={(e) => onChange({ ...pb, radius: Number(e.target.value) })}
          className="w-full accent-[#c2410c]"
        />
        <p className="mt-1 text-[11px] text-ink-soft/70">
          Word (.docx) can&apos;t round corners and caps the edge distance at about 11mm; the PDF follows exactly.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_PAGE_BORDER)}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
      >
        <RotateCcw className="h-3 w-3" strokeWidth={2.25} />
        Reset to default
      </button>
    </div>
  );
}
