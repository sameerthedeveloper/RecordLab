import { exportRecordPdf } from "./exportHtml2Pdf";
import type { CloudDocument } from "./firestoreService";
import { loadSettings } from "./settings";
import { DEFAULT_RECORD, DEFAULT_WATERMARK } from "./types";

/** Renders a cloud file to PDF exactly like the editor's Save PDF, without opening it. */
async function renderCloudDocumentPdf(document: CloudDocument, output: "save" | "blob") {
  const payload = document.data;
  if (!payload?.record) throw new Error("This file has no record to export.");
  const record = { ...DEFAULT_RECORD, ...payload.record };
  const watermark = { ...DEFAULT_WATERMARK, ...(payload.watermark ?? {}) };

  // Same naming as the editor: record-lab-<title>-<rrn>.pdf
  const part = (s: string) => s.replace(/[<>:"/\\|?*]+/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  let filename = "record-lab";
  if (record.title.trim()) filename += "-" + part(record.title);
  if (record.rrn.trim()) filename += "-" + part(record.rrn);

  const result = await exportRecordPdf(record, watermark, loadSettings().font, `${filename}.pdf`, output);
  return { blob: result instanceof Blob ? result : null, filename: `${filename}.pdf` };
}

/** Saves a cloud file as a PDF download. */
export async function downloadCloudDocumentPdf(document: CloudDocument): Promise<void> {
  await renderCloudDocumentPdf(document, "save");
}

/** Renders a cloud file to a PDF blob (no download). */
export async function cloudDocumentPdfBlob(document: CloudDocument): Promise<{ blob: Blob; filename: string }> {
  const { blob, filename } = await renderCloudDocumentPdf(document, "blob");
  if (!blob) throw new Error("Unable to create the PDF.");
  return { blob, filename };
}
