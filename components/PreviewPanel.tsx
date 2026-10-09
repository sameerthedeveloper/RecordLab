"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";
import { A4Page } from "./A4Page";
import { AccountMenu } from "./AccountMenu";
import type { DownloadFormat, PageObject, PdfEngine, RecordState, WatermarkOptions } from "@/lib/types";

// Tiptap (react + core + starter-kit) adds ~130KB — load it only once
// canvas2pdf mode is actually selected, not on every page visit.
const CanvasEditPreview = dynamic(() => import("./CanvasEditPreview").then((m) => m.CanvasEditPreview), {
  ssr: false,
});

interface PreviewPanelProps {
  record: RecordState;
  pages: PageObject[];
  rrn: string;
  watermark: WatermarkOptions;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
  onSave: () => void;
  onToast: (message: string) => void;
  docFont: string;
  isSaving: boolean;
  downloadFormat: DownloadFormat;
  onDownloadFormatChange: (format: DownloadFormat) => void;
  pdfEngine: PdfEngine;
  onPdfEngineChange: (engine: PdfEngine) => void;
  visible: boolean;
}

const FORMAT_LABELS: Record<DownloadFormat, string> = {
  pdf: "PDF",
  docx: "DOCX",
};

export function PreviewPanel({
  record,
  pages,
  rrn,
  watermark,
  onFieldChange,
  onSave,
  onToast,
  docFont,
  isSaving,
  downloadFormat,
  onDownloadFormatChange,
  pdfEngine,
  onPdfEngineChange,
  visible,
}: PreviewPanelProps) {
  const isCanvasEditMode = downloadFormat === "pdf" && pdfEngine === "canvas2pdf";
  const areaRef = useRef<HTMLDivElement>(null);

  // On phones the A4 page (210mm ≈ 794px) is scaled to the panel's width so a
  // full page always fits and is as large as it can be. CSS reads --page-zoom.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const A4_PX = 793.7;
    const fit = () => {
      const zoom = Math.min(1, Math.max(0.3, (area.clientWidth - 28) / A4_PX));
      area.style.setProperty("--page-zoom", zoom.toFixed(3));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      id="previewPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col ui-panel overflow-hidden`}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 ui-panel-header p-4">
        <div data-onboarding="preview-heading">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Live"}
          </p>
          <h2 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Preview</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="ui-seg flex items-stretch overflow-hidden">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              data-onboarding="save-button"
              className="ui-primary !rounded-none !shadow-none active:!scale-100 flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] max-md:min-h-11 max-md:text-sm font-semibold disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
              ) : (
                <FileDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              <span>{isSaving ? "Generating..." : `Save ${FORMAT_LABELS[downloadFormat]}`}</span>
            </button>
            <label className="sr-only" htmlFor="downloadFormatSelect">
              Download format
            </label>
            <div className="relative flex border-l border-black/[0.06] bg-white">
              <select
                id="downloadFormatSelect"
                value={downloadFormat}
                onChange={(e) => onDownloadFormatChange(e.target.value as DownloadFormat)}
                disabled={isSaving}
                className="h-full cursor-pointer appearance-none bg-transparent py-2.5 pl-4 pr-9 text-[13px] max-md:min-h-11 max-md:text-sm font-semibold text-ink-soft outline-none transition-colors hover:text-accent-ink focus-visible:text-accent-ink disabled:cursor-default disabled:opacity-60"
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/70"
                strokeWidth={2.25}
              />
            </div>
          </div>

          <AccountMenu onToast={onToast} />
        </div>
      </div>

      <div ref={areaRef} className="preview-area min-h-0 flex-1">
        <div
          id="previewPages"
          className="preview-pages"
          style={{ "--doc-font": docFont } as React.CSSProperties}
        >
          {isCanvasEditMode ? (
            <div className="preview-page-group">
              <CanvasEditPreview record={record} watermark={watermark} onFieldChange={onFieldChange} />
              <span className="preview-page-caption">EDITABLE — CANVAS2PDF</span>
            </div>
          ) : (
            pages.map((page, idx) => (
              <div className="preview-page-group" key={idx}>
                <A4Page page={page} rrn={rrn} watermark={watermark} />
                <span className="preview-page-caption">
                  PAGE {String(idx + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
