import type { RecordState } from "./types";

/**
 * A hidden mark for text the AI assistant wrote, so a faculty member can tell.
 *
 * The mark is a short run of zero-width characters (invisible on screen and in print) that spells "RL:AI".
 * It is added only to prose fields: never to source code (a stray character could stop a program compiling)
 * and never to program output. A second, separate record of the same fact is `record.ai_generated`
 * (when and which fields), which the faculty review reads.
 *
 * This is a transparency aid, not a lock: retyping the text, or pasting it through a tool that drops
 * invisible characters, removes the mark. `record.ai_generated` stays in the saved file either way.
 */
const ZERO = "​";
const ONE = "‌";
const EDGE = "⁠";
const TAG = "RL:AI";

const MARK = EDGE + [...TAG].map((c) => c.charCodeAt(0).toString(2).padStart(8, "0").replace(/0/g, ZERO).replace(/1/g, ONE)).join("") + EDGE;
const FIND = new RegExp(`${EDGE}[${ZERO}${ONE}]{${TAG.length * 8}}${EDGE}`);
const FIND_ALL = new RegExp(FIND.source, "g");

/** True when the text carries the mark. */
export const hasAiMark = (text: string | undefined | null): boolean => !!text && FIND.test(text);

/** Adds the mark once, inside the first text of the field (after a leading tag when the field is HTML). */
export function stampAiText(text: string): string {
  if (!text.trim() || hasAiMark(text)) return text;
  if (text.trimStart().startsWith("<")) {
    const at = text.indexOf(">");
    if (at !== -1) return text.slice(0, at + 1) + MARK + text.slice(at + 1);
  }
  return MARK + text;
}

/** Removes the mark (used when the text is exported somewhere that should stay clean). */
export const stripAiMark = (text: string): string => text.replace(FIND_ALL, "");

const STANDARD_FIELDS: { key: "aim" | "algorithm" | "review_questions" | "result"; label: string }[] = [
  { key: "aim", label: "Aim" },
  { key: "algorithm", label: "Algorithm" },
  { key: "review_questions", label: "Review questions" },
  { key: "result", label: "Result" },
];

/** What a reviewer can learn about AI use in one record. */
export interface AiSignals {
  /** The student's record says the AI assistant filled it in. */
  declared: boolean;
  declaredAt: Date | null;
  /** Fields whose text still carries the hidden mark. */
  marked: string[];
}

export function aiSignals(record: RecordState): AiSignals {
  const marked: string[] = [];
  for (const f of STANDARD_FIELDS) if (hasAiMark(record[f.key])) marked.push(f.label);
  for (const [id, value] of Object.entries(record.section_values ?? {})) {
    if (hasAiMark(value)) marked.push(record.sections?.find((s) => s.id === id)?.title ?? id);
  }
  const g = record.ai_generated;
  return { declared: !!g, declaredAt: g?.at ? new Date(g.at) : null, marked };
}
