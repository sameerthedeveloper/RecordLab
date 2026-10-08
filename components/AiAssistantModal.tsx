"use client";

import { useRef, useState } from "react";
import { AlertCircle, Copy, Sparkles, Upload, Zap } from "lucide-react";
import { Modal, modalButton } from "./Modal";
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
    <Modal
      open={open}
      onClose={onClose}
      title="AI prompt & import"
      description="Copy a ready-made prompt, or paste the answer to fill the record"
      icon={Sparkles}
      size="lg"
      bodyClassName="p-4 sm:p-5"
      footer={
        <button type="button" onClick={onClose} className={modalButton.secondary}>
          Close
        </button>
      }
    >
      <div className="space-y-3.5">
        <div className="mb-3.5 flex rounded-xl border border-line bg-[#faf7f0] p-1 text-xs font-medium gap-1">
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
    </Modal>
  );
}
