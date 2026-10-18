import type { RecordState } from "../types";
import { isCustomLayout } from "../sections";

/** FNV-1a: small, stable fingerprint of the code that was run. */
export function hashCode(code: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The program to run: the Source code field, or the first code section of a custom layout. */
export function runnableSource(record: RecordState): string {
  if (!isCustomLayout(record)) return record.source_code;
  const codes = (record.sections ?? []).filter((s) => s.kind === "code");
  const preferred = codes.find((s) => /code|program|script/i.test(s.title)) ?? codes[0];
  return preferred ? record.section_values?.[preferred.id] ?? "" : "";
}

/** Where captured output goes: the Output field, or the first text+images section of a custom layout. */
export function outputTarget(record: RecordState): { kind: "legacy" } | { kind: "section"; id: string } | null {
  if (!isCustomLayout(record)) return { kind: "legacy" };
  const out = (record.sections ?? []).find((s) => s.kind === "output");
  return out ? { kind: "section", id: out.id } : null;
}

export type OutputStatus = "none" | "verified" | "stale" | "failed";

/** How trustworthy the OUTPUT is: never run, from a run of the current code, from older code, or from a run that errored. */
export function outputStatus(record: RecordState): OutputStatus {
  const run = record.output_run;
  if (!run) return "none";
  if (run.codeHash !== hashCode(runnableSource(record))) return "stale";
  return run.ok ? "verified" : "failed";
}
