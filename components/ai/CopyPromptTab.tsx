"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, Copy, Share2 } from "lucide-react";
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
  /** Jumps to the Paste & Import tab, offered once the prompt is copied. */
  onGoImport?: () => void;
}

const fieldBase =
  "w-full rounded-xl border bg-white p-3 text-sm text-ink outline-none placeholder:text-ink-soft/45 transition-colors focus:ring-2";
const fieldOk = "border-line hover:border-accent/40 focus:border-accent focus:ring-accent/15";
const fieldBad = "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-200/60";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-ink";
const hintClass = "mt-1.5 text-xs text-ink-soft/70";

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
  onGoImport,
}: CopyPromptTabProps) {
  const [copied, setCopied] = useState(false);
  // Set after a copy attempt with missing fields, so only then do empty required fields turn red.
  const [tried, setTried] = useState(false);
  // Phones get the system share sheet, so the prompt goes straight into ChatGPT, Claude, Gemini and so on.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setCanShare(touch && typeof navigator.share === "function");
  }, []);
  const programming = !context?.layout;
  const promptText = buildLabRecordPrompt({
    experimentTitle: title,
    programmingLanguage: lang,
    problemRequirements: requirement,
    customInstructions: custom,
    context,
  });

  const missingTitle = tried && !title.trim();
  const missingLang = tried && programming && !lang.trim();
  const missingReq = tried && !requirement.trim();
  const sectionCount = context?.layout ? context.layout.filter((s) => s.kind !== "lines").length : 0;
  const promptWords = promptText.trim().split(/\s+/).length;

  function ready(): boolean {
    onError("");
    if (!title.trim() || (programming && !lang.trim()) || !requirement.trim()) {
      setTried(true);
      onError(programming ? "Please fill in Experiment Title, Programming Language, and Program Requirement before copying prompt." : "Please fill in the Experiment Title and what the experiment covers before copying the prompt.");
      return false;
    }
    return true;
  }

  async function handleShare() {
    if (!ready()) return;
    try {
      await navigator.share({ title: `Lab record: ${title.trim()}`, text: promptText });
    } catch (err) {
      // Closing the sheet is not an error; anything else falls back to copying.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await handleCopy();
    }
  }

  async function handleCopy() {
    if (!ready()) return;

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
      window.setTimeout(() => setCopied(false), 6000);
    } catch {
      onError("Failed to copy automatically. You can copy the prompt from the preview box below.");
    }
  }

  return (
    <div className="space-y-3">
      {context?.department.trim() && (
        <p className="rounded-xl bg-accent-soft/50 px-3 py-2 text-xs font-semibold text-accent-ink">
          Tailored to {context.department.trim()}
          {context.layout ? ` and the ${sectionCount} ${sectionCount === 1 ? "section" : "sections"} in this record` : ""}.
        </p>
      )}
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Fill in the experiment, copy the prompt into any AI chat, then bring the answer back through{" "}
        <strong className="font-semibold text-ink">Paste &amp; Import</strong>. The AI replies in tagged blocks such as{" "}
        <code className="rounded bg-accent-soft/60 px-1 py-0.5 font-mono text-[12px] text-accent-ink">&lt;aim&gt;</code> so each part lands in the right section.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="aiTitleInput" className={labelClass}>
            Experiment Title <span className="text-red-500 font-semibold">*</span>
          </label>
          <input
            id="aiTitleInput"
            type="text"
            placeholder="Example: Binary Search Tree"
            className={`${fieldBase} ${missingTitle ? fieldBad : fieldOk}`}
            aria-invalid={missingTitle}
            aria-required="true"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="aiLangInput" className={labelClass}>
            {programming ? (
              <>
                Programming Language <span className="text-red-500 font-semibold">*</span>
              </>
            ) : (
              <>
                Apparatus / tools <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </>
            )}
          </label>
          <input
            id="aiLangInput"
            type="text"
            placeholder={programming ? "Example: Python / C++" : "Example: Ammeter, voltmeter, 100 Ω resistor"}
            className={`${fieldBase} ${missingLang ? fieldBad : fieldOk}`}
            aria-invalid={missingLang}
            aria-required={programming}
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="aiReqInput" className={labelClass}>
          {programming ? "Program / Problem Requirement" : "What the experiment covers"} <span className="text-red-500 font-semibold">*</span>
        </label>
        <textarea
          id="aiReqInput"
          rows={3}
          placeholder={programming ? "Describe what the program should implement (e.g. tree insertion, deletion, and in-order traversal)..." : "Describe the experiment (e.g. verify Ohm's law by plotting V against I for a fixed resistor)..."}
          className={`${fieldBase} resize-none ${missingReq ? fieldBad : fieldOk}`}
          aria-invalid={missingReq}
          aria-required="true"
          value={requirement}
          onChange={(e) => onRequirementChange(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="aiCustomInput" className={labelClass}>
          Custom Instructions <span className="text-gray-400 font-normal text-xs">(Optional)</span>
        </label>
        <textarea
          id="aiCustomInput"
          rows={2}
          placeholder="Example: Keep algorithm in Step 1 format, generate viva questions..."
          className={`${fieldBase} resize-none ${fieldOk}`}
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
        />
        <p className={hintClass}>Tell the AI how to write it: length, format, extra sections.</p>
      </div>

      <details className="group rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl p-3 text-[13px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <span>
            Preview the prompt <span className="font-normal text-ink-soft/70">({promptWords} words)</span>
          </span>
          <ChevronDown className="dropdown-icon h-4 w-4 text-ink-soft/50 transition-transform group-open:rotate-180" strokeWidth={2.25} />
        </summary>
        <div className="px-3 pb-3">
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-[#faf7f0] p-3 font-mono text-xs leading-relaxed text-ink">
            {promptText}
          </pre>
        </div>
      </details>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
        {copied && onGoImport && (
          <button
            type="button"
            onClick={onGoImport}
            className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:mr-auto"
          >
            Got the answer? Paste &amp; Import
          </button>
        )}
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.2} />
            <span>Send to ChatGPT, Claude, Gemini…</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors sm:w-auto ${
            copied
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : canShare
                ? "border-line bg-white text-ink-soft hover:border-accent/40 hover:text-accent"
                : "border-accent bg-accent text-white hover:bg-accent-hover"
          } ${canShare ? "min-h-11" : "min-h-12"}`}
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          <span>{copied ? "Copied" : canShare ? "Just copy it" : "Copy prompt"}</span>
        </button>
      </div>
    </div>
  );
}
