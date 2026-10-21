"use client";

import { useEffect, useRef, useState } from "react";
import { A4Page } from "@/components/A4Page";
import { usePaginatedPages } from "@/lib/usePaginatedPages";
import type { RlabPayload } from "@/lib/firestoreService";

const PAGE_PX = 794; // 210mm at 96dpi

/** A student's record exactly as they would print it, scaled to fit the pane. Read-only. */
export function RecordViewer({ payload }: { payload: RlabPayload }) {
  const record = payload.record;
  const pages = usePaginatedPages(record);
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.3, (el.clientWidth - 16) / PAGE_PX)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="rounded-lg bg-[var(--preview-bg)]">
      <div className="preview-pages !px-2 !py-4" style={{ "--page-zoom": zoom } as React.CSSProperties}>
        {pages.length === 0 ? (
          <p className="py-16 text-sm text-ink-soft">Laying out the pages…</p>
        ) : (
          pages.map((page, i) => (
            <div className="preview-page-group" key={i}>
              <A4Page page={page} rrn={record.rrn} watermark={payload.watermark} format={record.format} pageBorder={record.pageBorder} />
              <span className="preview-page-caption">
                PAGE {i + 1} / {pages.length}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
