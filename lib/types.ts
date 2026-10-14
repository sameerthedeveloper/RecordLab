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
  /** Full-width rule drawn under the title table (off by default). */
  underline?: Partial<HeaderUnderline>;
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

/** A rule under the whole heading block. `gap` is the space between the table and the rule, in mm. */
export interface HeaderUnderline extends HeaderLine {
  gap: number;
}

export const DEFAULT_HEADER_UNDERLINE: HeaderUnderline = { style: "none", width: 1, color: "#6b7280", gap: 4 };
export const HEADER_UNDERLINE_MAX_GAP_MM = 20;

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

export function resolveHeaderUnderline(layout: Partial<HeaderLayout> | undefined): HeaderUnderline {
  const u = layout?.underline;
  const line = resolveHeaderLine(u, DEFAULT_HEADER_UNDERLINE);
  const gap = Number(u?.gap ?? DEFAULT_HEADER_UNDERLINE.gap);
  return { ...line, gap: Math.min(HEADER_UNDERLINE_MAX_GAP_MM, Math.max(0, Number.isFinite(gap) ? gap : DEFAULT_HEADER_UNDERLINE.gap)) };
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

/** "standard": the boxed heading table inside the margins. "college": a lab-sheet look, with the heading block flush to the page border. */
export type RecordFormat = "standard" | "college";
export const RECORD_FORMATS: RecordFormat[] = ["standard", "college"];

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
  /** Optional so older records open as "standard". */
  format?: RecordFormat;
  /** Optional so older records get the default rule. */
  pageBorder?: PageBorder;
}

export interface PageBorderSide {
  style: HeaderBorderStyle;
  /** CSS px (0.5-6). */
  width: number;
  color: string;
}

/** The rule drawn around each A4 page: every side has its own line, the inset from the page edge is per side. */
export interface PageBorder {
  top: PageBorderSide;
  right: PageBorderSide;
  bottom: PageBorderSide;
  left: PageBorderSide;
  /** Distance from the page edge, mm, per side. */
  inset: { top: number; right: number; bottom: number; left: number };
  /** Corner radius, mm. Preview/print/canvas PDF only; Word page borders can't round corners. */
  radius: number;
}

export type PageBorderSideName = "top" | "right" | "bottom" | "left";
export const PAGE_BORDER_SIDES: PageBorderSideName[] = ["top", "right", "bottom", "left"];
export const PAGE_BORDER_MIN_WIDTH = 0.5;
export const PAGE_BORDER_MAX_WIDTH = 6;
export const PAGE_BORDER_MAX_INSET_MM = 20;
export const PAGE_BORDER_MAX_RADIUS_MM = 20;

const DEFAULT_SIDE: PageBorderSide = { style: "solid", width: 1, color: "#111827" };

export const DEFAULT_PAGE_BORDER: PageBorder = {
  top: DEFAULT_SIDE,
  right: DEFAULT_SIDE,
  bottom: DEFAULT_SIDE,
  left: DEFAULT_SIDE,
  inset: { top: 8, right: 8, bottom: 8, left: 8 },
  radius: 0,
};

const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function resolveSide(side: Partial<PageBorderSide> | undefined): PageBorderSide {
  const style = (["solid", "double", "dashed", "dotted", "none"] as const).includes(side?.style as HeaderBorderStyle)
    ? (side!.style as HeaderBorderStyle)
    : DEFAULT_SIDE.style;
  const width = clampNum(side?.width, PAGE_BORDER_MIN_WIDTH, PAGE_BORDER_MAX_WIDTH, DEFAULT_SIDE.width);
  const color = /^#[0-9a-fA-F]{6}$/.test(side?.color ?? "") ? (side!.color as string) : DEFAULT_SIDE.color;
  return { style, width: style === "double" ? Math.max(3, width) : width, color };
}

/** Page border with every missing/invalid field defaulted, so older records and partial data are safe. */
export function resolvePageBorder(pb: Partial<PageBorder> | undefined): PageBorder {
  const inset = (k: PageBorderSideName) => clampNum(pb?.inset?.[k], 0, PAGE_BORDER_MAX_INSET_MM, 8);
  return {
    top: resolveSide(pb?.top),
    right: resolveSide(pb?.right),
    bottom: resolveSide(pb?.bottom),
    left: resolveSide(pb?.left),
    inset: { top: inset("top"), right: inset("right"), bottom: inset("bottom"), left: inset("left") },
    radius: clampNum(pb?.radius, 0, PAGE_BORDER_MAX_RADIUS_MM, 0),
  };
}

/** Style object for the `.a4-border` overlay (React preview). */
export function pageBorderStyle(pb: Partial<PageBorder> | undefined): Record<string, string> {
  const b = resolvePageBorder(pb);
  const side = (s: PageBorderSide) => (s.style === "none" ? "none" : `${s.width}px ${s.style} ${s.color}`);
  return {
    top: `${b.inset.top}mm`,
    right: `${b.inset.right}mm`,
    bottom: `${b.inset.bottom}mm`,
    left: `${b.inset.left}mm`,
    borderTop: side(b.top),
    borderRight: side(b.right),
    borderBottom: side(b.bottom),
    borderLeft: side(b.left),
    borderRadius: `${b.radius}mm`,
  };
}

/** Same declarations as an inline `style` string (print / html2pdf HTML). */
export function pageBorderCss(pb: Partial<PageBorder> | undefined): string {
  return Object.entries(pageBorderStyle(pb))
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v};`)
    .join("");
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
  format: "standard",
  pageBorder: DEFAULT_PAGE_BORDER,
};

export const DEFAULT_WATERMARK: WatermarkOptions = {
  font: "Arial, sans-serif",
  size: 72,
  rotation: -45,
  opacity: 10,
  color: "#6b7280",
};
