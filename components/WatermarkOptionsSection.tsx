"use client";

import { AccordionSection } from "./AccordionSection";
import { FONT_OPTIONS } from "@/lib/fonts";
import type { WatermarkOptions } from "@/lib/types";

interface WatermarkOptionsSectionProps {
  watermark: WatermarkOptions;
  onChange: (next: WatermarkOptions) => void;
}

/** The watermark controls on their own (no accordion), with a live sample of how the RRN will look on the page. */
export function WatermarkControls({ watermark, onChange, rrn }: WatermarkOptionsSectionProps & { rrn?: string }) {
  const inputClass =
    "w-full rounded-xl border border-line p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all";
  const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

  const sample = (rrn || "").trim() || "24007160106";
  // Scale the on-page size (px at 96dpi on a 794px-wide A4) down to the 120px-wide sample sheet.
  const scale = 120 / 794;

  return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/60 p-3">
          <div aria-hidden className="relative h-[170px] w-[120px] shrink-0 overflow-hidden rounded-[3px] border border-line bg-white shadow-sm">
            <div className="absolute inset-[6px] border border-ink/30" />
            <span
              className="absolute left-1/2 top-1/2 whitespace-nowrap font-bold leading-none"
              style={{
                fontFamily: watermark.font,
                fontSize: `${Math.max(6, watermark.size * scale)}px`,
                transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
                opacity: Math.min(1, (watermark.opacity / 100) * 1.6),
                color: watermark.color,
              }}
            >
              {sample}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-ink-soft/80">
            Your register number is printed faintly across every page. This is how it will sit on the sheet.
          </p>
        </div>

        <div>
          <label htmlFor="watermarkFontInput" className={labelClass}>
            Font Family
          </label>
          <select
            id="watermarkFontInput"
            className={`${inputClass} bg-white`}
            value={watermark.font}
            onChange={(e) => onChange({ ...watermark, font: e.target.value })}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="watermarkSizeInput" className={labelClass}>
              Size (px)
            </label>
            <input
              id="watermarkSizeInput"
              type="number"
              min={20}
              max={200}
              value={watermark.size}
              onChange={(e) => onChange({ ...watermark, size: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="watermarkRotationInput" className={labelClass}>
              Rotation (°)
            </label>
            <input
              id="watermarkRotationInput"
              type="number"
              min={-180}
              max={180}
              value={watermark.rotation}
              onChange={(e) => onChange({ ...watermark, rotation: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="watermarkOpacityInput" className="text-xs font-semibold text-ink-soft">
                Opacity
              </label>
              <span className="font-mono text-xs text-ink-soft/80">{watermark.opacity}%</span>
            </div>
            <input
              id="watermarkOpacityInput"
              type="range"
              min={1}
              max={50}
              value={watermark.opacity}
              onChange={(e) => onChange({ ...watermark, opacity: Number(e.target.value) })}
              className="w-full mt-2 cursor-pointer accent-accent"
            />
          </div>

          <div>
            <label htmlFor="watermarkColorInput" className={labelClass}>
              Color
            </label>
            <input
              id="watermarkColorInput"
              type="color"
              value={watermark.color}
              onChange={(e) => onChange({ ...watermark, color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-xl border border-line bg-white p-1"
            />
          </div>
        </div>
      </div>
  );
}

export function WatermarkOptionsSection({ watermark, onChange }: WatermarkOptionsSectionProps) {
  return (
    <AccordionSection title="WATERMARK OPTIONS">
      <WatermarkControls watermark={watermark} onChange={onChange} />
    </AccordionSection>
  );
}
