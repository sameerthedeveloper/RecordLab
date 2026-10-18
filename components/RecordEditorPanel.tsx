"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Cloud, FilePlus2, Files, LayoutList, Play, ShieldCheck, TriangleAlert, Share2, FolderOpen, ImagePlus, MoreHorizontal, Save, Settings, Pencil, Sparkles, TerminalSquare, X } from "lucide-react";
import { AutoTextarea } from "./AutoTextarea";
import { EditorSection } from "./EditorSection";
import { SheetSetup } from "./SheetSetup";
import { isCustomLayout } from "@/lib/sections";
import { outputStatus, runnableSource } from "@/lib/runner/source";
import type { Folder } from "@/lib/folderService";
import { TerminalImageModal } from "./TerminalImageModal";
import type { TerminalImageOptions } from "@/lib/terminalImage";
import { MANUAL_CALCULATION_LINES, type OutputImage, type RecordFormat, RecordState, WatermarkOptions } from "@/lib/types";

interface RecordEditorPanelProps {
  record: RecordState;
  watermark: WatermarkOptions;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
  onWatermarkChange: (next: WatermarkOptions) => void;
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (id: number) => void;
  /** Adds a generated image (data URL); `clearText` also empties the plain output text. */
  onAddOutputImage: (src: string, name: string, clearText: boolean, terminal: TerminalImageOptions) => void;
  onUpdateOutputImage: (id: number, src: string, terminal: TerminalImageOptions) => void;
  onFormatChange: (format: RecordFormat) => void;
  onShare: () => void;
  /** Cloud subject folders: only shown when signed in. */
  signedIn: boolean;
  folders: Folder[];
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  /** Creates a subject and resolves to its id (null on failure). */
  onCreateFolder: (name: string) => Promise<string | null>;
  onOpenAiModal: () => void;
  onSaveWork: () => void;
  onLoadWork: (file: File) => void;
  onSaveCloud: () => void;
  onOpenDashboard: () => void;
  /** Starts a clean record (asks first when the current one has unsaved edits). */
  onNewRecord: () => void;
  onOpenSettings: () => void;
  /** Opens the run-the-program dialog. */
  onRunCode: () => void;
  isSavingCloud: boolean;
  /** Pages the record currently paginates to. */
  pageCount?: number;
  visible: boolean;
}

type SectionId = string;

const LEGACY_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "aim", label: "Aim" },
  { id: "algorithm", label: "Algorithm" },
  { id: "code", label: "Code" },
  { id: "output", label: "Output" },
  { id: "review", label: "Review" },
  { id: "manual", label: "Manual calc" },
  { id: "result", label: "Result" },
];

const inputClass =
  "ui-input w-full max-md:min-h-12";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

export function RecordEditorPanel({
  record,
  watermark,
  onFieldChange,
  onWatermarkChange,
  onImageUpload,
  onRemoveImage,
  onAddOutputImage,
  onUpdateOutputImage,
  onFormatChange,
  onShare,
  signedIn,
  folders,
  folderId,
  onFolderChange,
  onCreateFolder,
  onOpenAiModal,
  onSaveWork,
  onLoadWork,
  onSaveCloud,
  onOpenDashboard,
  onNewRecord,
  onOpenSettings,
  onRunCode,
  isSavingCloud,
  pageCount,
  visible,
}: RecordEditorPanelProps) {
  const loadInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("details");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<OutputImage | null>(null);

  const custom = isCustomLayout(record);
  const customSections = record.sections ?? [];
  const sectionValue = (id: string) => record.section_values?.[id] ?? "";
  const setSectionValue = (id: string, v: string) => onFieldChange("section_values", { ...(record.section_values ?? {}), [id]: v });

  // Section rail: the original six, or this record's own sections, always bracketed by Details and the closing block.
  const SECTIONS: { id: SectionId; label: string }[] = custom
    ? [
        { id: "details", label: "Details" },
        ...customSections.map((c) => ({ id: c.id, label: c.title || "Section" })),
        { id: "result", label: record.result_title?.trim() || "Result" },
      ]
    : LEGACY_SECTIONS;

  const filled: Record<SectionId, boolean> = {
    details: Boolean(record.rrn.trim() || record.exercise_number.trim() || record.title.trim()),
    result: Boolean(record.result.trim()),
    ...(custom
      ? Object.fromEntries(
          customSections.map((c) => [c.id, c.kind === "lines" ? true : Boolean(sectionValue(c.id).trim() || (c.kind === "output" && record.output_images.length))])
        )
      : {
          aim: Boolean(record.aim.trim()),
          algorithm: Boolean(record.algorithm.trim()),
          code: Boolean(record.source_code.trim()),
          output: Boolean(record.output.trim() || record.output_images.length),
          review: record.review_questions_enabled && Boolean(record.review_questions.trim()),
          manual: Boolean(record.manual_calculation_enabled),
        }),
  };
  const linesIds = new Set(customSections.filter((c) => c.kind === "lines").map((c) => c.id));
  const trackedIds = SECTIONS.filter((s) =>
    custom ? !linesIds.has(s.id) : s.id !== "manual" && (s.id !== "review" || record.review_questions_enabled)
  );
  const doneCount = trackedIds.filter((s) => filled[s.id]).length;
  const layoutKey = SECTIONS.map((x) => x.id).join("|");


  /** Run button and the verified / sample status line at the top of the output section. */
  const renderRunBar = () => {
    const status = outputStatus(record);
    const hasCode = runnableSource(record).trim().length > 0;
    const hasOutput = Boolean(record.output.trim() || Object.values(record.section_values ?? {}).some((v) => v.trim()) || record.output_images.length);
    const run = record.output_run;
    const when = run ? new Date(run.ranAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
    const lang = run ? run.language[0].toUpperCase() + run.language.slice(1) : "";
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-2.5">
        <button
          type="button"
          onClick={onRunCode}
          disabled={!hasCode}
          title={hasCode ? "Run the program and capture its real output" : "Add code to the Source code section first"}
          className="ui-primary flex min-h-10 shrink-0 items-center gap-1.5 px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" strokeWidth={2.5} /> Run the code
        </button>
        <p
          className={`min-w-0 flex-1 text-[11px] leading-snug ${
            status === "verified" ? "font-semibold text-emerald-700" : status === "none" ? "text-ink-soft/75" : "font-semibold text-amber-800"
          }`}
        >
          {status === "verified" && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              Verified: output captured by running this code ({lang}, {run?.engine === "browser" ? "on this device" : "runner service"}, {when})
            </span>
          )}
          {status === "stale" && (
            <span className="flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              The code changed after this output was captured. Run it again to verify.
            </span>
          )}
          {status === "failed" && (
            <span className="flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              The last run ended with an error, so this output is not verified.
            </span>
          )}
          {status === "none" && (hasOutput ? "Not run: this output is typed or sample text." : "Not run yet. Run the code to capture real output.")}
        </p>
      </div>
    );
  };

  /** The text + images section: the fixed Output of the programming layout, or any custom section of that kind. */
  const renderOutputSection = (o: { id: string; title: string; index: string; text: string; onText: (v: string) => void; textLabel: string; placeholder: string; inputId: string; imagesInputId: string }) => (
<EditorSection id={o.id} title={o.title} index={o.index} filled={Boolean(o.text.trim() || record.output_images.length)}>
            {renderRunBar()}
            <label htmlFor={o.inputId} className={labelClass}>
              {o.textLabel}
            </label>
            <AutoTextarea
              id={o.inputId}
              minRows={3}
              placeholder={o.placeholder}
              value={o.text}
              onChange={o.onText}
            />

            <div className="image-upload-area mt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingImage(null);
                  setTerminalOpen(true);
                }}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-ink p-2.5 text-xs font-semibold text-paper transition-colors hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <TerminalSquare className="h-4 w-4" strokeWidth={2} />
                <span>Make terminal screenshot from this text</span>
              </button>
              <label
                htmlFor={o.imagesInputId}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-[#fdfcf8] p-2.5 text-xs font-semibold text-ink-soft transition-all hover:border-accent/50 hover:bg-accent-soft/40 hover:text-accent-ink"
              >
                <ImagePlus className="h-4 w-4" strokeWidth={2} />
                <span>Add screenshots or diagrams</span>
                <input
                  id={o.imagesInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) onImageUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              <div className="uploaded-images mt-2.5">
                {record.output_images.map((image: OutputImage) => (
                  <div className="uploaded-image-card" key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.name} />
                    {image.terminal && (
                      <button
                        type="button"
                        className="edit-image-button"
                        aria-label={`Edit terminal screenshot ${image.name}`}
                        title="Edit terminal screenshot"
                        onClick={() => {
                          setEditingImage(image);
                          setTerminalOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="remove-image-button"
                      aria-label={`Remove output image ${image.name}`}
                      onClick={() => onRemoveImage(image.id)}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <TerminalImageModal
              open={terminalOpen}
              onClose={() => setTerminalOpen(false)}
              initialOutput={o.text}
              editing={editingImage}
              onAdd={onAddOutputImage}
              onUpdate={onUpdateOutputImage}
            />
          </EditorSection>
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const nodes = SECTIONS.map((s) => root.querySelector<HTMLElement>(`#${s.id}`)).filter(
      (n): n is HTMLElement => Boolean(n)
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.id as SectionId);
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    // Short final sections can't reach the observer's top band, so hand the
    // highlight to the last chip once the list is scrolled to its end.
    function onScroll() {
      if (root && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) setActiveSection("result");
    }
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  useEffect(() => {
    if (!fileMenuOpen) return;
    function away(e: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileMenuOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [fileMenuOpen]);

  function jumpTo(id: SectionId) {
    const container = scrollRef.current;
    const target = document.getElementById(id);
    if (!container || !target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 14;
    container.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    setActiveSection(id);
  }

  const iconBtn =
    "ui-icon-btn flex items-center justify-center max-md:h-11 max-md:w-11 max-md:p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
  const menuItem =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-soft transition-colors hover:bg-accent-soft/50 hover:text-accent-ink";

  return (
    <div
      id="inputPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex w-full md:w-[400px] lg:w-[440px] shrink-0 flex-col ui-panel overflow-hidden`}
    >
      <div className="ui-panel-header shrink-0 p-4 pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <div data-onboarding="brand" className="min-w-0">
            <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">
              <Link href="/" title="Back to the home page" className="transition-colors hover:text-accent">
                Record Lab
              </Link>
            </h1>
            <a
              href="https://cogniheim.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Cogniheim"
              className="mt-0.5 block w-fit font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft/55 transition-colors hover:text-accent"
            >
              A product by <span className="text-ink-soft/80">Cogniheim</span>
            </a>
            <p className="mt-1 truncate text-xs text-ink-soft/70">
              {record.title.trim() || "Untitled record"}
              {pageCount ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="My files"
              aria-label="My files"
              data-onboarding="open-files"
              onClick={onOpenDashboard}
              className={iconBtn}
            >
              <Files className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Generate with AI"
              aria-label="Generate with AI"
              data-onboarding="ai-generate"
              onClick={onOpenAiModal}
              className={iconBtn}
            >
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Settings"
              aria-label="Settings"
              data-onboarding="open-settings"
              onClick={onOpenSettings}
              className={iconBtn}
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </button>
            <div ref={fileMenuRef} className="relative">
              <button
                type="button"
                title="File"
                aria-label="File menu"
                aria-haspopup="menu"
                aria-expanded={fileMenuOpen}
                onClick={() => setFileMenuOpen((v) => !v)}
                className={iconBtn}
              >
                <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
              </button>
              {fileMenuOpen && (
                <div role="menu" className="ui-menu absolute right-0 top-[calc(100%+6px)] z-20 w-52 p-1">
                  <button
                    role="menuitem"
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setFileMenuOpen(false);
                      onNewRecord();
                    }}
                  >
                    <FilePlus2 className="h-3.5 w-3.5" strokeWidth={2} /> New record
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setFileMenuOpen(false);
                      loadInputRef.current?.click();
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} /> Open a .rlab file
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setFileMenuOpen(false);
                      onSaveWork();
                    }}
                  >
                    <Save className="h-3.5 w-3.5" strokeWidth={2} /> Download as .rlab
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setFileMenuOpen(false);
                      onShare();
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={2} /> Share link
                  </button>
                </div>
              )}
            </div>
            <input
              ref={loadInputRef}
              type="file"
              accept="application/json,.json,.rlab"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLoadWork(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <button
          type="button"
          title="Save to cloud"
          data-onboarding="save-cloud"
          onClick={onSaveCloud}
          disabled={isSavingCloud}
          className="mt-3.5 flex w-full items-center justify-center gap-2 ui-primary px-3 py-2.5 text-[13px] max-md:min-h-12 max-md:text-[15px] font-semibold disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Cloud className="h-4 w-4" strokeWidth={2.25} />
          {isSavingCloud ? "Saving…" : "Save to cloud"}
        </button>
      </div>

      {/* Section rail: sticky, shows what's filled, follows scroll */}
      <nav
        aria-label="Record sections"
        className="ui-rail flex shrink-0 items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => {
          const off = !custom && s.id === "review" && !record.review_questions_enabled;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              aria-current={active ? "true" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs max-md:min-h-9 max-md:px-3.5 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"
              } ${off ? "opacity-50" : ""}`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  filled[s.id] ? "bg-emerald-600" : off ? "bg-transparent ring-1 ring-ink-soft/40" : "bg-ink-soft/25"
                }`}
              />
              {s.label}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 pl-2 text-[11px] text-ink-soft/70">
          {doneCount}/{trackedIds.length}
        </span>
      </nav>

      <div ref={scrollRef} className="editor-surface min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div data-onboarding="record-details">
          <EditorSection id="details" title="Record details" filled={filled.details}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rrnInput" className={labelClass}>
                    Register number
                  </label>
                  <input
                    id="rrnInput"
                    type="text"
                    placeholder="e.g. 24007160106"
                    className={inputClass}
                    value={record.rrn}
                    onChange={(e) => onFieldChange("rrn", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="exInput" className={labelClass}>
                    Exercise
                  </label>
                  <input
                    id="exInput"
                    type="text"
                    placeholder="Ex: 2"
                    className={inputClass}
                    value={record.exercise_number}
                    onChange={(e) => onFieldChange("exercise_number", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dateInput" className={labelClass}>
                  Date
                </label>
                <input
                  id="dateInput"
                  type="date"
                  className={inputClass}
                  value={record.date}
                  onChange={(e) => onFieldChange("date", e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="titleInput" className={labelClass}>
                  Experiment title
                </label>
                <input
                  id="titleInput"
                  type="text"
                  placeholder="Binary search using recursion"
                  className={inputClass}
                  value={record.title}
                  onChange={(e) => onFieldChange("title", e.target.value)}
                />
              </div>

              {signedIn && (
                <div>
                  <label htmlFor="subjectSelect" className={labelClass}>
                    Subject folder <span className="font-normal text-ink-soft/60">(where Save to Cloud files it)</span>
                  </label>
                  <select
                    id="subjectSelect"
                    className={`${inputClass} bg-white`}
                    value={newSubject !== null ? "__new" : folderId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new") setNewSubject("");
                      else {
                        setNewSubject(null);
                        onFolderChange(e.target.value || null);
                      }
                    }}
                  >
                    <option value="">No subject</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                    <option value="__new">+ New subject…</option>
                  </select>
                  {newSubject !== null && (
                    <form
                      className="mt-2 flex gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newSubject.trim()) return;
                        const id = await onCreateFolder(newSubject);
                        if (id) {
                          onFolderChange(id);
                          setNewSubject(null);
                        }
                      }}
                    >
                      <input
                        autoFocus
                        maxLength={60}
                        aria-label="New subject name"
                        placeholder="e.g. Data Structures"
                        className={inputClass}
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!newSubject.trim()}
                        className="shrink-0 rounded-xl bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        Create
                      </button>
                    </form>
                  )}
                </div>
              )}


            </div>
          </EditorSection>
        </div>

        <SheetSetup
          record={record}
          watermark={watermark}
          onFieldChange={onFieldChange}
          onFormatChange={onFormatChange}
          onWatermarkChange={onWatermarkChange}
        />

        <div data-onboarding="sections" className="space-y-3.5">
          {!custom && (
            <>
          <EditorSection id="aim" title="Aim" index="01" filled={filled.aim}>
            <label htmlFor="aimInput" className="sr-only">
              Aim
            </label>
            <AutoTextarea
              id="aimInput"
              minRows={4}
              placeholder="State what this experiment sets out to do."
              value={record.aim}
              onChange={(v) => onFieldChange("aim", v)}
            />
          </EditorSection>

          <EditorSection id="algorithm" title="Algorithm" index="02" filled={filled.algorithm}>
            <label htmlFor="algorithmInput" className="sr-only">
              Algorithm
            </label>
            <AutoTextarea
              id="algorithmInput"
              minRows={6}
              placeholder="Write the steps, one per line."
              value={record.algorithm}
              onChange={(v) => onFieldChange("algorithm", v)}
            />
          </EditorSection>

          <EditorSection id="code" title="Source code" index="03" filled={filled.code}>
            <label htmlFor="programInput" className="sr-only">
              Source code
            </label>
            <AutoTextarea
              id="programInput"
              code
              minRows={8}
              maxRows={24}
              placeholder="Paste or type your program."
              value={record.source_code}
              onChange={(v) => onFieldChange("source_code", v)}
            />
          </EditorSection>

          {renderOutputSection({ id: "output", title: "Output", index: "04", text: record.output, onText: (v) => onFieldChange("output", v), textLabel: "Output text", placeholder: "Paste what the program printed. Optional.", inputId: "outputInput", imagesInputId: "outputImagesInput" })}

          <EditorSection
            id="review"
            title="Review questions"
            index="05"
            filled={filled.review}
            aside={
              <label htmlFor="reviewEnabledToggle" className="flex cursor-pointer items-center gap-2">
                <span className="text-xs font-medium text-ink-soft/80">
                  {record.review_questions_enabled ? "In record" : "Left out"}
                </span>
                <span className="relative inline-flex">
                  <input
                    id="reviewEnabledToggle"
                    type="checkbox"
                    className="peer sr-only"
                    checked={record.review_questions_enabled}
                    onChange={(e) => onFieldChange("review_questions_enabled", e.target.checked)}
                  />
                  <span className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            }
          >
            <label htmlFor="reviewInput" className="sr-only">
              Review questions
            </label>
            <AutoTextarea
              id="reviewInput"
              minRows={4}
              disabled={!record.review_questions_enabled}
              placeholder="Write each question with its answer."
              value={record.review_questions}
              onChange={(v) => onFieldChange("review_questions", v)}
            />
          </EditorSection>

          <EditorSection
            id="manual"
            title="Manual calculation"
            index="06"
            filled={filled.manual}
            aside={
              <label htmlFor="manualEnabledToggle" className="flex cursor-pointer items-center gap-2">
                <span className="text-xs font-medium text-ink-soft/80">{record.manual_calculation_enabled ? "In record" : "Off"}</span>
                <span className="relative inline-flex">
                  <input
                    id="manualEnabledToggle"
                    type="checkbox"
                    className="peer sr-only"
                    checked={Boolean(record.manual_calculation_enabled)}
                    onChange={(e) => onFieldChange("manual_calculation_enabled", e.target.checked)}
                  />
                  <span className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            }
          >
            <p className="text-xs text-ink-soft/80">
              {record.manual_calculation_enabled
                ? `Leaves ${MANUAL_CALCULATION_LINES} blank lines before Result on the printed sheet, for working you write by hand.`
                : `Turn on to leave ${MANUAL_CALCULATION_LINES} blank lines before Result for hand-written working.`}
            </p>
          </EditorSection>

            </>
          )}

          {custom &&
            customSections.map((c, i) => {
              const index = String(i + 1).padStart(2, "0");
              if (c.kind === "output") {
                return renderOutputSection({
                  id: c.id,
                  title: c.title,
                  index,
                  text: sectionValue(c.id),
                  onText: (v) => setSectionValue(c.id, v),
                  textLabel: `${c.title} (text)`,
                  placeholder: "Type here, or add images below. Optional.",
                  inputId: `in-${c.id}`,
                  imagesInputId: `img-${c.id}`,
                });
              }
              if (c.kind === "lines") {
                return (
                  <EditorSection key={c.id} id={c.id} title={c.title} index={index} filled={false}>
                    <p className="text-xs text-ink-soft/80">
                      Prints {c.lines ?? 20} blank lines for hand-written work. Nothing to type here.
                    </p>
                  </EditorSection>
                );
              }
              return (
                <EditorSection key={c.id} id={c.id} title={c.title} index={index} filled={filled[c.id]}>
                  <label htmlFor={`in-${c.id}`} className="sr-only">
                    {c.title}
                  </label>
                  <AutoTextarea
                    id={`in-${c.id}`}
                    code={c.kind === "code"}
                    minRows={c.kind === "code" ? 6 : 4}
                    maxRows={c.kind === "code" ? 24 : undefined}
                    placeholder={c.kind === "code" ? "Type or paste. Spacing is kept." : `Write the ${c.title.toLowerCase()}.`}
                    value={sectionValue(c.id)}
                    onChange={(v) => setSectionValue(c.id, v)}
                  />
                </EditorSection>
              );
            })}

          <EditorSection
            id="result"
            title={custom ? record.result_title?.trim() || "Result" : "Result"}
            index={custom ? String(customSections.length + 1).padStart(2, "0") : "07"}
            filled={filled.result}
          >
            <label htmlFor="resultInput" className="sr-only">
              Result
            </label>
            <AutoTextarea
              id="resultInput"
              minRows={3}
              placeholder="Conclude in a sentence or two."
              value={record.result}
              onChange={(v) => onFieldChange("result", v)}
            />
          </EditorSection>
        </div>
      </div>

    </div>
  );
}
