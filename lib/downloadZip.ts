import { cloudDocumentPdfBlob } from "./downloadCloudPdf";
import type { CloudDocument } from "./firestoreService";

const clean = (s: string) => s.replace(/[<>:"/\\|?*]+/g, "").trim() || "untitled";

/**
 * Renders each file to PDF exactly like the editor's Save PDF and bundles them
 * into one zip, one folder per subject. Resolves to the number of PDFs added.
 */
export async function downloadCloudZip(
  entries: { doc: CloudDocument; subject: string | null }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  let done = 0;
  for (const { doc, subject } of entries) {
    const { blob, filename } = await cloudDocumentPdfBlob(doc);
    const dir = subject ? `${clean(subject)}/` : "";
    let path = dir + filename;
    for (let n = 2; used.has(path.toLowerCase()); n++) path = `${dir}${filename.replace(/\.pdf$/i, "")}-${n}.pdf`;
    used.add(path.toLowerCase());
    zip.file(path, blob);
    onProgress?.(++done, entries.length);
  }
  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clean(zipName)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return done;
}
