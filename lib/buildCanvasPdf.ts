import { formatDate } from "./escapeHtml";
import { mapToPdfKitFont } from "./fonts";
import { resolveHeaderBorder, resolvePageBorder, type PageBorderSide } from "./types";
import type { RecordState, WatermarkOptions } from "./types";

/**
 * Vector PDF export via canvas2pdf (https://github.com/joshua-gould/canvas2pdf),
 * as an alternative to the html2pdf.js rasterized-image export in app/page.tsx.
 *
 * canvas2pdf's own package ships prebuilt browser bundles of PDFKit and
 * blob-stream under `canvas2pdf/lib/` (built via browserify with the standard
 * 14 PDF fonts' AFM metrics inlined as strings) — importing those subpaths
 * directly avoids pulling in the plain `pdfkit` npm package, which reads its
 * font data from disk via `fs` and cannot run in a webpack browser bundle.
 *
 * canvas2pdf.js itself expects a global `PDFDocument` constructor (it's
 * written to be loaded via <script> tags after pdfkit's bundle sets
 * `window.PDFDocument`), so we set that ourselves before constructing a
 * context. Once constructed, `ctx.doc` is the underlying PDFKit document —
 * we draw with its native rect/text/image API (real wrapping + auto page
 * breaks) rather than canvas2pdf's thinner canvas-style method set.
 */
import PDFDocumentCtor from "canvas2pdf/lib/pdfkit.js";
import blobStreamCtor from "canvas2pdf/lib/blob-stream.js";
import canvas2pdfLib from "canvas2pdf/canvas2pdf.js";

declare global {
  interface Window {
    PDFDocument?: unknown;
  }
}

interface PdfKitDoc {
  x: number;
  y: number;
  font(name: string): PdfKitDoc;
  fontSize(size: number): PdfKitDoc;
  fillColor(color: string, opacity?: number): PdfKitDoc;
  strokeColor(color: string): PdfKitDoc;
  lineWidth(width: number): PdfKitDoc;
  lineCap(cap: "butt" | "round" | "square"): PdfKitDoc;
  dash(length: number, options?: { space?: number; phase?: number }): PdfKitDoc;
  rect(x: number, y: number, w: number, h: number): PdfKitDoc;
  roundedRect(x: number, y: number, w: number, h: number, r: number): PdfKitDoc;
  moveTo(x: number, y: number): PdfKitDoc;
  lineTo(x: number, y: number): PdfKitDoc;
  stroke(): PdfKitDoc;
  save(): PdfKitDoc;
  restore(): PdfKitDoc;
  rotate(angle: number, options?: { origin: [number, number] }): PdfKitDoc;
  text(text: string, x?: number, y?: number, options?: Record<string, unknown>): PdfKitDoc;
  heightOfString(text: string, options?: Record<string, unknown>): number;
  widthOfString(text: string): number;
  currentLineHeight(includeGap?: boolean): number;
  image(src: string, x: number, y: number, options?: Record<string, unknown>): PdfKitDoc;
  addPage(): PdfKitDoc;
  bufferedPageRange(): { start: number; count: number };
  switchToPage(n: number): PdfKitDoc;
  on(event: "pageAdded", handler: () => void): void;
  end(): void;
}

interface PdfContext {
  doc: PdfKitDoc;
  stream: { on(event: "finish", cb: () => void): void; toBlob(mime: string): Blob };
  end(): void;
}

const MM_TO_PT = 2.834645669;
const mm = (v: number) => v * MM_TO_PT;
const PX_TO_PT = 0.75;

const PAGE_WIDTH = mm(210);
const PAGE_HEIGHT = mm(297);
const MARGIN_TOP = mm(18);
const MARGIN_BOTTOM = mm(18);
const MARGIN_LEFT = mm(17);
const MARGIN_RIGHT = mm(17);
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const INK = "#111827";

const HEADING_FONT_SIZE = 13;
const BODY_FONT_SIZE = 11;
const HEADING_GAP = 6;
const SECTION_GAP = 14;

/** Builds a vector (real, selectable text) PDF of the record via canvas2pdf/PDFKit. */
export function buildCanvasPdf(record: RecordState, watermark: WatermarkOptions, font: string): Promise<Blob> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF generation is only available in the browser."));
  }
  window.PDFDocument = PDFDocumentCtor;
  // PDFKit only ships the 14 standard PDF fonts (see file header) — map the
  // chosen document font onto the nearest one rather than the fixed
  // Helvetica/Helvetica-Bold used before per-document fonts existed.
  const { regular: BODY_FONT, bold: BOLD_FONT } = mapToPdfKitFont(font);

  return new Promise((resolve, reject) => {
    try {
      const ctx = new (canvas2pdfLib as { PdfContext: new (stream: unknown, options?: Record<string, unknown>) => PdfContext }).PdfContext(
        blobStreamCtor(),
        {
          size: "A4",
          margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
          bufferPages: true,
        }
      );
      const doc = ctx.doc;

      /** One straight rule of a page border, honouring dashed / dotted / double. */
      function ruleLine(x1: number, y1: number, x2: number, y2: number, side: PageBorderSide): void {
        if (side.style === "none") return;
        const lw = side.width * PX_TO_PT;
        const horizontal = y1 === y2;
        doc.save();
        doc.strokeColor(side.color).lineWidth(side.style === "double" ? lw / 3 : lw);
        if (side.style === "dashed") doc.dash(lw * 4, { space: lw * 3 });
        if (side.style === "dotted") doc.lineCap("round").dash(0.01, { space: lw * 2 });
        const offsets = side.style === "double" ? [-lw / 3, lw / 3] : [0];
        for (const o of offsets) {
          if (horizontal) doc.moveTo(x1, y1 + o).lineTo(x2, y2 + o).stroke();
          else doc.moveTo(x1 + o, y1).lineTo(x2 + o, y2).stroke();
        }
        doc.restore();
      }

      function drawPageBorder(): void {
        const pb = resolvePageBorder(record.pageBorder);
        const x1 = mm(pb.inset.left);
        const x2 = PAGE_WIDTH - mm(pb.inset.right);
        const y1 = mm(pb.inset.top);
        const y2 = PAGE_HEIGHT - mm(pb.inset.bottom);
        const uniform = [pb.right, pb.bottom, pb.left].every(
          (s) => s.style === pb.top.style && s.width === pb.top.width && s.color === pb.top.color
        );
        if (pb.radius > 0 && uniform && pb.top.style !== "none" && pb.top.style !== "double") {
          const lw = pb.top.width * PX_TO_PT;
          doc.save();
          doc.strokeColor(pb.top.color).lineWidth(lw);
          if (pb.top.style === "dashed") doc.dash(lw * 4, { space: lw * 3 });
          if (pb.top.style === "dotted") doc.lineCap("round").dash(0.01, { space: lw * 2 });
          doc.roundedRect(x1, y1, x2 - x1, y2 - y1, Math.min(mm(pb.radius), (x2 - x1) / 2, (y2 - y1) / 2)).stroke();
          doc.restore();
          return;
        }
        ruleLine(x1, y1, x2, y1, pb.top);
        ruleLine(x2, y1, x2, y2, pb.right);
        ruleLine(x1, y2, x2, y2, pb.bottom);
        ruleLine(x1, y1, x1, y2, pb.left);
      }

      function drawPageChrome(): void {
        drawPageBorder();

        const rrn = record.rrn.trim();
        if (rrn) {
          doc.save();
          doc.font("Helvetica-Bold").fontSize(watermark.size * PX_TO_PT);
          doc.fillColor(watermark.color, watermark.opacity / 100);
          doc.rotate(watermark.rotation, { origin: [PAGE_WIDTH / 2, PAGE_HEIGHT / 2] });
          const w = doc.widthOfString(rrn);
          doc.text(rrn, PAGE_WIDTH / 2 - w / 2, PAGE_HEIGHT / 2 - doc.currentLineHeight() / 2, { lineBreak: false });
          doc.restore();
        }
      }

      doc.on("pageAdded", drawPageChrome);
      drawPageChrome();

      // Matches `.a4-main-flow--floating-header`'s `margin-top: 25mm` in
      // app/globals.css — the header floats independently now (see
      // drawHeaderTable), so flowing content starts at a fixed offset below
      // its default slot rather than tracking wherever it's been dragged to.
      let y = MARGIN_TOP + mm(25);

      function ensureSpace(height: number): void {
        if (y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
          doc.addPage();
          y = MARGIN_TOP;
        }
      }

      /** Draws the header at its draggable/resizable layout (record.headerLayout, in mm) — see DraggableHeaderTable.tsx. */
      const double = (style: string) => style === "double";

      function drawHeaderTable(): void {
        const layout = record.headerLayout;
        const boxX = MARGIN_LEFT + mm(layout.x);
        const boxY = MARGIN_TOP + mm(layout.y);
        const boxW = mm(layout.width);
        const boxH = mm(layout.height);
        const leftW = boxW * 0.28;
        const rightW = boxW - leftW;

        const border = resolveHeaderBorder(layout);
        const dividerY = boxY + boxH / 2;
        if (border.style !== "none") {
          const lw = border.width * PX_TO_PT;
          doc.save();
          doc.strokeColor(border.color).lineWidth(double(border.style) ? lw / 3 : lw);
          if (border.style === "dashed") doc.dash(lw * 4, { space: lw * 3 });
          if (border.style === "dotted") doc.lineCap("round").dash(0.01, { space: lw * 2 });
          // A double rule is two thin strokes straddling the line, with a gap of one stroke.
          const offsets = double(border.style) ? [-lw / 3, lw / 3] : [0];
          for (const o of offsets) {
            doc.rect(boxX - o, boxY - o, boxW + o * 2, boxH + o * 2).stroke();
            doc.moveTo(boxX + leftW + o, boxY).lineTo(boxX + leftW + o, boxY + boxH).stroke();
            doc.moveTo(boxX + 8, dividerY + o).lineTo(boxX + leftW - 8, dividerY + o).stroke();
          }
          doc.restore();
        }

        doc.fillColor(INK);
        doc.font(BOLD_FONT).fontSize(10);
        doc.text("EX NO : ", boxX + 10, boxY + 12, { continued: true });
        doc.font(BODY_FONT).text(record.exercise_number.trim());

        doc.font(BOLD_FONT).fontSize(10);
        doc.text("DATE : ", boxX + 10, dividerY + 8, { continued: true });
        doc.font(BODY_FONT).text(formatDate(record.date));

        const title = record.title.trim();
        doc.font(BOLD_FONT).fontSize(14);
        const titleHeight = doc.heightOfString(title, { width: rightW - 20, align: "center" });
        doc.text(title, boxX + leftW + 10, boxY + Math.max(10, (boxH - titleHeight) / 2), {
          width: rightW - 20,
          align: "center",
        });
      }

      function drawTextSection(heading: string, body: string): void {
        const text = body.trim();
        doc.font(BODY_FONT).fontSize(BODY_FONT_SIZE);
        const bodyHeight = text ? doc.heightOfString(text, { width: CONTENT_WIDTH }) : BODY_FONT_SIZE * 1.5;

        ensureSpace(HEADING_FONT_SIZE + HEADING_GAP + bodyHeight + SECTION_GAP);

        doc.font(BOLD_FONT).fontSize(HEADING_FONT_SIZE).fillColor(INK);
        doc.text(heading, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
        y = doc.y + HEADING_GAP;

        doc.font(BODY_FONT).fontSize(BODY_FONT_SIZE).fillColor(INK);
        if (text) {
          doc.text(text, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
          y = doc.y + SECTION_GAP;
        } else {
          y += BODY_FONT_SIZE * 1.5 + SECTION_GAP;
        }
      }

      async function drawOutputSection(): Promise<void> {
        const text = record.output.trim();
        const images = record.output_images;
        if (!text && images.length === 0) return;

        doc.font(BODY_FONT).fontSize(BODY_FONT_SIZE);
        const bodyHeight = text ? doc.heightOfString(text, { width: CONTENT_WIDTH }) : 0;
        ensureSpace(HEADING_FONT_SIZE + HEADING_GAP + bodyHeight + SECTION_GAP);

        doc.font(BOLD_FONT).fontSize(HEADING_FONT_SIZE).fillColor(INK);
        doc.text("OUTPUT:", MARGIN_LEFT, y, { width: CONTENT_WIDTH });
        y = doc.y + HEADING_GAP;

        if (text) {
          doc.font(BODY_FONT).fontSize(BODY_FONT_SIZE).fillColor(INK);
          doc.text(text, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
          y = doc.y + SECTION_GAP;
        }

        for (const image of images) {
          const img = await loadImage(image.src);
          const maxWidth = CONTENT_WIDTH;
          const ratio = img.naturalWidth > 0 ? Math.min(1, maxWidth / img.naturalWidth) : 1;
          const width = Math.round((img.naturalWidth || maxWidth) * ratio);
          const height = Math.round((img.naturalHeight || maxWidth * 0.6) * ratio);

          ensureSpace(height + SECTION_GAP);
          doc.image(image.src, MARGIN_LEFT, y, { width, height });
          y += height + SECTION_GAP;
        }
      }

      (async () => {
        drawHeaderTable();

        if (record.aim.trim()) drawTextSection("AIM:", record.aim);
        if (record.algorithm.trim()) drawTextSection("ALGORITHM:", record.algorithm);
        if (record.source_code.trim()) drawTextSection("SOURCE CODE:", record.source_code);
        await drawOutputSection();
        if (record.review_questions_enabled && record.review_questions.trim()) {
          drawTextSection("REVIEW QUESTIONS:", record.review_questions);
        }
        if (record.result.trim()) drawTextSection("RESULT:", record.result);

        ctx.stream.on("finish", () => resolve(ctx.stream.toBlob("application/pdf")));
        doc.end();
      })().catch(reject);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Canvas PDF generation failed."));
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
