"use client";

import { useRef } from "react";
import { Cloud, Files, FolderOpen, ImagePlus, Save, Sparkles, X } from "lucide-react";
import { AccordionSection } from "./AccordionSection";
import { WatermarkOptionsSection } from "./WatermarkOptionsSection";
import type { OutputImage, RecordState, WatermarkOptions } from "@/lib/types";

interface RecordEditorPanelProps {
  record: RecordState;
  watermark: WatermarkOptions;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
  onWatermarkChange: (next: WatermarkOptions) => void;
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (id: number) => void;
  onOpenAiModal: () => void;
  onSaveWork: () => void;
  onLoadWork: (file: File) => void;
  onSaveCloud: () => void;
  onOpenDashboard: () => void;
  isSavingCloud: boolean;
  visible: boolean;
}

const inputClass =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";
const textareaClass =
  "w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50 transition-all";

export function RecordEditorPanel({
  record,
  watermark,
  onFieldChange,
  onWatermarkChange,
  onImageUpload,
  onRemoveImage,
  onOpenAiModal,
  onSaveWork,
  onLoadWork,
  onSaveCloud,
  onOpenDashboard,
  isSavingCloud,
  visible,
}: RecordEditorPanelProps) {
  const loadInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      id="inputPanel"
      className={`mobile-panel ${visible ? "flex" : "hidden"} md:flex w-full md:w-[380px] lg:w-[400px] shrink-0 flex-col rounded-2xl border border-line bg-white shadow-sm overflow-hidden`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line p-4 bg-white">
        <div data-onboarding="brand">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Lab Notebook
          </p>
          <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Record Lab</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Load Work"
            aria-label="Load Work"
            onClick={() => loadInputRef.current?.click()}
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft"
          >
            <FolderOpen className="h-5 w-5" strokeWidth={2} />
          </button>
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
          <button
            type="button"
            title="Save Work"
            aria-label="Save Work"
            onClick={onSaveWork}
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft"
          >
            <Save className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Save to Cloud"
            aria-label="Save to Cloud"
            onClick={onSaveCloud}
            disabled={isSavingCloud}
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft disabled:cursor-wait disabled:opacity-60"
          >
            <Cloud className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="My Documents"
            aria-label="My Documents"
            onClick={onOpenDashboard}
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft"
          >
            <Files className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Generate with AI"
            aria-label="Generate with AI"
            data-onboarding="ai-generate"
            onClick={onOpenAiModal}
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft"
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="editor-surface min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3.5">
        <div data-onboarding="record-details" className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink">Record Details</p>

          <div className="space-y-3">
            <div>
              <label htmlFor="rrnInput" className={labelClass}>
                RRN Number
              </label>
              <input
                id="rrnInput"
                type="text"
                placeholder="Enter RRN number..."
                className={inputClass}
                value={record.rrn}
                onChange={(e) => onFieldChange("rrn", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="exInput" className={labelClass}>
                Exercise Number
              </label>
              <input
                id="exInput"
                type="text"
                placeholder="Ex : 2"
                className={inputClass}
                value={record.exercise_number}
                onChange={(e) => onFieldChange("exercise_number", e.target.value)}
              />
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
                Experiment Title
              </label>
              <input
                id="titleInput"
                type="text"
                placeholder="Enter experiment title..."
                className={inputClass}
                value={record.title}
                onChange={(e) => onFieldChange("title", e.target.value)}
              />
            </div>
          </div>
        </div>

        <WatermarkOptionsSection watermark={watermark} onChange={onWatermarkChange} />

        <div data-onboarding="sections">
          <AccordionSection title="AIM" index="01" defaultOpen>
            <label htmlFor="aimInput" className="sr-only">
              Aim
            </label>
            <textarea
              id="aimInput"
              rows={8}
              placeholder="Enter the aim of the experiment..."
              className={textareaClass}
              value={record.aim}
              onChange={(e) => onFieldChange("aim", e.target.value)}
            />
          </AccordionSection>
        </div>

        <AccordionSection title="ALGORITHM" index="02">
          <label htmlFor="algorithmInput" className="sr-only">
            Algorithm
          </label>
          <textarea
            id="algorithmInput"
            rows={10}
            placeholder="Enter the algorithm..."
            className={textareaClass}
            value={record.algorithm}
            onChange={(e) => onFieldChange("algorithm", e.target.value)}
          />
        </AccordionSection>

        <AccordionSection title="SOURCE CODE" index="03">
          <label htmlFor="programInput" className="sr-only">
            Source Code
          </label>
          <textarea
            id="programInput"
            rows={10}
            placeholder="Enter program / source code..."
            className="w-full resize-none rounded-xl border border-line bg-[#fdfcf8] p-3 font-mono text-xs leading-relaxed text-ink outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50"
            value={record.source_code}
            onChange={(e) => onFieldChange("source_code", e.target.value)}
          />
        </AccordionSection>

        <AccordionSection title="OUTPUT" index="04">
          <label htmlFor="outputInput" className={labelClass}>
            Output Text
          </label>
          <textarea
            id="outputInput"
            rows={5}
            placeholder="Enter optional output text..."
            className={`mb-3 ${textareaClass}`}
            value={record.output}
            onChange={(e) => onFieldChange("output", e.target.value)}
          />

          <div className="image-upload-area">
            <label
              htmlFor="outputImagesInput"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-[#fdfcf8] p-2.5 text-xs font-semibold text-ink-soft transition-all hover:border-accent/50 hover:bg-accent-soft/40 hover:text-accent-ink"
            >
              <ImagePlus className="h-4 w-4" strokeWidth={2} />
              <span>Add Output Images</span>
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
        </AccordionSection>

        <AccordionSection title="REVIEW QUESTIONS" index="05">
          <div className="mb-2.5 flex items-center justify-between">
            <label htmlFor="reviewInput" className="text-xs font-semibold text-ink-soft">
              Review Questions
            </label>
            <label htmlFor="reviewEnabledToggle" className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-ink-soft/80">
                {record.review_questions_enabled ? "Included in record" : "Excluded from record"}
              </span>
              <span className="relative inline-flex">
                <input
                  id="reviewEnabledToggle"
                  type="checkbox"
                  className="peer sr-only"
                  checked={record.review_questions_enabled}
                  onChange={(e) => onFieldChange("review_questions_enabled", e.target.checked)}
                />
                <span className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-accent" />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </div>
          <textarea
            id="reviewInput"
            rows={7}
            placeholder="Enter review questions and answers..."
            disabled={!record.review_questions_enabled}
            className={`${textareaClass} ${!record.review_questions_enabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`}
            value={record.review_questions}
            onChange={(e) => onFieldChange("review_questions", e.target.value)}
          />
        </AccordionSection>

        <AccordionSection title="RESULT" index="06">
          <label htmlFor="resultInput" className="sr-only">
            Result
          </label>
          <textarea
            id="resultInput"
            rows={6}
            placeholder="Enter final result..."
            className={textareaClass}
            value={record.result}
            onChange={(e) => onFieldChange("result", e.target.value)}
          />
        </AccordionSection>
      </div>
    </div>
  );
}
