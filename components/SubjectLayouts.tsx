"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen, Loader2 } from "lucide-react";
import { SectionTemplateEditor } from "./SectionTemplateEditor";
import { useAuthUser } from "@/lib/authService";
import { setFolderLayout, useFolders, type Folder } from "@/lib/folderService";
import { SECTION_PRESETS, layoutLabel, suggestPresetForSubject, type SectionTemplate } from "@/lib/sections";

type Mode = "default" | "programming" | "custom";

interface SubjectLayoutsProps {
  /** The layout from Settings, offered as the starting point for a custom one. */
  defaultLayout: SectionTemplate | null;
  onToast: (message: string) => void;
}

const MODES: { id: Mode; label: string }[] = [
  { id: "default", label: "Follow default" },
  { id: "programming", label: "Programming lab" },
  { id: "custom", label: "Custom" },
];

function copy(t: SectionTemplate): SectionTemplate {
  return { resultTitle: t.resultTitle, sections: t.sections.map((s) => ({ ...s })) };
}

function Row({ folder, defaultLayout, onToast }: { folder: Folder; defaultLayout: SectionTemplate | null; onToast: (m: string) => void }) {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(folder.layoutMode ?? "default");
  const [template, setTemplate] = useState<SectionTemplate | null>(folder.template ?? null);
  const [saving, setSaving] = useState(false);

  const suggestedId = suggestPresetForSubject(folder.name);
  const suggested = SECTION_PRESETS.find((p) => p.id === suggestedId);
  const fallbackTemplate = () => copy(defaultLayout ?? SECTION_PRESETS[1].build!());
  const dirty = mode !== (folder.layoutMode ?? "default") || (mode === "custom" && JSON.stringify(template) !== JSON.stringify(folder.template ?? null));

  function pick(next: Mode) {
    setMode(next);
    if (next === "custom" && !template) setTemplate(fallbackTemplate());
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await setFolderLayout(user.uid, folder.id, { mode, template: mode === "custom" ? template : null });
      onToast(`Saved the layout for "${folder.name}".`);
      setOpen(false);
    } catch {
      onToast("Couldn't save the layout. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left max-md:min-h-14"
      >
        <FolderOpen className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{folder.name}</span>
          <span className="block text-[11px] text-ink-soft/75">{layoutLabel(folder)}</span>
          {suggested && (folder.layoutMode ?? "default") === "default" && (
            <span className="mt-0.5 block text-[11px] font-semibold text-accent-ink">Looks like a {suggested.name} lab</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-soft/60 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.25} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
          {suggested && mode === "default" && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft/40 px-3.5 py-2.5">
              <p className="text-xs text-accent-ink">
                &quot;{folder.name}&quot; looks like a <span className="font-semibold">{suggested.name}</span> subject.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (suggested.build) {
                    setMode("custom");
                    setTemplate(suggested.build());
                  } else setMode("programming");
                }}
                className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white max-md:min-h-10"
              >
                Use it
              </button>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">Layout for records in this subject</p>
            <div role="radiogroup" aria-label={`Layout for ${folder.name}`} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => pick(m.id)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors max-md:min-h-11 ${
                    mode === m.id ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-soft/70">
              {mode === "default" && "Uses the layout set at the top of this tab, so changing it here changes this subject too."}
              {mode === "programming" && "Aim, Algorithm, Source code, Output, Review questions and Result."}
              {mode === "custom" && "Pick a department, then rename, reorder or add the sections below."}
            </p>
          </div>

          {mode === "custom" && template && (
            <SectionTemplateEditor
              idPrefix={`subject-${folder.id}`}
              value={template}
              onChange={(t) => {
                // Choosing the programming preset inside the editor means the original layout.
                if (t === null) {
                  setMode("programming");
                  return;
                }
                setTemplate(t);
              }}
            />
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="ui-primary flex min-h-10 items-center gap-1.5 px-5 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save for this subject
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Settings > Record sections: choose, per subject, which layout its records use, and rename its section titles. */
export function SubjectLayouts({ defaultLayout, onToast }: SubjectLayoutsProps) {
  const user = useAuthUser();
  const folders = useFolders();
  const [matching, setMatching] = useState(false);

  /** Maps every subject still on "follow default" to the layout its name suggests. */
  async function matchAll() {
    if (!user || !folders) return;
    const targets = folders.filter((f) => (f.layoutMode ?? "default") === "default" && suggestPresetForSubject(f.name));
    if (targets.length === 0) {
      onToast("No subject names to match. Rename a subject to include its field (Physics, Circuits...) or choose layouts by hand.");
      return;
    }
    setMatching(true);
    try {
      for (const f of targets) {
        const preset = SECTION_PRESETS.find((p) => p.id === suggestPresetForSubject(f.name));
        if (!preset) continue;
        await setFolderLayout(user.uid, f.id, preset.build ? { mode: "custom", template: preset.build() } : { mode: "programming" });
      }
      onToast(`Matched ${targets.length} ${targets.length === 1 ? "subject" : "subjects"} by name.`);
    } catch {
      onToast("Couldn't match the subjects. Check your connection.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink">Match subjects to layouts</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft/80">
            Give each subject its own layout. Picking the subject in the editor switches the record to it. Saved right away, separate from Save settings.
          </p>
        </div>
        {user && folders && folders.length > 0 && (
          <button
            type="button"
            onClick={matchAll}
            disabled={matching}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50 max-md:min-h-11"
          >
            {matching && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Match by name
          </button>
        )}
      </div>
      {!user ? (
        <p className="rounded-xl border border-dashed border-line bg-paper/60 p-3 text-xs text-ink-soft">Sign in to create subjects and map them to layouts.</p>
      ) : folders === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      ) : folders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-paper/60 p-3 text-xs text-ink-soft">
          No subjects yet. Create one from the Files screen or the Subject folder in Record details, then come back to give it a layout.
        </p>
      ) : (
        <ul className="space-y-2">
          {folders.map((f) => (
            <Row key={`${f.id}-${f.layoutMode}-${f.template ? f.template.sections.length : 0}`} folder={f} defaultLayout={defaultLayout} onToast={onToast} />
          ))}
        </ul>
      )}
    </section>
  );
}
