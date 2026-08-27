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

export interface Html2PdfInstance {
  set: (opts: Html2PdfOptions) => Html2PdfInstance;
  from: (el: HTMLElement) => Html2PdfInstance;
  save: () => Promise<void>;
}

declare global {
  interface Window {
    html2pdf?: () => Html2PdfInstance;
  }
}
