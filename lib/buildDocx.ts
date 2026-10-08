import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Header,
  HeightRule,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import { toDocxFontName } from "./fonts";
import { CONTENT_WIDTH_MM } from "./types";
import { resolveHeaderBorder } from "./types";
import type { OutputImage, RecordState, WatermarkOptions } from "./types";

/**
 * Builds a .docx rendition of the record. Unlike the PDF/print path, this
 * doesn't try to replicate the pagination engine's page breaks — Word does
 * its own pagination once the file is opened. It mirrors the same section
 * order and content as lib/paginate.ts instead.
 */

const A4_WIDTH_PX = 794; // 210mm at 96dpi — matches the on-screen .a4-page width
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi

const DOCX_BORDER_STYLE = {
  solid: BorderStyle.SINGLE,
  double: BorderStyle.DOUBLE,
  dashed: BorderStyle.DASHED,
  dotted: BorderStyle.DOTTED,
  none: BorderStyle.NONE,
} as const;

function headerCellBorders(layout: RecordState["headerLayout"]) {
  const b = resolveHeaderBorder(layout);
  // docx border size is in eighths of a point; CSS px -> pt is x0.75.
  const side = {
    style: DOCX_BORDER_STYLE[b.style],
    size: b.style === "none" ? 0 : Math.max(2, Math.round(b.width * 0.75 * 8)),
    color: b.color.replace("#", ""),
  };
  return { top: side, bottom: side, left: side, right: side };
}
const PAGE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "111827" } as const;
// 8mm inset from the page edge, matching `.a4-border`'s `top/right/bottom/left: 8mm`.
const PAGE_BORDER_SPACE_PT = Math.round(8 * (72 / 25.4));

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const bigint = parseInt(full, 16) || 0;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function dataUrlToBytes(dataUrl: string): { type: "jpg" | "png" | "gif" | "bmp"; data: Uint8Array } {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:image\/(\w+);base64/.exec(meta)?.[1]?.toLowerCase() || "png";
  const type = mime === "jpeg" ? "jpg" : (mime as "jpg" | "png" | "gif" | "bmp");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { type, data: bytes };
}

/** Renders the rotated RRN watermark to a full-page PNG, matching the CSS watermark's look. */
async function buildWatermarkImage(rrn: string, watermark: WatermarkOptions): Promise<Uint8Array | null> {
  const text = rrn.trim();
  if (!text) return null;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = A4_WIDTH_PX * scale;
  canvas.height = A4_HEIGHT_PX * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((watermark.rotation * Math.PI) / 180);
  ctx.font = `700 ${watermark.size * scale}px ${watermark.font}`;
  ctx.fillStyle = hexToRgba(watermark.color, watermark.opacity / 100);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

function linesToRuns(text: string, font: string, runOptions: { size?: number } = {}): TextRun[] {
  const lines = text.split("\n");
  return lines.map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, font, ...runOptions }));
}

function headingParagraph(text: string, font: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 28, font })],
  });
}

function bodyParagraph(text: string, font: string): Paragraph {
  if (!text.trim()) return new Paragraph({ children: [] });
  return new Paragraph({
    spacing: { after: 120 },
    children: linesToRuns(text, font, { size: 24 }),
  });
}

async function outputImageParagraph(image: OutputImage): Promise<Paragraph> {
  const img = await loadImage(image.src);
  const { type, data } = dataUrlToBytes(image.src);
  const maxWidth = A4_WIDTH_PX - 120;
  const ratio = img.naturalWidth > 0 ? Math.min(1, maxWidth / img.naturalWidth) : 1;
  const width = Math.round((img.naturalWidth || maxWidth) * ratio);
  const height = Math.round((img.naturalHeight || maxWidth * 0.6) * ratio);

  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new ImageRun({
        type,
        data,
        transformation: { width, height },
      }),
    ],
  });
}

function headerTable(record: RecordState, font: string): Table {
  // Mirrors createHeader() in lib/paginate.ts: table width scales with
  // headerLayout.width relative to the fixed 176mm content area, and row
  // height follows headerLayout.height — the same field the canvas2pdf
  // drag-resize and the Settings modal's default both read and write.
  const widthPct = Math.min(100, (record.headerLayout.width / CONTENT_WIDTH_MM) * 100);
  const rowHeightTwips = convertMillimetersToTwip(record.headerLayout.height);
  const cellBorders = headerCellBorders(record.headerLayout);

  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: rowHeightTwips, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "EX NO : ", bold: true, size: 20, font }),
                  new TextRun({ text: record.exercise_number.trim(), size: 20, font }),
                ],
              }),
              new Paragraph({
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: "DATE : ", bold: true, size: 20, font }),
                  new TextRun({ text: formatDate(record.date), size: 20, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            verticalAlign: "center",
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: record.title.trim(), bold: true, size: 28, font })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function buildRecordDocx(record: RecordState, watermark: WatermarkOptions, docFont: string): Promise<Blob> {
  const font = toDocxFontName(docFont);
  const children: (Paragraph | Table)[] = [headerTable(record, font), new Paragraph({ children: [] })];

  if (record.aim.trim()) {
    children.push(headingParagraph("AIM:", font), bodyParagraph(record.aim, font));
  }
  if (record.algorithm.trim()) {
    children.push(headingParagraph("ALGORITHM:", font), bodyParagraph(record.algorithm, font));
  }
  if (record.source_code.trim()) {
    children.push(headingParagraph("SOURCE CODE:", font), bodyParagraph(record.source_code, font));
  }
  if (record.output.trim() || record.output_images.length > 0) {
    children.push(headingParagraph("OUTPUT:", font));
    if (record.output.trim()) children.push(bodyParagraph(record.output, font));
    for (const image of record.output_images) {
      children.push(await outputImageParagraph(image));
    }
  }
  if (record.review_questions_enabled && record.review_questions.trim()) {
    children.push(headingParagraph("REVIEW QUESTIONS:", font), bodyParagraph(record.review_questions, font));
  }
  if (record.result.trim()) {
    children.push(headingParagraph("RESULT:", font), bodyParagraph(record.result, font));
  }

  const watermarkBytes = await buildWatermarkImage(record.rrn, watermark);
  const headerChildren: Paragraph[] = watermarkBytes
    ? [
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: watermarkBytes,
              transformation: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
              floating: {
                horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
                verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
                behindDocument: true,
                allowOverlap: true,
                wrap: { type: TextWrappingType.NONE },
              },
            }),
          ],
        }),
      ]
    : [];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(17),
              right: convertMillimetersToTwip(17),
            },
            // Mirrors the preview/PDF's `.a4-border` — a thin rule inset 8mm
            // from the page edge, drawn independently of the content margin.
            borders: {
              pageBorders: {
                display: PageBorderDisplay.ALL_PAGES,
                offsetFrom: PageBorderOffsetFrom.PAGE,
              },
              pageBorderTop: { ...PAGE_BORDER, space: PAGE_BORDER_SPACE_PT },
              pageBorderBottom: { ...PAGE_BORDER, space: PAGE_BORDER_SPACE_PT },
              pageBorderLeft: { ...PAGE_BORDER, space: PAGE_BORDER_SPACE_PT },
              pageBorderRight: { ...PAGE_BORDER, space: PAGE_BORDER_SPACE_PT },
            },
          },
        },
        headers: { default: new Header({ children: headerChildren }) },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
