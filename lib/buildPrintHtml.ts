import { escapeHTML } from "./escapeHtml";
import { PRINT_CSS } from "./printCss";
import { pageBorderCss, type PageBorder, type PageObject, type WatermarkOptions } from "./types";

/** Builds one <div class="a4-page">…</div> string — used by both the live preview and the print/PDF output. */
export function createA4PageHTML(page: PageObject, rrn: string, watermark: WatermarkOptions, pageBorder?: PageBorder): string {
  const rrnEscaped = escapeHTML(rrn.trim());
  const style = `font-family: ${watermark.font}; font-size: ${watermark.size}px; transform: translate(-50%, -50%) rotate(${watermark.rotation}deg); opacity: ${
    watermark.opacity / 100
  }; color: ${watermark.color};`;

  return `
    <div class="a4-page">
      <div class="watermark" style="${style}">${rrnEscaped}</div>
      <div class="a4-border" style="${pageBorderCss(pageBorder)}"></div>
      <div class="a4-content">
        <div class="a4-main-flow">
          ${page.main}
        </div>
        ${page.result ? `<div class="a4-bottom-result">${page.result}</div>` : ""}
      </div>
    </div>
  `;
}

export function buildPrintDocumentHTML(
  pages: PageObject[],
  rrn: string,
  watermark: WatermarkOptions,
  font: string,
  pageBorder?: PageBorder
): string {
  const pagesHTML = pages.map((p) => createA4PageHTML(p, rrn, watermark, pageBorder)).join("");
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Record Lab</title>
      <style>${PRINT_CSS}</style>
    </head>
    <body style="--doc-font: ${escapeHTML(font)}">
      <div class="print-document">
        ${pagesHTML}
      </div>
    </body>
    </html>
  `;
}
