"use client";

import { FileDown, Loader2, Printer } from "lucide-react";
import { A4Page } from "./A4Page";
import type { PageObject, WatermarkOptions } from "@/lib/types";

interface PreviewPanelProps {
  pages: PageObject[];
  rrn: string;
  watermark: WatermarkOptions;
  onSavePdf: () => void;
  onPrint: () => void;
  isSavingPdf: boolean;
  visible: boolean;
}

export function PreviewPanel({ pages, rrn, watermark, onSavePdf, onPrint, isSavingPdf, visible }: PreviewPanelProps) {
  return (
    <div
      id="previewPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-white shadow-sm overflow-hidden`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line p-4 bg-white">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Live"}
          </p>
          <h2 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Preview</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSavePdf}
            disabled={isSavingPdf}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:bg-accent-ink disabled:opacity-60"
          >
            {isSavingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> : <FileDown className="h-3.5 w-3.5" strokeWidth={2.5} />}
            <span>{isSavingPdf ? "Generating..." : "Save PDF"}</span>
          </button>

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
          {pages.map((page, idx) => (
            <div className="preview-page-group" key={idx}>
              <A4Page page={page} rrn={rrn} watermark={watermark} />
              <span className="preview-page-caption">
                PAGE {String(idx + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
