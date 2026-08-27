"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, TimerReset } from "lucide-react";
import {
  cleanLLMHTML,
  DEFAULT_NIM_MODEL,
  generateLabRecordViaGemini,
  generateLabRecordViaNim,
  parseLabRecordHTML,
  validateLabRecord,
} from "@/lib/aiAssistant";
import { createRateLimiter } from "@/lib/rateLimiter";
import type { ParsedLabRecord } from "@/lib/aiAssistant";

interface DirectLlmTabProps {
  title: string;
  lang: string;
  requirement: string;
  custom: string;
  onError: (msg: string) => void;
  beginGeneration: () => string;
  commitIfActive: (generationId: string, parsed: ParsedLabRecord, experimentTitle: string) => boolean;
  onClose: () => void;
}

type Provider = "gemini" | "nim";

// Shared across both providers: at most 5 direct-generation requests per
// rolling 60s window, so a mis-click (or an impatient double submit) can't
// burn through a student's free-tier API quota.
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

const inputClass =
  "w-full rounded-xl border border-line p-2.5 text-sm text-ink outline-none bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-soft/50 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

export function DirectLlmTab({
  title,
  lang,
  requirement,
  custom,
  onError,
  beginGeneration,
  commitIfActive,
  onClose,
}: DirectLlmTabProps) {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [nimModel, setNimModel] = useState(DEFAULT_NIM_MODEL);
  const [generating, setGenerating] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(0);

  const limiterRef = useRef(createRateLimiter(MAX_REQUESTS_PER_WINDOW, WINDOW_MS));

  useEffect(() => {
    if (retryAfterMs <= 0) return;
    const interval = window.setInterval(() => {
      setRetryAfterMs((prev) => Math.max(0, prev - 250));
    }, 250);
    return () => window.clearInterval(interval);
  }, [retryAfterMs]);

  async function handleGenerate() {
    onError("");

    if (!title.trim() || !lang.trim() || !requirement.trim()) {
      onError("Please fill in Experiment Title, Programming Language, and Program Requirement.");
      return;
    }

    if (!apiKey.trim()) {
      onError(
        `Direct generation requires a ${
          provider === "gemini" ? "Gemini" : "NVIDIA NIM"
        } API key. Alternatively, click 'Copy Prefilled Prompt' to copy the structured prompt for your LLM, then paste the generated HTML into the Import box.`
      );
      return;
    }

    const rateCheck = limiterRef.current.tryConsume();
    if (!rateCheck.allowed) {
      setRetryAfterMs(rateCheck.retryAfterMs);
      onError(
        `Rate limit reached (${MAX_REQUESTS_PER_WINDOW} requests / minute). Try again in ${Math.ceil(
          rateCheck.retryAfterMs / 1000
        )}s.`
      );
      return;
    }

    const generationId = beginGeneration();
    setGenerating(true);

    try {
      const rawHTML =
        provider === "gemini"
          ? await generateLabRecordViaGemini({
              experimentTitle: title,
              programmingLanguage: lang,
              problemRequirements: requirement,
              customInstructions: custom,
              apiKey: apiKey.trim(),
            })
          : await generateLabRecordViaNim({
              experimentTitle: title,
              programmingLanguage: lang,
              problemRequirements: requirement,
              customInstructions: custom,
              apiKey: apiKey.trim(),
              model: nimModel.trim() || DEFAULT_NIM_MODEL,
            });

      const cleanHTML = cleanLLMHTML(rawHTML);
      const parsed = parseLabRecordHTML(cleanHTML);
      validateLabRecord(parsed);

      if (commitIfActive(generationId, parsed, title)) {
        onClose();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to generate record. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const rateLimited = retryAfterMs > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft/80 leading-relaxed">
        Generate directly inside Record Lab using your own API key. Limited to {MAX_REQUESTS_PER_WINDOW} requests per
        minute.
      </p>

      <div>
        <span className={labelClass}>LLM Provider</span>
        <div className="flex rounded-xl border border-line bg-[#faf7f0] p-1 text-xs font-medium gap-1">
          <button
            type="button"
            onClick={() => setProvider("gemini")}
            className={`flex-1 rounded-lg py-2 px-3 text-center transition-all ${
              provider === "gemini" ? "bg-white font-semibold text-ink shadow-sm" : "text-ink-soft/70 hover:text-ink-soft"
            }`}
          >
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => setProvider("nim")}
            className={`flex-1 rounded-lg py-2 px-3 text-center transition-all ${
              provider === "nim" ? "bg-white font-semibold text-ink shadow-sm" : "text-ink-soft/70 hover:text-ink-soft"
            }`}
          >
            NVIDIA NIM
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="aiApiKeyInput" className={labelClass}>
          {provider === "gemini" ? "Gemini API Key" : "NVIDIA NIM API Key"}
        </label>
        <input
          id="aiApiKeyInput"
          type="password"
          placeholder={
            provider === "gemini" ? "Enter Gemini API key..." : "Enter NVIDIA NIM API key (nvapi-...)..."
          }
          className={inputClass}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <span className="mt-1 block text-[10px] text-ink-soft/60">
          {provider === "gemini"
            ? "Uses gemini-1.5-flash. Get a key from Google AI Studio."
            : "Uses the NIM catalog's OpenAI-compatible chat endpoint. Get a key from build.nvidia.com."}
        </span>
      </div>

      {provider === "nim" && (
        <div>
          <label htmlFor="nimModelInput" className={labelClass}>
            Model <span className="text-ink-soft/50 font-normal">(optional)</span>
          </label>
          <input
            id="nimModelInput"
            type="text"
            placeholder={DEFAULT_NIM_MODEL}
            className={`${inputClass} font-mono text-xs`}
            value={nimModel}
            onChange={(e) => setNimModel(e.target.value)}
          />
        </div>
      )}

      {rateLimited && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <TimerReset className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>Rate limit reached — try again in {Math.ceil(retryAfterMs / 1000)}s.</span>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || rateLimited}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50 sm:w-auto"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          )}
          <span>{generating ? "Generating Record..." : "Direct Generate"}</span>
        </button>
      </div>
    </div>
  );
}
