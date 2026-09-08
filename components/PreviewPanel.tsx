"use client";

import dynamic from "next/dynamic";
import { FileDown, Loader2, Printer } from "lucide-react";
import { A4Page } from "./A4Page";
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
  onPrint: () => void;
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
  onPrint,
  isSaving,
  downloadFormat,
  onDownloadFormatChange,
  pdfEngine,
  onPdfEngineChange,
  visible,
}: PreviewPanelProps) {
  const isCanvasEditMode = downloadFormat === "pdf" && pdfEngine === "canvas2pdf";
  return (
    <div
      id="previewPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-white shadow-sm overflow-hidden`}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line p-4 bg-white">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Live"}
          </p>
          <h2 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Preview</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-1.5 bg-accent px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-hover active:bg-accent-ink disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> : <FileDown className="h-3.5 w-3.5" strokeWidth={2.5} />}
              <span>{isSaving ? "Generating..." : `Save ${FORMAT_LABELS[downloadFormat]}`}</span>
            </button>
            <label className="sr-only" htmlFor="downloadFormatSelect">
              Download format
            </label>
            <select
              id="downloadFormatSelect"
              value={downloadFormat}
              onChange={(e) => onDownloadFormatChange(e.target.value as DownloadFormat)}
              disabled={isSaving}
              className="h-full border-l border-line bg-white px-2 py-2 text-xs font-semibold text-ink-soft outline-none transition-colors hover:text-accent-ink disabled:opacity-60"
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onPrint}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft shadow-sm transition-all hover:border-accent/40 hover:text-accent-ink active:bg-accent-soft"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="preview-area min-h-0 flex-1">
        <div id="previewPages" className="preview-pages">
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
