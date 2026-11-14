"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Copy, Sparkles, Upload, Zap } from "lucide-react";
import { Modal, modalButton } from "./Modal";
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
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const activeGenerationIdRef = useRef<string | null>(null);

  // Each time it opens, start on the tab chosen in Settings (Direct LLM only while an admin has it on).
  useEffect(() => {
    if (open) setActiveTab(start === "direct" && !directOn ? "prompt" : start);
  }, [open, start, directOn]);

  if (!open) return null;

  function switchTab(tab: AiTab) {
    if (tab !== activeTab) navigator.vibrate?.(8);
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

  const tabs: { id: AiTab; label: string; icon: typeof Copy }[] = [
    { id: "prompt", label: "Copy prompt", icon: Copy },
    { id: "import", label: "Paste & import", icon: Upload },
    ...(directOn ? [{ id: "direct" as const, label: "Direct LLM", icon: Zap }] : []),
  ];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI prompt & import"
      description="Copy a ready-made prompt, or paste the answer to fill the record"
      icon={Sparkles}
      size="lg"
      iconClassName="!h-auto !w-auto !border-0 !bg-none !bg-transparent !shadow-none !text-accent"
      footerClassName="max-sm:hidden"
      bodyClassName="px-4 pb-0 pt-3 sm:p-5"
      footer={
        <button type="button" onClick={onClose} className={modalButton.secondary}>
          Close
        </button>
      }
    >
      <div className="space-y-3.5">
        <div className="ai-seg relative flex rounded-xl bg-[var(--tint-strong)] p-0.5 text-xs max-sm:min-h-10" role="tablist">
          <span
            aria-hidden
            className="ai-thumb absolute inset-y-0.5 left-0.5 rounded-[9px] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
            style={{ width: `calc((100% - 4px) / ${tabs.length})`, transform: `translateX(${activeIndex * 100}%)` }}
          />
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => switchTab(id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 py-1.5 transition-colors duration-200 ${
                activeTab === id ? "font-semibold text-ink" : "font-medium text-ink-soft/70 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {!context?.layout && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink-soft">
            <input type="checkbox" checked={runAfter} onChange={(e) => setRunAfter(e.target.checked)} className="mt-0.5 accent-[#c2410c]" />
            <span>
              <span className="font-semibold text-ink">Run the program after importing</span>
              <span className="block text-ink-soft/80">Captures the real output (and graphs) instead of the AI&apos;s sample output. You review it before it goes in.</span>
            </span>
          </label>
        )}

        {error && (
          <div role="alert" className="ai-err flex rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <div
          key={activeTab}
          className="ai-pane"
          onTouchStart={(e) => {
            swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            const from = swipe.current;
            swipe.current = null;
            if (!from || (e.target as HTMLElement).closest("input,textarea,pre,select")) return;
            const dx = e.changedTouches[0].clientX - from.x;
            const dy = e.changedTouches[0].clientY - from.y;
            if (Math.abs(dx) < 70 || Math.abs(dy) > 40) return;
            const next = tabs[activeIndex + (dx < 0 ? 1 : -1)];
            if (next) switchTab(next.id);
          }}
        >
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
      </div>
    </Modal>
  );
}
