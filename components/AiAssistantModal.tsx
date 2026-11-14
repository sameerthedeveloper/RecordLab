"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "./Modal";
import { CopyPromptTab } from "./ai/CopyPromptTab";
import { PasteImportTab } from "./ai/PasteImportTab";
import { DirectLlmTab } from "./ai/DirectLlmTab";
import { createNewGenerationId } from "@/lib/aiAssistant";
import { useAiConfig } from "@/lib/aiConfig";
import type { AiStart } from "@/lib/settings";
import type { AiContext, ParsedLabRecord } from "@/lib/aiAssistant";

interface AiAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (parsed: ParsedLabRecord, experimentTitle: string, runAfter?: boolean) => void;
  /** Department and (custom) section layout the prompt is written for. */
  context?: AiContext;
  /** The tab the person chose in Settings. */
  start?: AiStart;
}

type AiTab = "prompt" | "import" | "direct";

export function AiAssistantModal({ open, onClose, onImport, context, start = "prompt" }: AiAssistantModalProps) {
  const directOn = useAiConfig()?.enabled !== false;
  const [activeTab, setActiveTab] = useState<AiTab>("prompt");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("");
  const [requirement, setRequirement] = useState("");
  const [custom, setCustom] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState("");
  const [runAfter, setRunAfter] = useState(false);
  const activeGenerationIdRef = useRef<string | null>(null);

  // Each time it opens, start on the tab chosen in Settings (Direct LLM only while an admin has it on).
  useEffect(() => {
    if (open) setActiveTab(start === "direct" && !directOn ? "prompt" : start);
  }, [open, start, directOn]);

  if (!open) return null;

  function switchTab(tab: AiTab) {
    setActiveTab(tab);
    setError("");
  }

  function handleImported(parsed: ParsedLabRecord, generationId: string) {
    activeGenerationIdRef.current = generationId;
    onImport(parsed, title, runAfter);
  }

  function beginGeneration(): string {
    const id = createNewGenerationId();
    activeGenerationIdRef.current = id;
    return id;
  }

  function commitIfActive(generationId: string, parsed: ParsedLabRecord, experimentTitle: string): boolean {
    if (generationId !== activeGenerationIdRef.current) return false;
    onImport(parsed, experimentTitle, runAfter);
    return true;
  }

  const tabs: { id: AiTab; label: string }[] = [
    { id: "prompt", label: "Copy prompt" },
    { id: "import", label: "Paste & import" },
    ...(directOn ? [{ id: "direct" as AiTab, label: "Direct LLM" }] : []),
  ];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI prompt & import"
      variant="sheet"
      size="lg"
      bodyClassName="bg-black/[0.03] p-4 pb-6 sm:p-6 sm:pb-7"
    >
      <div className="space-y-5">
        <div role="tablist" aria-label="AI assistant" className="relative grid auto-cols-fr grid-flow-col rounded-[10px] bg-black/[0.07] p-0.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-[8px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            style={{ width: `calc((100% - 4px) / ${tabs.length})`, transform: `translateX(${activeIndex * 100}%)` }}
          />
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => switchTab(t.id)}
              className={`relative z-10 min-h-9 rounded-[8px] px-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                activeTab === t.id ? "font-semibold text-ink" : "font-medium text-ink-soft/80 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!context?.layout && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 text-xs text-ink-soft shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]">
            <input type="checkbox" checked={runAfter} onChange={(e) => setRunAfter(e.target.checked)} className="mt-0.5 accent-[#c2410c]" />
            <span>
              <span className="font-semibold text-ink">Run the program after importing</span>
              <span className="block text-ink-soft/80">Captures the real output (and graphs) instead of the AI&apos;s sample output. You review it before it goes in.</span>
            </span>
          </label>
        )}

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
            context={context}
            onGoImport={() => switchTab("import")}
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
            context={context}
          />
        )}

        {activeTab === "direct" && directOn && (
          <DirectLlmTab
            title={title}
            lang={lang}
            requirement={requirement}
            custom={custom}
            onError={setError}
            beginGeneration={beginGeneration}
            commitIfActive={commitIfActive}
            onClose={onClose}
            context={context}
          />
        )}
      </div>
    </Modal>
  );
}
