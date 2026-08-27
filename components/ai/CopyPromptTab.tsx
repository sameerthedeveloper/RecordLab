"use client";

import { useState } from "react";
import { ChevronDown, Check, Copy } from "lucide-react";
import { buildLabRecordPrompt } from "@/lib/aiAssistant";

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
}

const inputClass =
  "w-full rounded-xl border border-line p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50 transition-all";
const textareaClass =
  "w-full resize-none rounded-xl border border-line p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

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
}: CopyPromptTabProps) {
  const [copied, setCopied] = useState(false);
  const promptText = buildLabRecordPrompt({
    experimentTitle: title,
    programmingLanguage: lang,
    problemRequirements: requirement,
    customInstructions: custom,
  });

  async function handleCopy() {
    onError("");
    if (!title.trim() || !lang.trim() || !requirement.trim()) {
      onError("Please fill in Experiment Title, Programming Language, and Program Requirement before copying prompt.");
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
      onError("Failed to copy automatically. You can copy the prompt from the preview box below.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft/80 leading-relaxed">
        Enter experiment details to create a prefilled prompt requesting the LLM to output content inside structured
        HTML tags (
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;aim&gt;</code>,{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;algorithm&gt;</code>,{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;sourcecode&gt;</code>).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="aiTitleInput" className={labelClass}>
            Experiment Title <span className="text-red-500 font-semibold">*</span>
          </label>
          <input
            id="aiTitleInput"
            type="text"
            placeholder="Example: Binary Search Tree"
            className={inputClass}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="aiLangInput" className={labelClass}>
            Programming Language <span className="text-red-500 font-semibold">*</span>
          </label>
          <input
            id="aiLangInput"
            type="text"
            placeholder="Example: Python / C++"
            className={inputClass}
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="aiReqInput" className={labelClass}>
          Program / Problem Requirement <span className="text-red-500 font-semibold">*</span>
        </label>
        <textarea
          id="aiReqInput"
          rows={2}
          placeholder="Describe what the program should implement (e.g. tree insertion, deletion, and in-order traversal)..."
          className={textareaClass}
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
          className={textareaClass}
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      </div>

      <details className="rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer items-center justify-between p-3 select-none text-xs font-bold text-ink uppercase tracking-wider">
          <span>VIEW PREFILLED PROMPT PREVIEW</span>
          <ChevronDown className="dropdown-icon h-4 w-4 text-ink-soft/50" strokeWidth={2.25} />
        </summary>
        <div className="px-3 pb-3">
          <pre className="text-xs font-mono whitespace-pre-wrap bg-[#faf7f0] p-3 rounded-xl border border-line text-ink max-h-44 overflow-y-auto leading-relaxed">
            {promptText}
          </pre>
        </div>
      </details>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${
            copied
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-accent text-white border-accent hover:bg-accent-hover"
          }`}
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          <span>{copied ? "Copied to Clipboard!" : "Copy Prefilled Prompt"}</span>
        </button>
      </div>
    </div>
  );
}
