"use client";

import {
  HEADER_BORDER_MAX_WIDTH,
  HEADER_BORDER_MIN_WIDTH,
  headerBorderCssValue,
  resolveHeaderBorder,
  type HeaderBorderStyle,
  type HeaderLayout,
} from "@/lib/types";

interface HeaderBorderControlsProps {
  layout: HeaderLayout;
  onChange: (next: HeaderLayout) => void;
  idPrefix: string;
}

const STYLES: { id: HeaderBorderStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "double", label: "Double" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
  { id: "none", label: "None" },
];

const SWATCHES = ["#111827", "#c2410c", "#1d4ed8", "#15803d", "#6b7280"];

/** Style / thickness / colour of the title table's border, with a live swatch. */
export function HeaderBorderControls({ layout, onChange, idPrefix }: HeaderBorderControlsProps) {
  const b = resolveHeaderBorder(layout);
  const set = (patch: Partial<HeaderLayout>) => onChange({ ...layout, ...patch });
  const none = b.style === "none";

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-xs font-semibold text-ink-soft">Border style</span>
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Border style">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={b.style === s.id}
              onClick={() => set({ borderStyle: s.id })}
              className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors max-md:min-h-9 ${
                b.style === s.id ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-[1fr_auto] items-end gap-3 transition-opacity ${none ? "pointer-events-none opacity-40" : ""}`}>
        <div>
          <label htmlFor={`${idPrefix}-bw`} className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
            Thickness <span className="font-mono font-medium">{b.width}px</span>
          </label>
          <input
            id={`${idPrefix}-bw`}
            type="range"
            min={HEADER_BORDER_MIN_WIDTH}
            max={HEADER_BORDER_MAX_WIDTH}
            step={0.5}
            value={b.width}
            disabled={none}
            onChange={(e) => set({ borderWidth: Number(e.target.value) })}
            className="w-full accent-[#c2410c]"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-bc`} className="mb-1 block text-xs font-semibold text-ink-soft">
            Colour
          </label>
          <input
            id={`${idPrefix}-bc`}
            type="color"
            value={b.color}
            disabled={none}
            onChange={(e) => set({ borderColor: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
          />
        </div>
      </div>

      <div className={`flex items-center gap-1.5 ${none ? "pointer-events-none opacity-40" : ""}`}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Border colour ${c}`}
            disabled={none}
            onClick={() => set({ borderColor: c })}
            style={{ backgroundColor: c }}
            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
              b.color.toLowerCase() === c ? "border-accent ring-2 ring-accent/30" : "border-white shadow-[0_0_0_1px_#e5decb]"
            }`}
          />
        ))}
        <div
          aria-hidden
          className="ml-auto grid h-9 w-24 grid-cols-[30%_1fr] bg-white text-[8px] font-bold text-ink-soft/70"
          style={{ border: headerBorderCssValue(layout) }}
        >
          <span className="flex items-center justify-center" style={{ borderRight: headerBorderCssValue(layout) }}>
            EX
          </span>
          <span className="flex items-center justify-center">TITLE</span>
        </div>
      </div>
    </div>
  );
}
