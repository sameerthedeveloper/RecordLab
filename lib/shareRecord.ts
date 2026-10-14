export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ShareResult = "shared" | "downloaded" | "cancelled";

/** True when this device can hand a file to its native share sheet (most phones; some desktops). */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File(["x"], "record.docx", { type: DOCX_MIME })] });
  } catch {
    return false;
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Opens the phone's share sheet with the file attached (WhatsApp, Drive, Mail, Word...), or
 * downloads it where file sharing isn't available. Must be called from a user gesture.
 */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: blob.type || DOCX_MIME });
  if (canShareFiles() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return "cancelled";
      // Any other failure: fall through to a plain download so the user still gets the file.
    }
  }
  download(blob, filename);
  return "downloaded";
}
