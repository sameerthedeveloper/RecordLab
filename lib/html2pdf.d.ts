export interface Html2PdfOptions {
  margin?: number;
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: {
    scale?: number;
    useCORS?: boolean;
    backgroundColor?: string;
    logging?: boolean;
  };
  jsPDF?: {
    unit?: string;
    format?: string;
    orientation?: string;
    compress?: boolean;
  };
  pagebreak?: { mode?: string[] };
}

/** The slice of the underlying jsPDF document we touch. */
export interface Html2PdfJsPdf {
  internal: { getNumberOfPages(): number };
  deletePage(pageNumber: number): void;
}

export interface Html2PdfInstance {
  set: (opts: Html2PdfOptions) => Html2PdfInstance;
  from: (el: HTMLElement) => Html2PdfInstance;
  toPdf: () => Html2PdfInstance;
  get: (key: "pdf") => Html2PdfInstance;
  /** Documented html2pdf chain step: `.get("pdf").then((pdf) => ...)` runs before `.save()`. */
  then: (fn: (pdf: Html2PdfJsPdf) => void) => Html2PdfInstance;
  save: () => Promise<void>;
}

declare global {
  interface Window {
    html2pdf?: () => Html2PdfInstance;
  }
}
