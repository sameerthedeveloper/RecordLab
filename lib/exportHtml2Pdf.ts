import { buildPrintDocumentHTML } from "./buildPrintHtml";
import { paginateRecord } from "./paginate";
import type { RecordState, WatermarkOptions } from "./types";

/** Waits for the html2pdf.js script (loaded from layout.tsx) to be ready. */
async function waitForHtml2Pdf(timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (!window.html2pdf) {
    if (Date.now() - start > timeoutMs) throw new Error("PDF engine failed to load.");
    await new Promise((r) => window.setTimeout(r, 100));
  }
}

/**
 * The editor's default "Save PDF": paginates the record, renders it in an off-screen frame and
 * rasterises it with html2pdf.js, so the file matches the on-screen preview exactly. Used by the
 * file explorer, which has no editor (and no preview) to take the pages from.
 */
export async function exportRecordPdf(
  record: RecordState,
  watermark: WatermarkOptions,
  font: string,
  filename: string
): Promise<void> {
  await waitForHtml2Pdf();

  const iframe = document.createElement("iframe");
  iframe.title = "PDF export";
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", left: "-10000px", top: "0", width: "210mm", height: "297mm", border: "0", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Unable to prepare the PDF.");
    doc.open();
    doc.write(buildPrintDocumentHTML(paginateRecord(record), record.rrn, watermark, font, record.format, record.pageBorder));
    doc.close();
    await new Promise((r) => window.setTimeout(r, 600));

    const content = doc.querySelector(".print-document") as HTMLElement | null;
    if (!content) throw new Error("PDF content not found.");

    await window
      .html2pdf!()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: { mode: ["css"] },
      })
      .from(content)
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        // Rounding in the tall-canvas slicing can spill a blank trailing page: drop it.
        const real = content.querySelectorAll(".a4-page").length;
        while (real > 0 && pdf.internal.getNumberOfPages() > real) pdf.deletePage(pdf.internal.getNumberOfPages());
      })
      .save();
  } finally {
    iframe.remove();
  }
}
