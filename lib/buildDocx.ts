import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Header,
  HeightRule,
  OverlapType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  Paragraph,
  Table,
  TableAnchorType,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import { toDocxFontName } from "./fonts";
import { CONTENT_WIDTH_MM, MANUAL_CALCULATION_LINES, resolvePageBorder, resolveTitlePos, PAGE_BORDER_SIDES } from "./types";
import { collegeGeometry } from "./recordFormat";
import { resolveSections, resultHeading } from "./sections";
import { resolveHeaderBorders, resolveHeaderUnderline, type HeaderLine } from "./types";
import type { OutputImage, RecordState, Verification, WatermarkOptions } from "./types";

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

/** docx border size is in eighths of a point; CSS px -> pt is x0.75. */
function docxLine(line: HeaderLine) {
  return {
    style: DOCX_BORDER_STYLE[line.style],
    size: line.style === "none" ? 0 : Math.max(2, Math.round(line.width * 0.75 * 8)),
    color: line.color.replace("#", ""),
  };
}

/** Word page borders: per-side line, spaced from the page edge (Word caps the space at 31pt; it can't round corners). */
function docxPageBorders(record: RecordState) {
  const pb = resolvePageBorder(record.pageBorder);
  const out: Record<string, { style: (typeof BorderStyle)[keyof typeof BorderStyle]; size: number; color: string; space: number }> = {};
  for (const side of PAGE_BORDER_SIDES) {
    const line = docxLine({ style: pb[side].style, width: pb[side].width, color: pb[side].color });
    const key = `pageBorder${side[0].toUpperCase()}${side.slice(1)}`;
    out[key] = { ...line, size: Math.min(96, line.size), space: Math.min(31, Math.round(pb.inset[side] * (72 / 25.4))) };
  }
  return out;
}

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

/** Run sizes in half-points: standard 14pt headings / 12pt body, college sheet 12pt headings / 11pt body. */
function headingParagraph(text: string, font: string, college = false, size?: number): Paragraph {
  return new Paragraph({
    spacing: { before: college ? 200 : 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: size ?? (college ? 24 : 28), font })],
  });
}

function bodyParagraph(text: string, font: string, college = false): Paragraph {
  if (!text.trim()) return new Paragraph({ children: [] });
  return new Paragraph({
    spacing: { after: 120, ...(college ? { line: 380 } : {}) },
    children: linesToRuns(text, font, { size: college ? 22 : 24 }),
  });
}

/** College sheet: "AIM: text…" with the heading running on in bold. */
function inlineAimParagraph(text: string, font: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 120, line: 380 },
    children: [
      new TextRun({ text: "AIM: ", bold: true, size: 22, font }),
      ...text
        .trim()
        .split("\n")
        .map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, size: 22, font })),
    ],
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

/**
 * College sheet heading block: a floating table anchored to the page (8mm from the top-left, 194mm wide),
 * so it sits on the page border exactly as in the preview. Only the bottom rule and centre divider are drawn.
 */
function collegeHeaderTable(record: RecordState, font: string): Table {
  const lines = resolveHeaderBorders(record.headerLayout);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  const geo = collegeGeometry(record.pageBorder);
  const totalW = convertMillimetersToTwip(geo.width);
  const leftW = Math.round(totalW * 0.28);
  const rowH = convertMillimetersToTwip(record.headerLayout.height);
  const exNo = record.exercise_number.trim();
  const date = formatDate(record.date).replace(/-/g, "/");

  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: [leftW, totalW - leftW],
    float: {
      horizontalAnchor: TableAnchorType.PAGE,
      verticalAnchor: TableAnchorType.PAGE,
      absoluteHorizontalPosition: convertMillimetersToTwip(geo.x + 17),
      absoluteVerticalPosition: convertMillimetersToTwip(geo.y + 18),
      overlap: OverlapType.NEVER,
    },
    rows: [
      new TableRow({
        height: { value: rowH, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            verticalAlign: "center",
            borders: { top: none, left: none, bottom: docxLine(lines.bottom), right: docxLine(lines.insideV) },
            margins: { top: 100, bottom: 100, left: 280, right: 140 },
            children: [
              new Paragraph({ children: [new TextRun({ text: `EX : ${exNo}`, bold: true, size: 28, font })] }),
              new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: `DATE : ${date}`, bold: true, size: 28, font })] }),
            ],
          }),
          new TableCell({
            width: { size: totalW - leftW, type: WidthType.DXA },
            verticalAlign: "center",
            borders: { top: none, right: none, bottom: docxLine(lines.bottom), left: docxLine(lines.insideV) },
            margins: { top: 100, bottom: 100, left: 280, right: 140 },
            children: [new Paragraph({ ...titleParagraphProps(record, true), children: [new TextRun({ text: record.title.trim(), bold: true, size: 28, font })] })],
          }),
        ],
      }),
    ],
  });
}

/** Word can't place text at an arbitrary percentage, so the title snaps to the nearest of left / centre / right; the vertical nudge is kept. */
function titleParagraphProps(record: RecordState, college: boolean) {
  const { x, y } = resolveTitlePos(record.headerLayout, college ? "college" : undefined);
  return {
    alignment: x < 25 ? AlignmentType.LEFT : x > 75 ? AlignmentType.RIGHT : AlignmentType.CENTER,
    spacing: { before: Math.max(0, Math.round(convertMillimetersToTwip(y))), after: Math.max(0, Math.round(convertMillimetersToTwip(-y))) },
  };
}

function headerTable(record: RecordState, font: string): Table {
  // Mirrors createHeader() in lib/paginate.ts: table width scales with
  // headerLayout.width relative to the fixed 176mm content area, and row
  // height follows headerLayout.height — the same field the canvas2pdf
  // drag-resize and the Settings modal's default both read and write.
  const widthPct = Math.min(100, (record.headerLayout.width / CONTENT_WIDTH_MM) * 100);
  const rowHeightTwips = convertMillimetersToTwip(record.headerLayout.height);
  const lines = resolveHeaderBorders(record.headerLayout);
  const metaBorders = {
    top: docxLine(lines.top),
    bottom: docxLine(lines.bottom),
    left: docxLine(lines.left),
    right: docxLine(lines.insideV),
  };
  const titleBorders = {
    top: docxLine(lines.top),
    bottom: docxLine(lines.bottom),
    left: docxLine(lines.insideV),
    right: docxLine(lines.right),
  };

  const offsetMm = Math.min(Math.max(0, record.headerLayout.x || 0), Math.max(0, CONTENT_WIDTH_MM - record.headerLayout.width));
  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    indent: offsetMm > 0 ? { size: convertMillimetersToTwip(offsetMm), type: WidthType.DXA } : undefined,
    rows: [
      new TableRow({
        height: { value: rowHeightTwips, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: metaBorders,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                // The inside horizontal line: a rule under the EX NO row.
                border: lines.insideH.style === "none" ? undefined : { bottom: { ...docxLine(lines.insideH), space: 6 } },
                spacing: { after: 60 },
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
            borders: titleBorders,
            verticalAlign: "center",
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                ...titleParagraphProps(record, false),
                children: [new TextRun({ text: record.title.trim(), bold: true, size: 28, font })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function buildRecordDocx(record: RecordState, watermark: WatermarkOptions, docFont: string, verified?: Verification | null): Promise<Blob> {
  const font = toDocxFontName(docFont);
  const underline = resolveHeaderUnderline(record.headerLayout);
  // The rule is the bottom border of the paragraph right after the table; `space` (pt) is its gap from the text above.
  const afterHeader =
    underline.style === "none"
      ? new Paragraph({ children: [] })
      : new Paragraph({
          children: [],
          spacing: { before: Math.round(underline.gap * 56.7) },
          border: { bottom: { ...docxLine(underline), space: 1 } },
        });
  const college = record.format === "college";
  // A floating table does not push text down, so the college sheet adds a spacer that clears the 28mm block.
  const collegeSpacer = new Paragraph({ spacing: { before: convertMillimetersToTwip(Math.max(0, record.headerLayout.height - 10 + 4)) }, children: [] });
  const children: (Paragraph | Table)[] = college ? [collegeHeaderTable(record, font), collegeSpacer] : [headerTable(record, font), afterHeader];

  for (const sec of resolveSections(record)) {
    if (sec.kind === "lines") {
      // Starts right under the previous section and flows on to the next page if it runs out of room;
      // the heading stays with its first lines.
      children.push(new Paragraph({ keepNext: true, spacing: { before: college ? 200 : 240, after: 80 }, children: [new TextRun({ text: sec.heading, bold: true, size: college ? 24 : 28, font })] }));
      for (let i = 0; i < sec.lines; i++) {
        children.push(new Paragraph({ keepNext: i < 2, spacing: { after: 0, line: 360, lineRule: "exact" }, children: [] }));
      }
    } else if (sec.kind === "output") {
      if (!sec.value.trim() && sec.images.length === 0) continue;
      children.push(headingParagraph(sec.heading, font, college));
      if (sec.value.trim()) children.push(bodyParagraph(sec.value, font, college));
      for (const image of sec.images) children.push(await outputImageParagraph(image));
    } else if (sec.value.trim()) {
      if (college && sec.id === "aim") children.push(inlineAimParagraph(sec.value, font));
      else children.push(headingParagraph(sec.heading, font, college), bodyParagraph(sec.value, font, college));
    }
  }
  if (record.result.trim()) {
    children.push(headingParagraph(resultHeading(record), font, college, college ? 28 : undefined), bodyParagraph(record.result, font, college));
  }

  if (verified) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 360 },
        keepLines: true,
        children: [
          new TextRun({ text: "\u2713 ", bold: true, color: "1B7F5C", size: 22, font }),
          new TextRun({ text: `Verified by ${verified.by}${verified.on ? `, ${verified.on}` : ""}`, bold: true, color: "14633F", size: 20, font }),
        ],
      })
    );
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
              ...docxPageBorders(record),
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
