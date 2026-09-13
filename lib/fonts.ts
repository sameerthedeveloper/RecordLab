/**
 * The document-wide font list — shared by the Settings modal's "Document
 * font" picker and the Watermark Options font picker. Deliberately limited
 * to fonts that are both (a) preinstalled on Windows/macOS, so the print/
 * DOCX/PDF output looks the same on the device that opens it as it did on
 * the one that made it, and (b) mappable onto one of PDFKit's 14 built-in
 * fonts for the canvas2pdf vector export (see mapToPdfKitFont below) — that
 * engine can't load arbitrary font files in the browser bundle.
 */
export const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "Verdana, sans-serif", label: "Verdana" },
] as const;

export const DEFAULT_DOC_FONT = FONT_OPTIONS[0].value;

interface PdfKitFontPair {
  regular: string;
  bold: string;
}

const PDFKIT_FONT_MAP: Record<string, PdfKitFontPair> = {
  "Arial, sans-serif": { regular: "Helvetica", bold: "Helvetica-Bold" },
  "Calibri, sans-serif": { regular: "Helvetica", bold: "Helvetica-Bold" },
  "'Times New Roman', serif": { regular: "Times-Roman", bold: "Times-Bold" },
  "'Courier New', monospace": { regular: "Courier", bold: "Courier-Bold" },
  "Georgia, serif": { regular: "Times-Roman", bold: "Times-Bold" },
  "Impact, sans-serif": { regular: "Helvetica-Bold", bold: "Helvetica-Bold" },
  "'Trebuchet MS', sans-serif": { regular: "Helvetica", bold: "Helvetica-Bold" },
  "Verdana, sans-serif": { regular: "Helvetica", bold: "Helvetica-Bold" },
};

/** Nearest PDFKit standard-14 font for a document-font selection — see the file-level comment. */
export function mapToPdfKitFont(font: string): PdfKitFontPair {
  return PDFKIT_FONT_MAP[font] ?? PDFKIT_FONT_MAP[DEFAULT_DOC_FONT];
}

/** DOCX's `font` property takes a bare family name (no fallback list, no quotes). */
export function toDocxFontName(font: string): string {
  return font.split(",")[0].replace(/^['"]|['"]$/g, "");
}
