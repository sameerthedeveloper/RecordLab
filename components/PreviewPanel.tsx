"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronLeft, ChevronRight, FileDown, Loader2, Maximize2, Minus, Plus, Share2 } from "lucide-react";
import { A4Page } from "./A4Page";
import { AccountMenu } from "./AccountMenu";
import { AdSlot } from "./AdSlot";
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
  onShare: () => void;
  isSharing: boolean;
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
  onShare,
  isSharing,
}: PreviewPanelProps) {
  const isCanvasEditMode = downloadFormat === "pdf" && pdfEngine === "canvas2pdf";
  const areaRef = useRef<HTMLDivElement>(null);

  // Zoom: "fit" scales the A4 page to the panel's width (any screen), or a fixed level the person picked.
  const A4_PX = 793.7;
  const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5];
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [fitZoom, setFitZoom] = useState(1);
  const [current, setCurrent] = useState(0);
  const zoom = zoomMode === "fit" ? fitZoom : zoomMode;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("recordlab.previewZoom");
      if (saved === "fit") setZoomMode("fit");
      else if (saved && Number.isFinite(Number(saved))) setZoomMode(Math.min(1.5, Math.max(0.3, Number(saved))));
    } catch {}
  }, []);

  function chooseZoom(next: "fit" | number) {
    setZoomMode(next);
    try {
      localStorage.setItem("recordlab.previewZoom", String(next));
    } catch {}
  }

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const fit = () => setFitZoom(Math.min(1.25, Math.max(0.3, (area.clientWidth - 40) / A4_PX)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    areaRef.current?.style.setProperty("--page-zoom", zoom.toFixed(3));
  }, [zoom]);

  // Which page is in the middle of the view, for the "Page 2 / 3" indicator.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = area.getBoundingClientRect().top + area.clientHeight / 2;
        const groups = Array.from(area.querySelectorAll<HTMLElement>(".preview-page-group"));
        let best = 0;
        let bestDist = Infinity;
        groups.forEach((g, i) => {
          const r = g.getBoundingClientRect();
          const d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setCurrent(best);
      });
    };
    area.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      area.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pages.length, zoom]);

  function goToPage(i: number) {
    const groups = areaRef.current?.querySelectorAll<HTMLElement>(".preview-page-group");
    const g = groups?.[Math.min(Math.max(0, i), (groups?.length ?? 1) - 1)];
    g?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function stepZoom(dir: 1 | -1) {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    const base = dir > 0 ? ZOOM_STEPS.find((z) => z > zoom + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001);
    void idx;
    if (base) chooseZoom(base);
  }

  const pageCount = isCanvasEditMode ? 1 : pages.length;
  const toolBtn =
    "flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 hover:text-accent disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-soft max-md:h-10 max-md:w-10";

  return (
    <div
      id="previewPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col ui-panel overflow-hidden`}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 ui-panel-header p-4">
        <div data-onboarding="preview-heading" className="order-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Live"}
          </p>
          <h2 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Preview</h2>
        </div>

        {/* Phones: account sits beside the title, the actions get their own full-width row. */}
        {/* Ad space in the header's empty stretches: only on screens wide enough that nothing is squeezed. */}
        <div className="hidden min-w-0 flex-1 justify-center md:order-2 min-[1750px]:flex">
          <AdSlot shape="small" name="Preview header, left" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER_LEFT} />
        </div>
        <div className="hidden min-w-0 flex-1 justify-center md:order-4 min-[1450px]:flex">
          <AdSlot shape="small" name="Preview header, right" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER_RIGHT} />
        </div>

        <div className="order-2 min-w-0 md:order-5">
          <AccountMenu onToast={onToast} />
        </div>

        <div className="order-3 flex w-full items-center gap-2 md:order-3 md:w-auto">
          <div className="ui-seg flex min-w-0 flex-1 items-stretch overflow-hidden md:flex-none">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              data-onboarding="save-button"
              className="ui-primary !rounded-none !shadow-none active:!scale-100 flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 text-[13px] max-md:min-h-11 max-md:text-sm font-semibold disabled:opacity-60"
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

          <button
            type="button"
            onClick={() => onShare()}
            disabled={isSharing}
            aria-label="Share link"
            data-onboarding="share"
            title="Share link"
            className="ui-icon-btn flex shrink-0 items-center justify-center max-md:h-11 max-md:w-11 max-md:p-0 disabled:opacity-60"
          >
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" strokeWidth={2.25} />}
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
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
                <A4Page page={page} rrn={rrn} watermark={watermark} format={record.format} pageBorder={record.pageBorder} />
                <span className="preview-page-caption">
                  PAGE {String(idx + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
                </span>
              </div>
            ))
          )}
          {/* After the last page, outside the document: never between pages, never in print or an export. */}
          <AdSlot name="Preview, below the pages" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_PREVIEW} className="!max-w-[794px] opacity-90" />
        </div>
      </div>

      {/* floating view controls: zoom and page navigation */}
      <div
        role="toolbar"
        aria-label="Preview controls"
        className="liquid-glass pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 max-md:bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] items-center gap-0.5 rounded-full p-1"
      >
        <button type="button" aria-label="Previous page" title="Previous page" disabled={current <= 0 || pageCount < 2} onClick={() => goToPage(current - 1)} className={toolBtn}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <span className="min-w-[4.5rem] select-none px-1 text-center font-mono text-[11px] font-semibold text-ink-soft" aria-live="polite">
          {Math.min(current + 1, pageCount)} / {pageCount}
        </span>
        <button type="button" aria-label="Next page" title="Next page" disabled={current >= pageCount - 1} onClick={() => goToPage(current + 1)} className={toolBtn}>
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <span aria-hidden className="mx-1 h-5 w-px bg-ink/15" />
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => stepZoom(-1)} className={toolBtn}>
          <Minus className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => chooseZoom(zoomMode === "fit" ? 1 : "fit")}
          title={zoomMode === "fit" ? "Fit to width (click for 100%)" : "Click to fit to width"}
          className="min-w-[3.25rem] rounded-full px-1.5 py-1.5 text-center font-mono text-[11px] font-semibold text-ink-soft transition-colors hover:bg-ink/10 hover:text-accent"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => stepZoom(1)} className={toolBtn}>
          <Plus className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button type="button" aria-label="Fit to width" title="Fit to width" aria-pressed={zoomMode === "fit"} onClick={() => chooseZoom("fit")} className={`${toolBtn} ${zoomMode === "fit" ? "!text-accent" : ""}`}>
          <Maximize2 className="h-4 w-4" strokeWidth={2.1} />
        </button>
      </div>
      </div>
    </div>
  );
}
