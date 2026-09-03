"use client";

import { AccordionSection } from "./AccordionSection";
import type { WatermarkOptions } from "@/lib/types";

interface WatermarkOptionsSectionProps {
  watermark: WatermarkOptions;
  onChange: (next: WatermarkOptions) => void;
}

const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "Verdana, sans-serif", label: "Verdana" },
];

export function WatermarkOptionsSection({ watermark, onChange }: WatermarkOptionsSectionProps) {
  const inputClass =
    "w-full rounded-xl border border-line p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all";
  const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

  return (
    <AccordionSection title="WATERMARK OPTIONS">
      <div className="space-y-3">
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
    </AccordionSection>
  );
}
