import { escapeHTML } from "./escapeHtml";
import type { Verification } from "./types";

/** The tick inside the mark. Inline SVG so it survives print and html2canvas. */
export const TICK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1b7f5c"/><path d="M7 12.5l3.2 3.2L17 8.8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** HTML for the "Verified by <faculty>" mark, for the print/PDF pages. */
export function verifiedMarkHtml(v: Verification): string {
  return `<div class="a4-verified">${TICK_SVG}<div><b>Verified by ${escapeHTML(v.by)}</b>${v.on ? `<small>${escapeHTML(v.on)}</small>` : ""}</div></div>`;
}
