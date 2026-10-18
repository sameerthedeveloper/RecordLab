"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { loadSettings } from "@/lib/settings";
import {
  MAX_LINES,
  MAX_SECTIONS,
  SECTION_KINDS,
  SECTION_KIND_LABEL,
  SECTION_PRESETS,
  suggestPresetId,
  newSectionId,
  type SectionKind,
  type SectionTemplate,
} from "@/lib/sections";

interface SectionTemplateEditorProps {
  /** null = the original programming-lab layout. */
  value: SectionTemplate | null;
  onChange: (next: SectionTemplate | null) => void;
  idPrefix: string;
}

const field =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 max-md:min-h-11";
const iconBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft max-md:h-11 max-md:w-11";

/**
 * Builds the record layout for a subject: pick a department preset, then rename, reorder, add or
 * remove sections and choose what each one holds. Used when creating a subject and when editing it.
 */
export function SectionTemplateEditor({ value, onChange, idPrefix }: SectionTemplateEditorProps) {
  // Which preset the list started from (stays marked while you edit it).
  const [chosen, setChosen] = useState<string | null>(value === null ? "programming" : null);
  const activePreset = value === null ? "programming" : chosen;
  // Mark the preset that fits the department saved in Settings > Account.
  const [suggested, setSuggested] = useState<string | null>(null);
  useEffect(() => setSuggested(suggestPresetId(loadSettings().department)), []);

  function update(sections: SectionTemplate["sections"]) {
    if (value) onChange({ ...value, sections });
  }
  function move(i: number, dir: -1 | 1) {
    if (!value) return;
    const j = i + dir;
    if (j < 0 || j >= value.sections.length) return;
    const next = [...value.sections];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }

  return (
    // Enter in a title box must not submit a surrounding form (e.g. New subject).
    <div className="space-y-4" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && e.preventDefault()}>
      <div>
        <p className="mb-2 text-xs font-semibold text-ink-soft">Start from your department</p>
        <div role="radiogroup" aria-label="Department layout" className="grid gap-2 sm:grid-cols-2">
          {SECTION_PRESETS.map((p, i) => {
            const on = p.id === activePreset;
            const last = i === SECTION_PRESETS.length - 1 && SECTION_PRESETS.length % 2 === 1;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setChosen(p.id);
                  onChange(p.build ? p.build() : null);
                }}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent max-md:min-h-16 ${last ? "sm:col-span-2" : ""} ${
                  on ? "border-accent bg-accent-soft/50 ring-1 ring-accent/30" : "border-line bg-white hover:border-accent/40"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-accent bg-accent text-white" : "border-ink-soft/40 bg-white"}`}
                >
                  {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    {p.name}
                    {p.id === suggested && (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">Suggested</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft/75">{p.note}</span>
                </span>
              </button>
            );
          })}
        </div>
        {value && <p className="mt-2 text-[11px] text-ink-soft/70">Picking a preset replaces the list below. Edit it freely afterwards.</p>}
      </div>

      {value === null ? (
        <div className="rounded-xl border border-line bg-paper/60 p-3">
          <p className="text-xs font-semibold text-ink-soft">This layout prints</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft/90">Aim · Algorithm · Source code · Output · Review questions · Result</p>
          <p className="mt-1.5 text-[11px] text-ink-soft/70">Pick another preset above to build and edit your own sections.</p>
        </div>
      ) : (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">
            Sections, in print order <span className="font-normal text-ink-soft/60">({value.sections.length}/{MAX_SECTIONS})</span>
          </p>
          <ol className="space-y-2">
            {value.sections.map((s, i) => (
              <li key={s.id} className="rounded-xl border border-line bg-white p-2.5">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden className="w-5 shrink-0 text-center font-mono text-[10px] font-semibold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    aria-label={`Section ${i + 1} title`}
                    value={s.title}
                    maxLength={60}
                    onChange={(e) => update(value.sections.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                    className={field}
                  />
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}>
                    <ArrowUp className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === value.sections.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
                    <ArrowDown className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${s.title || "section"}`}
                    onClick={() => update(value.sections.filter((x) => x.id !== s.id))}
                    className={`${iconBtn} hover:!bg-red-50 hover:!text-red-600`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 pl-6">
                  <select
                    aria-label={`${s.title || "Section"} holds`}
                    value={s.kind}
                    onChange={(e) =>
                      update(value.sections.map((x) => (x.id === s.id ? { ...x, kind: e.target.value as SectionKind, lines: e.target.value === "lines" ? x.lines ?? 20 : undefined } : x)))
                    }
                    className={`${field} bg-white`}
                  >
                    {SECTION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {SECTION_KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  {s.kind === "lines" && (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <input
                        type="number"
                        min={1}
                        max={MAX_LINES}
                        value={s.lines ?? 20}
                        onChange={(e) => update(value.sections.map((x) => (x.id === s.id ? { ...x, lines: Number(e.target.value) } : x)))}
                        className={`${field} w-20`}
                      />
                      lines
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <button
            type="button"
            disabled={value.sections.length >= MAX_SECTIONS}
            onClick={() => update([...value.sections, { id: newSectionId(), title: "New section", kind: "text" }])}
            className="mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/50 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft/40 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add a section
          </button>

          <div className="mt-3">
            <label htmlFor={`${idPrefix}-result`} className="mb-1 block text-xs font-semibold text-ink-soft">
              Closing section is called
            </label>
            <input
              id={`${idPrefix}-result`}
              value={value.resultTitle}
              maxLength={40}
              onChange={(e) => onChange({ ...value, resultTitle: e.target.value })}
              placeholder="Result"
              className={field}
            />
            <p className="mt-1 text-[11px] text-ink-soft/70">Always printed last, e.g. Result or Conclusion.</p>
          </div>
        </div>
      )}
    </div>
  );
}
