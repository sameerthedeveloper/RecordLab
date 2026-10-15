import type { CloudDocument } from "./firestoreService";
import { loadSettings } from "./settings";
import { DEFAULT_RECORD, DEFAULT_WATERMARK } from "./types";

/** Renders a saved cloud file to a PDF (vector engine, no editor needed) and downloads it. */
export async function downloadCloudDocumentPdf(document: CloudDocument): Promise<void> {
  const payload = document.data;
  if (!payload?.record) throw new Error("This file has no record to export.");
  const record = { ...DEFAULT_RECORD, ...payload.record };
  const watermark = { ...DEFAULT_WATERMARK, ...(payload.watermark ?? {}) };
  const { buildCanvasPdf } = await import("./buildCanvasPdf");
  const blob = await buildCanvasPdf(record, watermark, loadSettings().font);

  const slug = (document.title || record.title || "record").replace(/[<>:"/\\|?*]+/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `${slug || "record"}.pdf`;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
