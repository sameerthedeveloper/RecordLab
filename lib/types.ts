import type { TerminalImageOptions } from "./terminalImage";

export interface OutputImage {
  id: number;
  src: string;
  name: string;
  /** Present on generated terminal screenshots; lets the user reopen and edit them. */
  terminal?: TerminalImageOptions;
}

/**
 * Position/size of the header table in the canvas2pdf editable preview, in mm
 * relative to the top-left of the page's content area (inside the 18mm/17mm
 * padding — same origin `lib/buildCanvasPdf.ts` uses for MARGIN_LEFT/TOP).
 * Only canvas2pdf mode's editor and exporter read this; the paginated
 * html2pdf/docx/print paths keep their own fixed header layout.
 */
export interface HeaderLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Title-table border; optional so records saved before this existed fall back to the default. */
  borderStyle?: HeaderBorderStyle;
  /** CSS px (0.5–4). */
  borderWidth?: number;
  borderColor?: string;
}

export type HeaderBorderStyle = "solid" | "double" | "dashed" | "dotted" | "none";

export interface HeaderBorder {
  style: HeaderBorderStyle;
  width: number;
  color: string;
}

export const DEFAULT_HEADER_BORDER: HeaderBorder = { style: "solid", width: 1, color: "#111827" };
export const HEADER_BORDER_MIN_WIDTH = 0.5;
export const HEADER_BORDER_MAX_WIDTH = 4;

/** Border with defaults filled in. Double lines need room for both strokes, so they never go thinner than 3px. */
export function resolveHeaderBorder(layout: Partial<HeaderLayout> | undefined): HeaderBorder {
  const style = layout?.borderStyle ?? DEFAULT_HEADER_BORDER.style;
  const raw = Number(layout?.borderWidth ?? DEFAULT_HEADER_BORDER.width);
  const width = Math.min(HEADER_BORDER_MAX_WIDTH, Math.max(HEADER_BORDER_MIN_WIDTH, Number.isFinite(raw) ? raw : 1));
  const color = /^#[0-9a-fA-F]{6}$/.test(layout?.borderColor ?? "") ? (layout!.borderColor as string) : DEFAULT_HEADER_BORDER.color;
  return { style, width: style === "double" ? Math.max(3, width) : width, color };
}

/** Value for the `--header-border` custom property that `.record-header` borders read. */
export function headerBorderCssValue(layout: Partial<HeaderLayout> | undefined): string {
  const b = resolveHeaderBorder(layout);
  return b.style === "none" ? "none" : `${b.width}px ${b.style} ${b.color}`;
}

export interface RecordState {
  rrn: string;
  exercise_number: string;
  date: string;
  title: string;
  aim: string;
  algorithm: string;
  source_code: string;
  output: string;
  output_images: OutputImage[];
  review_questions: string;
  review_questions_enabled: boolean;
  result: string;
  headerLayout: HeaderLayout;
}

export interface WatermarkOptions {
  font: string;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
}

export type DownloadFormat = "pdf" | "docx";

/** Which engine renders the PDF: html2pdf.js (rasterized snapshot) or canvas2pdf (vector/selectable text). */
export type PdfEngine = "html2pdf" | "canvas2pdf";

export interface PageObject {
  main: string;
  result: string;
}

// A4 content area (page minus the 18mm top/bottom, 17mm left/right padding
// canvas2pdf and the paginated print CSS both use) — shared bounds for the
// canvas2pdf header table's draggable/resizable layout.
export const CONTENT_WIDTH_MM = 176;
export const CONTENT_HEIGHT_MM = 261;

// Matches the fixed header table used by the paginated html2pdf/docx/print
// paths: full content width, ~60pt tall.
export const DEFAULT_HEADER_LAYOUT: HeaderLayout = {
  x: 0,
  y: 0,
  width: CONTENT_WIDTH_MM,
  height: 21.2,
};

export const DEFAULT_RECORD: RecordState = {
  rrn: "",
  exercise_number: "",
  date: "",
  title: "",
  aim: "",
  algorithm: "",
  source_code: "",
  output: "",
  output_images: [],
  review_questions: "",
  review_questions_enabled: true,
  result: "",
  headerLayout: DEFAULT_HEADER_LAYOUT,
};

export const DEFAULT_WATERMARK: WatermarkOptions = {
  font: "Arial, sans-serif",
  size: 72,
  rotation: -45,
  opacity: 10,
  color: "#6b7280",
};
