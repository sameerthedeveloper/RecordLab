"use client";

import { Download, FlaskConical } from "lucide-react";
import { buildSampleTaggedData, cleanLLMHTML, createNewGenerationId, parseLabRecordHTML, validateLabRecord } from "@/lib/aiAssistant";
import type { AiContext, ParsedLabRecord } from "@/lib/aiAssistant";

interface PasteImportTabProps {
  importText: string;
  onImportTextChange: (v: string) => void;
  titleHint: string;
  langHint: string;
  onError: (msg: string) => void;
  onImported: (parsed: ParsedLabRecord, generationId: string) => void;
  onClose: () => void;
  context?: AiContext;
}

export function PasteImportTab({
  importText,
  onImportTextChange,
  titleHint,
  langHint,
  onError,
  onImported,
  onClose,
  context,
}: PasteImportTabProps) {
  function handleImport() {
    onError("");
    try {
      const cleanHTML = cleanLLMHTML(importText);
      const parsed = parseLabRecordHTML(cleanHTML, context);
      validateLabRecord(parsed, context);
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

  const hasText = importText.trim().length > 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)] focus-within:shadow-[0_0_0_2px_rgba(194,65,12,0.35)] transition-shadow">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
            <label htmlFor="aiImportTextarea" className="text-[15px] text-ink">
              AI answer
            </label>
            {!context?.layout && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <FlaskConical className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Try a sample</span>
              </button>
            )}
          </div>
          {/* Ruled lab sheet: blue lines every 24px and a red margin rule, like the page the record prints on. */}
          <textarea
            id="aiImportTextarea"
            rows={9}
            placeholder={
              "Paste the whole reply here.\n<aim>To write and execute...</aim>\n<algorithm>Step 1: Start...</algorithm>\n<sourcecode>def main(): ...</sourcecode>\n<output>Computed result...</output>\n<result>Thus, the program executed...</result>"
            }
            className="mt-1 block w-full resize-none bg-transparent py-0 pl-[3.25rem] pr-4 font-mono text-xs leading-6 text-ink outline-none placeholder:text-ink-soft/40"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent 2.5rem, rgba(220,38,38,0.35) 2.5rem, rgba(220,38,38,0.35) calc(2.5rem + 1px), transparent calc(2.5rem + 1px)), repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(59,130,246,0.16) 23px, rgba(59,130,246,0.16) 24px)",
              backgroundAttachment: "local",
            }}
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
          />
        </div>
        <p className="px-4 pt-1.5 text-xs leading-relaxed text-ink-soft/70">
          Record Lab reads tags like aim, algorithm, sourcecode and output and fills your record. Nothing is saved until the import.
        </p>
      </div>

      <button
        type="button"
        onClick={handleImport}
        disabled={!hasText}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(194,65,12,0.8)] transition hover:bg-accent-hover active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Download className="h-4 w-4" strokeWidth={2.25} />
        <span>Fill my record</span>
      </button>
    </div>
  );
}
