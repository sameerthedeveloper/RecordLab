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
  /** Optional so records saved before this existed fall back to the default rule. */
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
  pageBorder: DEFAULT_PAGE_BORDER,
};

export const DEFAULT_WATERMARK: WatermarkOptions = {
  font: "Arial, sans-serif",
  size: 72,
  rotation: -45,
  opacity: 10,
  color: "#6b7280",
};
