"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Cloud, Files, FolderOpen, ImagePlus, MoreHorizontal, Save, Settings, Pencil, Sparkles, TerminalSquare, X } from "lucide-react";
import { AutoTextarea } from "./AutoTextarea";
import { EditorSection } from "./EditorSection";
import { WatermarkOptionsSection } from "./WatermarkOptionsSection";
import type { Folder } from "@/lib/folderService";
import { TerminalImageModal } from "./TerminalImageModal";
import { describeHeaderBorders, HeaderBorderControls } from "./HeaderBorderControls";
import type { TerminalImageOptions } from "@/lib/terminalImage";
import type { OutputImage, RecordState, WatermarkOptions } from "@/lib/types";

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
  onOpenSettings: () => void;
  isSavingCloud: boolean;
  /** Pages the record currently paginates to. */
  pageCount?: number;
  visible: boolean;
}

type SectionId = "details" | "aim" | "algorithm" | "code" | "output" | "review" | "result";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "aim", label: "Aim" },
  { id: "algorithm", label: "Algorithm" },
  { id: "code", label: "Code" },
  { id: "output", label: "Output" },
  { id: "review", label: "Review" },
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
  onOpenSettings,
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

  const filled: Record<SectionId, boolean> = {
    details: Boolean(record.rrn.trim() || record.exercise_number.trim() || record.title.trim()),
    aim: Boolean(record.aim.trim()),
    algorithm: Boolean(record.algorithm.trim()),
    code: Boolean(record.source_code.trim()),
    output: Boolean(record.output.trim() || record.output_images.length),
    review: record.review_questions_enabled && Boolean(record.review_questions.trim()),
    result: Boolean(record.result.trim()),
  };
  const trackedIds = SECTIONS.filter((s) => s.id !== "review" || record.review_questions_enabled);
  const doneCount = trackedIds.filter((s) => filled[s.id]).length;

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
  }, []);

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
          const off = s.id === "review" && !record.review_questions_enabled;
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
                    RRN
                  </label>
                  <input
                    id="rrnInput"
                    type="text"
                    placeholder="Your register number"
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

              <details className="ui-detail group transition-colors">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-ink-soft">
                  Title table border
                  <span className="text-[11px] font-medium text-ink-soft/60">
                    {describeHeaderBorders(record.headerLayout)}
                  </span>
                </summary>
                <div className="pt-3">
                  <HeaderBorderControls
                    idPrefix="record"
                    layout={record.headerLayout}
                    onChange={(next) => onFieldChange("headerLayout", next)}
                  />
                </div>
              </details>
            </div>
          </EditorSection>
        </div>

        <WatermarkOptionsSection watermark={watermark} onChange={onWatermarkChange} />

        <div data-onboarding="sections" className="space-y-3.5">
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

          <EditorSection id="output" title="Output" index="04" filled={filled.output}>
            <label htmlFor="outputInput" className={labelClass}>
              Output text
            </label>
            <AutoTextarea
              id="outputInput"
              minRows={3}
              placeholder="Paste what the program printed. Optional."
              value={record.output}
              onChange={(v) => onFieldChange("output", v)}
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
                <span>Make terminal screenshot from output</span>
              </button>
              <label
                htmlFor="outputImagesInput"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-[#fdfcf8] p-2.5 text-xs font-semibold text-ink-soft transition-all hover:border-accent/50 hover:bg-accent-soft/40 hover:text-accent-ink"
              >
                <ImagePlus className="h-4 w-4" strokeWidth={2} />
                <span>Add output screenshots</span>
                <input
                  id="outputImagesInput"
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
              initialOutput={record.output}
              editing={editingImage}
              onAdd={onAddOutputImage}
              onUpdate={onUpdateOutputImage}
            />
          </EditorSection>

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

          <EditorSection id="result" title="Result" index="06" filled={filled.result}>
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
