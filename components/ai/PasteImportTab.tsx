"use client";

import { Download, FlaskConical } from "lucide-react";
import { buildSampleTaggedData, cleanLLMHTML, createNewGenerationId, parseLabRecordHTML, validateLabRecord } from "@/lib/aiAssistant";
import type { ParsedLabRecord } from "@/lib/aiAssistant";

interface PasteImportTabProps {
  importText: string;
  onImportTextChange: (v: string) => void;
  titleHint: string;
  langHint: string;
  onError: (msg: string) => void;
  onImported: (parsed: ParsedLabRecord, generationId: string) => void;
  onClose: () => void;
}

export function PasteImportTab({
  importText,
  onImportTextChange,
  titleHint,
  langHint,
  onError,
  onImported,
  onClose,
}: PasteImportTabProps) {
  function handleImport() {
    onError("");
    try {
      const cleanHTML = cleanLLMHTML(importText);
      const parsed = parseLabRecordHTML(cleanHTML);
      validateLabRecord(parsed);
      onImported(parsed, createNewGenerationId());
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse content.");
    }
  }

  function handleLoadSample() {
    onImportTextChange(buildSampleTaggedData(titleHint.trim().toUpperCase(), langHint.trim()));
    onError("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft/80 leading-relaxed">
        Paste the LLM&apos;s output or HTML below. Record Lab will parse tags like{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;aim&gt;</code>,{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;algorithm&gt;</code>,{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;sourcecode&gt;</code>,{" "}
        <code className="bg-accent-soft/60 px-1 py-0.5 rounded text-accent-ink font-mono">&lt;output&gt;</code> and place
        the content into your record fields automatically.
      </p>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="aiImportTextarea" className="text-xs font-semibold text-ink-soft">
            Pasted LLM Response / HTML Data <span className="text-red-500 font-semibold">*</span>
          </label>
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline"
          >
            <FlaskConical className="h-3 w-3" strokeWidth={2} />
            <span>Load Sample Tagged Data</span>
          </button>
        </div>
        <textarea
          id="aiImportTextarea"
          rows={9}
          placeholder={
            "Paste response here, e.g.:\n<title>EXPERIMENT TITLE</title>\n<aim>To write and execute...</aim>\n<algorithm>Step 1: Start...</algorithm>\n<sourcecode>def main(): ...</sourcecode>\n<output>Computed result...</output>\n<review>Q1: ... A1: ...</review>\n<result>Thus, the program executed...</result>"
          }
          className="w-full font-mono text-xs rounded-xl border border-line p-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 bg-[#fdfcf8] focus:bg-white leading-relaxed resize-none transition-all"
          value={importText}
          onChange={(e) => onImportTextChange(e.target.value)}
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleImport}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover sm:w-auto"
        >
          <Download className="h-4 w-4" strokeWidth={2.25} />
          <span>Import &amp; Auto-Fill Record</span>
        </button>
      </div>
    </div>
  );
}
