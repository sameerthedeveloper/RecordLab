import { exportRecordPdf } from "./exportHtml2Pdf";
import type { CloudDocument } from "./firestoreService";
import { loadSettings } from "./settings";
import { DEFAULT_RECORD, DEFAULT_WATERMARK } from "./types";

/** Saves a cloud file as a PDF, rendered exactly like the editor's Save PDF, without opening it. */
export async function downloadCloudDocumentPdf(document: CloudDocument): Promise<void> {
  const payload = document.data;
  if (!payload?.record) throw new Error("This file has no record to export.");
  const record = { ...DEFAULT_RECORD, ...payload.record };
  const watermark = { ...DEFAULT_WATERMARK, ...(payload.watermark ?? {}) };

  // Same naming as the editor: record-lab-<title>-<rrn>.pdf
  const part = (s: string) => s.replace(/[<>:"/\\|?*]+/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  let filename = "record-lab";
  if (record.title.trim()) filename += "-" + part(record.title);
  if (record.rrn.trim()) filename += "-" + part(record.rrn);

  await exportRecordPdf(record, watermark, loadSettings().font, `${filename}.pdf`);
}
