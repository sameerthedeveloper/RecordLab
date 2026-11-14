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

const group = "overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]";
const rowLabel = "w-28 shrink-0 text-[15px] transition-colors";
const bareInput = "min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft/40";
const foot = "px-4 pt-1.5 text-xs leading-relaxed";

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

  const labelTone = (bad: boolean) => (bad ? "text-red-600" : "text-ink");

  return (
    <div className="space-y-5">
      {context?.department.trim() && (
        <p className="px-1 text-center text-[13px] text-ink-soft">
          Tailored to <span className="font-semibold text-ink">{context.department.trim()}</span>
          {context.layout ? `, ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}` : ""}
        </p>
      )}

      <div>
        <div className={`${group} divide-y divide-black/[0.07]`}>
          <label htmlFor="aiTitleInput" className="flex items-center gap-3 px-4 focus-within:bg-black/[0.015]">
            <span className={`${rowLabel} ${labelTone(missingTitle)}`}>Title</span>
            <input
              id="aiTitleInput"
              type="text"
              placeholder="Binary Search Tree"
              className={bareInput}
              aria-invalid={missingTitle}
              aria-required="true"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </label>

          <label htmlFor="aiLangInput" className="flex items-center gap-3 px-4 focus-within:bg-black/[0.015]">
            <span className={`${rowLabel} ${labelTone(missingLang)}`}>{programming ? "Language" : "Apparatus"}</span>
            <input
              id="aiLangInput"
              type="text"
              placeholder={programming ? "Python, C++" : "Optional: ammeter, voltmeter, 100 Ω"}
              className={bareInput}
              aria-invalid={missingLang}
              aria-required={programming}
              value={lang}
              onChange={(e) => onLangChange(e.target.value)}
            />
          </label>

          <div className="focus-within:bg-black/[0.015]">
            <label htmlFor="aiReqInput" className={`block px-4 pt-3.5 text-[15px] ${labelTone(missingReq)}`}>
              {programming ? "What the program should do" : "What the experiment covers"}
            </label>
            <textarea
              id="aiReqInput"
              rows={3}
              placeholder={programming ? "Tree insertion, deletion and in-order traversal" : "Verify Ohm's law by plotting V against I for a fixed resistor"}
              className="block w-full resize-none bg-transparent px-4 pb-3.5 pt-1 text-[15px] text-ink outline-none placeholder:text-ink-soft/40"
              aria-invalid={missingReq}
              aria-required="true"
              value={requirement}
              onChange={(e) => onRequirementChange(e.target.value)}
            />
          </div>
        </div>
        <p className={`${foot} ${tried && (missingTitle || missingLang || missingReq) ? "text-red-600" : "text-ink-soft/70"}`}>
          {programming ? "Title, language and what the program should do are required." : "Title and what the experiment covers are required."}
        </p>
      </div>

      <div>
        <div className={`${group} focus-within:bg-black/[0.015]`}>
          <label htmlFor="aiCustomInput" className="block px-4 pt-3.5 text-[15px] text-ink">
            Extra instructions
          </label>
          <textarea
            id="aiCustomInput"
            rows={2}
            placeholder="Optional: keep the algorithm in Step 1 format, add viva questions"
            className="block w-full resize-none bg-transparent px-4 pb-3.5 pt-1 text-[15px] text-ink outline-none placeholder:text-ink-soft/40"
            value={custom}
            onChange={(e) => onCustomChange(e.target.value)}
          />
        </div>
        <p className={`${foot} text-ink-soft/70`}>The AI replies in tagged blocks that Paste &amp; Import reads back into your record.</p>
      </div>

      <details className={`group ${group}`}>
        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-[15px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <span>
            Preview prompt <span className="text-ink-soft/60">{promptWords} words</span>
          </span>
          <ChevronDown className="dropdown-icon h-4 w-4 text-ink-soft/50 transition-transform group-open:rotate-180" strokeWidth={2.25} />
        </summary>
        <div className="border-t border-black/[0.07] p-3">
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/[0.035] p-3 font-mono text-xs leading-relaxed text-ink">
            {promptText}
          </pre>
        </div>
      </details>

      <div className="space-y-2 pt-1">
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(194,65,12,0.8)] transition active:scale-[0.985] hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.2} />
            <span>Send to ChatGPT, Claude, Gemini…</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            copied
              ? "bg-emerald-50 text-emerald-700"
              : canShare
                ? "text-accent hover:bg-accent/[0.06]"
                : "bg-accent text-white shadow-[0_8px_20px_-10px_rgba(194,65,12,0.8)] hover:bg-accent-hover"
          }`}
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          <span>{copied ? "Copied" : canShare ? "Just copy it" : "Copy prompt"}</span>
        </button>
        {copied && onGoImport && (
          <button
            type="button"
            onClick={onGoImport}
            className="flex min-h-11 w-full items-center justify-center rounded-full text-[15px] font-medium text-accent hover:bg-accent/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Have the answer? Paste &amp; Import
          </button>
        )}
      </div>
    </div>
  );
}
