import type { RecordState, WatermarkOptions } from "./types";

/**
 * The editor's safety net: the open record is copied to this device after every pause in typing, and
 * restored when the page opens again (a refresh, a crash, an accidental close). Cloud files and .rlab
 * downloads remain the real saves; this only means a tab closing never costs the person their work.
 */
const KEY = "recordlab.draft";

export interface Draft {
  record: RecordState;
  watermark: WatermarkOptions;
  cloudDocId: string | null;
  cloudFolderId: string | null;
  savedAt: number;
}

/** True once the person has typed something worth keeping. */
export function hasContent(r: RecordState): boolean {
  const filled = [r.title, r.aim, r.algorithm, r.source_code, r.output, r.result, r.review_questions].some((v) => (v ?? "").replace(/<[^>]*>/g, "").trim());
  return filled || r.output_images.length > 0 || Object.values(r.section_values ?? {}).some((v) => (v ?? "").replace(/<[^>]*>/g, "").trim());
}

/** Returns false when the browser refused the write (storage full or blocked), so the caller can warn on leaving. */
export function saveDraft(d: Omit<Draft, "savedAt">): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
    return true;
  } catch {
    try {
      // Pictures are what fill the storage: keep the text at least.
      localStorage.setItem(KEY, JSON.stringify({ ...d, record: { ...d.record, output_images: [] }, savedAt: Date.now() }));
    } catch {}
    return false;
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d?.record && typeof d.record === "object" && hasContent(d.record) ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
