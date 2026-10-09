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
  /**
   * Per-line title-table borders (like Word's table borders). Optional so records
   * saved earlier fall back to the legacy uniform fields below, then to a 1px solid box.
   */
  borders?: Partial<Record<HeaderLineName, Partial<HeaderLine>>>;
  /** Legacy uniform border (single style for the whole table). Read only as a fallback. */
  borderStyle?: HeaderBorderStyle;
  borderWidth?: number;
  borderColor?: string;
}

export type HeaderBorderStyle = "solid" | "double" | "dashed" | "dotted" | "none";

/** One border line. `style: "none"` means the line is off. */
export interface HeaderLine {
  style: HeaderBorderStyle;
  /** CSS px (0.5-4). */
  width: number;
  color: string;
}

/** The six lines of the title table: outer box edges plus the two inner dividers. */
export type HeaderLineName = "top" | "bottom" | "left" | "right" | "insideH" | "insideV";
export type HeaderBorders = Record<HeaderLineName, HeaderLine>;

export const HEADER_LINE_NAMES: HeaderLineName[] = ["top", "bottom", "left", "right", "insideH", "insideV"];
export const DEFAULT_HEADER_LINE: HeaderLine = { style: "solid", width: 1, color: "#111827" };
export const HEADER_BORDER_MIN_WIDTH = 0.5;
export const HEADER_BORDER_MAX_WIDTH = 4;

const HEADER_STYLES: HeaderBorderStyle[] = ["solid", "double", "dashed", "dotted", "none"];

function resolveHeaderLine(line: Partial<HeaderLine> | undefined, base: HeaderLine): HeaderLine {
  const style = HEADER_STYLES.includes(line?.style as HeaderBorderStyle) ? (line!.style as HeaderBorderStyle) : base.style;
  const raw = Number(line?.width ?? base.width);
  const width = Math.min(HEADER_BORDER_MAX_WIDTH, Math.max(HEADER_BORDER_MIN_WIDTH, Number.isFinite(raw) ? raw : base.width));
  const color = /^#[0-9a-fA-F]{6}$/.test(line?.color ?? "") ? (line!.color as string) : base.color;
  // Double lines need room for both strokes, so they never go thinner than 3px.
  return { style, width: style === "double" ? Math.max(3, width) : width, color };
}

/** All six lines with defaults filled in; honours the legacy single-border fields for older records. */
export function resolveHeaderBorders(layout: Partial<HeaderLayout> | undefined): HeaderBorders {
  const base = resolveHeaderLine(
    { style: layout?.borderStyle, width: layout?.borderWidth, color: layout?.borderColor },
    DEFAULT_HEADER_LINE
  );
  const out = {} as HeaderBorders;
  for (const name of HEADER_LINE_NAMES) out[name] = resolveHeaderLine(layout?.borders?.[name], base);
  return out;
}

export function headerLineCss(line: HeaderLine): string {
  return line.style === "none" ? "none" : `${line.width}px ${line.style} ${line.color}`;
}

/** CSS custom properties (`--hb-top`, ...) that `.record-header` borders read. */
export function headerBorderVars(layout: Partial<HeaderLayout> | undefined): Record<string, string> {
  const b = resolveHeaderBorders(layout);
  return {
    "--hb-top": headerLineCss(b.top),
    "--hb-bottom": headerLineCss(b.bottom),
    "--hb-left": headerLineCss(b.left),
    "--hb-right": headerLineCss(b.right),
    "--hb-ih": headerLineCss(b.insideH),
    "--hb-iv": headerLineCss(b.insideV),
  };
}

/** Same custom properties as an inline `style` string (print / html2pdf HTML). */
export function headerBorderVarsCss(layout: Partial<HeaderLayout> | undefined): string {
  return Object.entries(headerBorderVars(layout))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
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
