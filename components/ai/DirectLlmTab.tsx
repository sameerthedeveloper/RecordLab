"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, TimerReset } from "lucide-react";
import {
  buildLabRecordPrompt,
  cleanLLMHTML,
  parseLabRecordHTML,
  validateLabRecord,
} from "@/lib/aiAssistant";
import { generateContent } from "@/lib/puter";
import { createRateLimiter } from "@/lib/rateLimiter";
import { useToast, ToastViewport } from "@/components/Toast";
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

// At most 5 direct-generation requests per rolling 60s window, so a
// mis-click (or an impatient double submit) can't hammer the shared model.
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

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
  const [generating, setGenerating] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(0);
  const { toast, showToast } = useToast();

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
      const prompt = buildLabRecordPrompt({
        experimentTitle: title,
        programmingLanguage: lang,
        problemRequirements: requirement,
        customInstructions: custom,
      });

      const rawHTML = await generateContent(prompt);
      const cleanHTML = cleanLLMHTML(rawHTML);
      const parsed = parseLabRecordHTML(cleanHTML);
      validateLabRecord(parsed);

      if (commitIfActive(generationId, parsed, title)) {
        onClose();
      }
    } catch {
      showToast("Generation failed, please try again");
    } finally {
      setGenerating(false);
    }
  }

  const rateLimited = retryAfterMs > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft/80 leading-relaxed">
        Generate directly inside Record Lab — powered by Puter.js, no API key needed. Limited to{" "}
        {MAX_REQUESTS_PER_WINDOW} requests per minute.
      </p>

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

      <ToastViewport toast={toast} />
    </div>
  );
}
