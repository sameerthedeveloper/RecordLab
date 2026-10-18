"use client";

import { useRef, useState } from "react";
import { Frame, LayoutTemplate, Rows3, Stamp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RecordFormatPicker } from "./RecordFormatPicker";
import { PageBorderControls } from "./PageBorderControls";
import { describeHeaderBorders, HeaderBorderControls } from "./HeaderBorderControls";
import { WatermarkControls } from "./WatermarkOptionsSection";
import { collegeGeometry } from "@/lib/recordFormat";
import { resolvePageBorder, type RecordFormat, type RecordState, type WatermarkOptions } from "@/lib/types";

interface SheetSetupProps {
  record: RecordState;
  watermark: WatermarkOptions;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
  onFormatChange: (format: RecordFormat) => void;
  onWatermarkChange: (next: WatermarkOptions) => void;
}

type TabId = "format" | "heading" | "border" | "watermark";

/** One-line state of the page border: "Solid 1px · 8mm", or "Custom" once the sides differ. */
function describeBorder(record: RecordState): string {
  const b = resolvePageBorder(record.pageBorder);
  const sides = [b.top, b.right, b.bottom, b.left];
  if (sides.every((s) => s.style === "none")) return "None";
  const same = sides.every((s) => s.style === sides[0].style && s.width === sides[0].width && s.color === sides[0].color);
  const insets = [b.inset.top, b.inset.right, b.inset.bottom, b.inset.left];
  const sameInset = insets.every((i) => i === insets[0]);
  if (!same || !sameInset) return "Custom";
  const style = sides[0].style[0].toUpperCase() + sides[0].style.slice(1);
  return `${style} ${sides[0].width}px · ${insets[0]}mm`;
}

/**
 * Everything that shapes the printed sheet rather than its words, in one card: sheet format,
 * heading table, page border and watermark. One panel at a time, each tab showing its current
 * setting so the whole setup can be read at a glance without opening anything.
 */
export function SheetSetup({ record, watermark, onFieldChange, onFormatChange, onWatermarkChange }: SheetSetupProps) {
  const [tab, setTab] = useState<TabId>("format");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabs: { id: TabId; label: string; value: string; Icon: LucideIcon; anchor?: string }[] = [
    { id: "format", label: "Format", value: record.format === "college" ? "College sheet" : "Standard", Icon: LayoutTemplate, anchor: "record-format" },
    { id: "heading", label: "Heading", value: `Borders: ${describeHeaderBorders(record.headerLayout)}`, Icon: Rows3 },
    { id: "border", label: "Border", value: describeBorder(record), Icon: Frame, anchor: "page-border" },
    { id: "watermark", label: "Watermark", value: record.rrn.trim() ? `${watermark.size}px · ${watermark.opacity}%` : "No RRN yet", Icon: Stamp },
  ];

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  }

  return (
    <section id="sheet-setup" aria-labelledby="sheet-setup-heading" className="ui-card p-5">
      <div className="mb-3.5">
        <h2 id="sheet-setup-heading" className="font-serif text-[17px] font-bold tracking-tight text-ink">
          Sheet setup
        </h2>
        <p className="mt-0.5 text-xs text-ink-soft/80">How the page looks when printed. Applies to this record.</p>
      </div>

      <div role="tablist" aria-label="Sheet setup" className="grid grid-cols-2 gap-2">
        {tabs.map((t, i) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`setup-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`setup-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              data-onboarding={t.anchor}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex min-w-0 flex-col items-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent max-md:min-h-14 ${
                on ? "border-accent/50 bg-accent-soft text-accent-ink" : "border-line bg-white text-ink-soft hover:border-accent/30"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <t.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                {t.label}
              </span>
              <span className={`w-full truncate text-[11px] ${on ? "text-accent-ink/80" : "text-ink-soft/65"}`}>{t.value}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`setup-panel-${tab}`}
        aria-labelledby={`setup-tab-${tab}`}
        tabIndex={0}
        className="mt-4 outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {tab === "format" && (
          <div>
            <RecordFormatPicker value={record.format ?? "standard"} onChange={onFormatChange} />
            <p className="mt-2 text-xs text-ink-soft/70">
              College sheet puts EX / DATE and the title in a block that runs edge to edge across the top of page 1, like a printed lab sheet.
            </p>
          </div>
        )}
        {tab === "heading" && (
          <HeaderBorderControls
            idPrefix="record"
            format={record.format}
            layout={record.headerLayout}
            onChange={(next) => onFieldChange("headerLayout", next)}
          />
        )}
        {tab === "border" && (
          <PageBorderControls
            idPrefix="record-page-border"
            value={record.pageBorder}
            onChange={(next) => {
              onFieldChange("pageBorder", next);
              // The college heading block hugs the border: move it with it.
              if (record.format === "college") onFieldChange("headerLayout", { ...record.headerLayout, ...collegeGeometry(next) });
            }}
          />
        )}
        {tab === "watermark" && <WatermarkControls watermark={watermark} onChange={onWatermarkChange} rrn={record.rrn} />}
      </div>
    </section>
  );
}
