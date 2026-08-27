"use client";

import { useRef, useState } from "react";
import { AlertCircle, Copy, Upload, X, Zap } from "lucide-react";
import { CopyPromptTab } from "./ai/CopyPromptTab";
import { PasteImportTab } from "./ai/PasteImportTab";
import { DirectLlmTab } from "./ai/DirectLlmTab";
import { createNewGenerationId } from "@/lib/aiAssistant";
import type { ParsedLabRecord } from "@/lib/aiAssistant";

interface AiAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (parsed: ParsedLabRecord, experimentTitle: string) => void;
}

type AiTab = "prompt" | "import" | "direct";

export function AiAssistantModal({ open, onClose, onImport }: AiAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<AiTab>("prompt");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("");
  const [requirement, setRequirement] = useState("");
  const [custom, setCustom] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState("");
  const activeGenerationIdRef = useRef<string | null>(null);

  if (!open) return null;

  function switchTab(tab: AiTab) {
    setActiveTab(tab);
    setError("");
  }

  function handleImported(parsed: ParsedLabRecord, generationId: string) {
    activeGenerationIdRef.current = generationId;
    onImport(parsed, title);
  }

  function beginGeneration(): string {
    const id = createNewGenerationId();
    activeGenerationIdRef.current = id;
    return id;
  }

  function commitIfActive(generationId: string, parsed: ParsedLabRecord, experimentTitle: string): boolean {
    if (generationId !== activeGenerationIdRef.current) return false;
    onImport(parsed, experimentTitle);
    return true;
  }

  const tabButtonClass = (tab: AiTab) =>
    `flex-1 rounded-lg py-2 px-3 text-center transition-all flex items-center justify-center gap-1.5 border ${
      activeTab === tab
        ? "bg-white font-semibold text-ink shadow-sm border-line"
        : "font-medium text-ink-soft/70 hover:text-ink-soft border-transparent"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-line bg-white shadow-2xl overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-line p-4 bg-white">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Assistant
            </p>
            <h2 className="font-serif text-lg font-bold leading-tight text-ink">AI Prompt &amp; Import</h2>
            <p className="text-xs text-ink-soft/70 mt-0.5">
              Copy prefilled prompts for LLMs or paste HTML / tagged output to auto-fill
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent-ink active:bg-accent-soft"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </button>
        </div>

        <div className="mx-4 mt-3.5 flex rounded-xl border border-line bg-[#faf7f0] p-1 text-xs font-medium gap-1 shrink-0">
          <button type="button" className={tabButtonClass("prompt")} onClick={() => switchTab("prompt")}>
            <Copy className="h-4 w-4" strokeWidth={2} />
            <span>Copy Prompt</span>
          </button>
          <button type="button" className={tabButtonClass("import")} onClick={() => switchTab("import")}>
            <Upload className="h-4 w-4" strokeWidth={2} />
            <span>Paste &amp; Import</span>
          </button>
          <button type="button" className={tabButtonClass("direct")} onClick={() => switchTab("direct")}>
            <Zap className="h-4 w-4" strokeWidth={2} />
            <span>Direct LLM</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          {error && (
            <div className="flex rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "prompt" && (
            <CopyPromptTab
              title={title}
              lang={lang}
              requirement={requirement}
              custom={custom}
              onTitleChange={setTitle}
              onLangChange={setLang}
              onRequirementChange={setRequirement}
              onCustomChange={setCustom}
              onError={setError}
            />
          )}

          {activeTab === "import" && (
            <PasteImportTab
              importText={importText}
              onImportTextChange={setImportText}
              titleHint={title}
              langHint={lang}
              onError={setError}
              onImported={handleImported}
              onClose={onClose}
            />
          )}

          {activeTab === "direct" && (
            <DirectLlmTab
              title={title}
              lang={lang}
              requirement={requirement}
              custom={custom}
              onError={setError}
              beginGeneration={beginGeneration}
              commitIfActive={commitIfActive}
              onClose={onClose}
            />
          )}
        </div>

        <div className="flex justify-end border-t border-line p-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent-ink active:bg-accent-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
