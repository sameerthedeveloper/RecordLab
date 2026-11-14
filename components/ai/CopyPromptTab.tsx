"use client";

import { useState } from "react";
import { ChevronDown, Check, Copy } from "lucide-react";
import { buildLabRecordPrompt, type AiContext } from "@/lib/aiAssistant";

interface CopyPromptTabProps {
  title: string;
  lang: string;
  requirement: string;
  custom: string;
  onTitleChange: (v: string) => void;
  onLangChange: (v: string) => void;
  onRequirementChange: (v: string) => void;
  onCustomChange: (v: string) => void;
  onError: (msg: string) => void;
  context?: AiContext;
}

// Apple-style inset-grouped form: rows share one rounded card, split by hairlines.
const group =
  "overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] divide-y divide-[var(--hairline)]";
const rowLabel = "text-[13px] font-medium text-ink sm:w-40 sm:shrink-0";
const field =
  "w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-soft/45 sm:text-[15px] sm:text-right";
const area =
  "w-full resize-none bg-transparent text-base sm:text-[15px] leading-snug text-ink outline-none placeholder:text-ink-soft/45";
const req = <span className="text-accent"> *</span>;
const opt = <span className="font-normal text-ink-soft/60"> · optional</span>;

export function CopyPromptTab({
  title,
  lang,
  requirement,
  custom,
  onTitleChange,
  onLangChange,
  onRequirementChange,
  onCustomChange,
  onError,
  context,
}: CopyPromptTabProps) {
  const [copied, setCopied] = useState(false);
  const programming = !context?.layout;
  const promptText = buildLabRecordPrompt({
    experimentTitle: title,
    programmingLanguage: lang,
    problemRequirements: requirement,
    customInstructions: custom,
    context,
  });

  async function handleCopy() {
    onError("");
    if (!title.trim() || (programming && !lang.trim()) || !requirement.trim()) {
      onError(
        programming
          ? "Please fill in Experiment Title, Programming Language, and Program Requirement before copying prompt."
          : "Please fill in the Experiment Title and what the experiment covers before copying the prompt.",
      );
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const tempArea = document.createElement("textarea");
        tempArea.value = promptText;
        document.body.appendChild(tempArea);
        tempArea.select();
        document.execCommand("copy");
        document.body.removeChild(tempArea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      onError(
        "Failed to copy automatically. You can copy the prompt from the preview box below.",
      );
    }
  }

  return (
    <div className="ai-stagger space-y-4">
      {context?.department.trim() && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft/70 px-3 py-1 text-xs font-medium text-accent-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Written for {context.department.trim()}
          {context.layout
            ? `, using this record's ${context.layout.filter((s) => s.kind !== "lines").length} sections`
            : ""}
        </p>
      )}

      <div className={group}>
        <label
          htmlFor="aiTitleInput"
          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className={rowLabel}>Experiment title{req}</span>
          <input
            id="aiTitleInput"
            type="text"
            placeholder="Binary Search Tree"
            className={field}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </label>
        <label
          htmlFor="aiLangInput"
          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className={rowLabel}>
            {programming ? <>Language{req}</> : <>Apparatus / tools{opt}</>}
          </span>
          <input
            id="aiLangInput"
            type="text"
            placeholder={
              programming
                ? "Python / C++"
                : "Ammeter, voltmeter, 100 Ω resistor"
            }
            className={field}
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
          />
        </label>
      </div>

      <div className={group}>
        <label htmlFor="aiReqInput" className="block px-4 py-3">
          <span className="mb-1 block text-[13px] font-medium text-ink">
            {programming
              ? "What the program should do"
              : "What the experiment covers"}
            {req}
          </span>
          <textarea
            id="aiReqInput"
            rows={2}
            placeholder={
              programming
                ? "Tree insertion, deletion and in-order traversal"
                : "Verify Ohm's law by plotting V against I for a fixed resistor"
            }
            className={area}
            value={requirement}
            onChange={(e) => onRequirementChange(e.target.value)}
          />
        </label>
        <label htmlFor="aiCustomInput" className="block px-4 py-3">
          <span className="mb-1 block text-[13px] font-medium text-ink">
            Extra instructions{opt}
          </span>
          <textarea
            id="aiCustomInput"
            rows={2}
            placeholder="Number the algorithm steps, add viva questions"
            className={area}
            value={custom}
            onChange={(e) => onCustomChange(e.target.value)}
          />
        </label>
      </div>

      <details className={`${group} ai-details`}>
        <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-[13px] font-medium text-ink">
          <span>Preview prompt</span>
          <ChevronDown
            className="dropdown-icon h-4 w-4 text-ink-soft/50"
            strokeWidth={2.25}
          />
        </summary>
        <div className="p-3">
          <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[var(--tint)] p-3 font-mono text-xs leading-relaxed text-ink">
            {promptText}
          </pre>
        </div>
      </details>

      <p className="px-1 text-xs leading-relaxed text-ink-soft/70">
        The AI replies inside tags (
        <code className="font-mono text-accent-ink">&lt;aim&gt;</code>,{" "}
        <code className="font-mono text-accent-ink">&lt;algorithm&gt;</code>,{" "}
        <code className="font-mono text-accent-ink">&lt;sourcecode&gt;</code>)
        so Paste &amp; Import can fill the record.
      </p>

      <div className="ai-dock">
        <button
          type="button"
          onClick={handleCopy}
          className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] max-sm:min-h-12 font-semibold transition-all active:scale-[0.98] ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-accent text-white shadow-sm hover:bg-accent-hover"
          }`}
        >
          {copied ? (
            <Check key="ok" className="ai-pop h-4 w-4" strokeWidth={2.5} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={2} />
          )}
          <span>{copied ? "Copied" : "Copy prompt"}</span>
        </button>
      </div>
    </div>
  );
}
