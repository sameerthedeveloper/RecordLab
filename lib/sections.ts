import type { OutputImage, RecordState } from "./types";
import { MANUAL_CALCULATION_LINES } from "./types";

/**
 * What a section holds:
 * - text: paragraphs (aim, theory, procedure, observations...)
 * - code: monospaced-style block, whitespace kept (source code, a table typed out, a circuit netlist)
 * - output: text plus attached images / screenshots (output, circuit diagram, graph)
 * - lines: blank hand-written space of a fixed number of lines (manual calculation, rough work)
 */
export type SectionKind = "text" | "code" | "output" | "lines";
export const SECTION_KINDS: SectionKind[] = ["text", "code", "output", "lines"];

export const SECTION_KIND_LABEL: Record<SectionKind, string> = {
  text: "Text",
  code: "Code / table",
  output: "Text + images",
  lines: "Blank lines",
};

export interface SectionDef {
  id: string;
  title: string;
  kind: SectionKind;
  /** Only for kind "lines". */
  lines?: number;
}

/** A subject's record layout: the sections between the heading and the closing block. */
export interface SectionTemplate {
  sections: SectionDef[];
  /** Heading of the closing block, e.g. "Result" or "Conclusion". */
  resultTitle: string;
}

export const MAX_SECTIONS = 14;
export const MAX_LINES = 80;

/** A section as the renderers see it: heading text, kind and value, whether it is a legacy field or a custom one. */
export interface ResolvedSection {
  id: string;
  heading: string;
  kind: SectionKind;
  value: string;
  images: OutputImage[];
  lines: number;
}

let counter = 0;
export function newSectionId(): string {
  counter += 1;
  return `c_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** "Apparatus required" -> "APPARATUS REQUIRED:" */
export const headingFor = (title: string): string => `${title.trim().toUpperCase() || "UNTITLED"}:`;

export const isCustomLayout = (record: Pick<RecordState, "sections">): boolean => Array.isArray(record.sections);

export function resultHeading(record: Pick<RecordState, "format" | "sections" | "result_title">): string {
  if (isCustomLayout(record)) return headingFor(record.result_title?.trim() || "Result");
  return record.format === "college" ? "RESULT :" : "RESULT:";
}

/**
 * The record's sections in print order. Records with no custom layout are the original programming
 * lab (aim, algorithm, source code, output, review questions, optional manual calculation), so every
 * file saved before layouts existed renders exactly as it did.
 */
/** forPrint: the sheet being previewed or downloaded; false: the saved record as it is stored (cloud views). */
export function resolveSections(record: RecordState, forPrint = false): ResolvedSection[] {
  if (isCustomLayout(record)) {
    let imagesGiven = false;
    return record.sections!.map((s) => {
      const gives = s.kind === "output" && !imagesGiven;
      if (gives) imagesGiven = true;
      return {
        id: s.id,
        heading: headingFor(s.title),
        kind: s.kind,
        value: s.kind === "lines" ? "" : record.section_values?.[s.id] ?? "",
        images: gives ? record.output_images : [],
        lines: Math.min(MAX_LINES, Math.max(1, s.lines ?? MANUAL_CALCULATION_LINES)),
      };
    });
  }
  const college = record.format === "college";
  const out: ResolvedSection[] = [
    ...(forPrint && record.hide_aim_algorithm
      ? []
      : ([
          { id: "aim", heading: "AIM:", kind: "text", value: record.aim, images: [], lines: 0 },
          { id: "algorithm", heading: "ALGORITHM:", kind: "text", value: record.algorithm, images: [], lines: 0 },
        ] as ResolvedSection[])),
    { id: "source_code", heading: "SOURCE CODE:", kind: "code", value: record.source_code, images: [], lines: 0 },
    { id: "output", heading: "OUTPUT:", kind: "output", value: record.output, images: record.output_images, lines: 0 },
  ];
  if (record.review_questions_enabled) {
    out.push({
      id: "review_questions",
      heading: college ? "REVIEW QUESTIONS WITH ANSWERS:" : "REVIEW QUESTIONS:",
      kind: "text",
      value: record.review_questions,
      images: [],
      lines: 0,
    });
  }
  if (record.manual_calculation_enabled) {
    out.push({ id: "manual_calculation", heading: "MANUAL CALCULATION:", kind: "lines", value: "", images: [], lines: MANUAL_CALCULATION_LINES });
  }
  return out;
}

/** Applies a layout to a record: sections become the template's, values already typed under the same ids are kept. */
export function applyTemplate(record: RecordState, template: SectionTemplate | null | undefined): RecordState {
  if (!template) {
    // Back to the original programming-lab layout.
    const { sections: _s, result_title: _r, ...rest } = record;
    void _s;
    void _r;
    return rest as RecordState;
  }
  return {
    ...record,
    sections: template.sections.map((s) => ({ ...s })),
    result_title: template.resultTitle,
    section_values: record.section_values ?? {},
  };
}

const sec = (title: string, kind: SectionKind = "text", lines?: number): SectionDef => ({ id: newSectionId(), title, kind, ...(lines ? { lines } : {}) });

/** Starting points by department. "Programming lab" is the original layout (no custom sections). */
export interface SectionPreset {
  id: string;
  name: string;
  note: string;
  /** null = the original programming-lab layout. */
  build: (() => SectionTemplate) | null;
}

export const SECTION_PRESETS: SectionPreset[] = [
  { id: "programming", name: "Programming lab", note: "CSE / IT / AI: aim, algorithm, code, output, review questions", build: null },
  {
    id: "science",
    name: "Physics / Chemistry",
    note: "Apparatus, theory, procedure, observations, calculations",
    build: () => ({
      resultTitle: "Result",
      sections: [sec("Aim"), sec("Apparatus required"), sec("Theory"), sec("Procedure"), sec("Observations", "code"), sec("Calculations", "lines", 25)],
    }),
  },
  {
    id: "electronics",
    name: "Electronics / Electrical",
    note: "Components, circuit diagram, procedure, readings, calculation",
    build: () => ({
      resultTitle: "Result",
      sections: [sec("Aim"), sec("Components required"), sec("Circuit diagram", "output"), sec("Procedure"), sec("Tabulation", "code"), sec("Model calculation", "lines", 20)],
    }),
  },
  {
    id: "mechanical",
    name: "Mechanical / Civil",
    note: "Apparatus, procedure, observation table, calculations, precautions",
    build: () => ({
      resultTitle: "Result",
      sections: [sec("Aim"), sec("Apparatus"), sec("Procedure"), sec("Observation table", "code"), sec("Calculations", "lines", 25), sec("Precautions")],
    }),
  },
  {
    id: "blank",
    name: "Start from scratch",
    note: "Aim, procedure, observations. Add your own",
    build: () => ({ resultTitle: "Result", sections: [sec("Aim"), sec("Procedure"), sec("Observations")] }),
  },
];

/** Clean a template coming from storage or the editor: valid kinds, bounded sizes, unique ids, no empty titles. */
export function sanitizeTemplate(raw: unknown): SectionTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SectionTemplate>;
  if (!Array.isArray(r.sections)) return null;
  const seen = new Set<string>();
  const sections: SectionDef[] = [];
  for (const s of r.sections.slice(0, MAX_SECTIONS)) {
    if (!s || typeof s !== "object") continue;
    const kind = SECTION_KINDS.includes((s as SectionDef).kind) ? (s as SectionDef).kind : "text";
    let id = typeof (s as SectionDef).id === "string" && (s as SectionDef).id ? (s as SectionDef).id : newSectionId();
    if (seen.has(id)) id = newSectionId();
    seen.add(id);
    const title = String((s as SectionDef).title ?? "").trim().slice(0, 60) || "Section";
    const lines = kind === "lines" ? Math.min(MAX_LINES, Math.max(1, Math.round(Number((s as SectionDef).lines) || MANUAL_CALCULATION_LINES))) : undefined;
    sections.push({ id, title, kind, ...(lines ? { lines } : {}) });
  }
  return { sections, resultTitle: String(r.resultTitle ?? "").trim().slice(0, 40) || "Result" };
}

/** Suggestions for the department field (free text is still allowed). */
export const DEPARTMENTS = [
  "Computer Science and Engineering",
  "Information Technology",
  "Artificial Intelligence and Data Science",
  "Electronics and Communication Engineering",
  "Electrical and Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Physics",
  "Chemistry",
  "Mathematics",
];

/** Which preset fits a department best (by keyword); null when unsure. */
export function suggestPresetId(department: string): string | null {
  const d = department.toLowerCase();
  if (!d.trim()) return null;
  if (/(computer|software|information tech|\bit\b|\bcse\b|data science|artificial|\bai\b|machine learning|cyber)/.test(d)) return "programming";
  if (/(electronic|electrical|\bece\b|\beee\b|instrument|communication)/.test(d)) return "electronics";
  if (/(mechanic|civil|automobile|aero|production|industrial|structural)/.test(d)) return "mechanical";
  if (/(physic|chemi|bio|material|environment|science)/.test(d)) return "science";
  return null;
}

/** The layout a subject's records start with: its own, the original programming lab, or the default from Settings. */
export function effectiveLayout(
  folder: { layoutMode?: "default" | "programming" | "custom"; template?: SectionTemplate | null } | undefined,
  defaultLayout: SectionTemplate | null
): SectionTemplate | null {
  if (!folder) return defaultLayout;
  if (folder.layoutMode === "custom" && folder.template) return folder.template;
  if (folder.layoutMode === "programming") return null;
  return defaultLayout;
}

/** Short label for a subject's layout, for lists. */
export function layoutLabel(folder: { layoutMode?: "default" | "programming" | "custom"; template?: SectionTemplate | null }): string {
  if (folder.layoutMode === "custom" && folder.template) return `Custom, ${folder.template.sections.length} sections`;
  if (folder.layoutMode === "programming") return "Programming lab";
  return "Follows your default";
}

const NAME_HINTS: { id: string; re: RegExp }[] = [
  { id: "programming", re: /(data struct|algorithm|programming|python|java\b|\bc\+\+|\bc lang|\boop|dbms|database|\bsql\b|operating system|computer network|\bweb\b|software|compiler|machine learning|artificial|\bai\b|cyber|cloud|\bdsa\b|\bos\b)/ },
  { id: "electronics", re: /(electronic|circuit|digital|analog|vlsi|microprocessor|microcontroller|embedded|signal|communication|electrical|machine|power system|control system|\bbeee\b|\bede\b|\bnetwork analysis)/ },
  { id: "mechanical", re: /(mechanic|thermal|thermo|fluid|strength of material|manufactur|workshop|\bcivil\b|survey|concrete|structur|hydraulic|\bcad\b|\bcam\b|heat transfer|dynamics|automobile|material testing)/ },
  { id: "science", re: /(physic|chemi|biolog|material science|environment|biochem|organic|inorganic|optics|quantum)/ },
];

/** Best-fit preset for a subject, guessed from its name; null when nothing matches. */
export function suggestPresetForSubject(name: string): string | null {
  const n = name.toLowerCase();
  for (const h of NAME_HINTS) if (h.re.test(n)) return h.id;
  return null;
}
