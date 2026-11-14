"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, TimerReset } from "lucide-react";
import {
  buildLabRecordPrompt,
  cleanLLMHTML,
  parseLabRecordHTML,
  validateLabRecord,
} from "@/lib/aiAssistant";
import { AiUserError } from "@/lib/aiServer";
import { generateContent } from "@/lib/puter";
import { createRateLimiter } from "@/lib/rateLimiter";
import { useToast, ToastViewport } from "@/components/Toast";
import type { AiContext, ParsedLabRecord } from "@/lib/aiAssistant";

interface DirectLlmTabProps {
  title: string;
  lang: string;
  requirement: string;
  custom: string;
  onError: (msg: string) => void;
  beginGeneration: () => string;
  commitIfActive: (generationId: string, parsed: ParsedLabRecord, experimentTitle: string) => boolean;
  onClose: () => void;
  context?: AiContext;
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
  context,
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

    const needsLang = !context?.layout;
    if (!title.trim() || (needsLang && !lang.trim()) || !requirement.trim()) {
      onError(needsLang ? "Please fill in Experiment Title, Programming Language, and Program Requirement." : "Please fill in the Experiment Title and what the experiment covers.");
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
        context,
      });

      const rawHTML = await generateContent(prompt);
      const cleanHTML = cleanLLMHTML(rawHTML);
      const parsed = parseLabRecordHTML(cleanHTML, context);
      validateLabRecord(parsed, context);

      if (commitIfActive(generationId, parsed, title)) {
        onClose();
      }
    } catch (err) {
      showToast(err instanceof AiUserError ? err.message : "Generation failed, please try again");
    } finally {
      setGenerating(false);
    }
  }

  const rateLimited = retryAfterMs > 0;
  const blocked = rateLimited;

  const programming = !context?.layout;
  const rows: { label: string; value: string; missing: boolean }[] = [
    { label: "Title", value: title.trim(), missing: true },
    ...(programming ? [{ label: "Language", value: lang.trim(), missing: true }] : lang.trim() ? [{ label: "Apparatus", value: lang.trim(), missing: false }] : []),
    { label: programming ? "Program" : "Covers", value: requirement.trim(), missing: true },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="divide-y divide-black/[0.07] overflow-hidden rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline gap-3 px-4 py-3.5 text-[15px]">
              <span className="w-28 shrink-0 text-ink">{r.label}</span>
              <span className={`min-w-0 flex-1 truncate ${r.value ? "text-ink-soft" : "text-ink-soft/40"}`}>
                {r.value || (r.missing ? "Fill in on Copy prompt" : "")}
              </span>
            </div>
          ))}
        </div>
        <p className="px-4 pt-1.5 text-xs leading-relaxed text-ink-soft/70">
          Uses the details from Copy prompt. Your Record Lab sign-in is all you need, and a linked Puter account is used if you have one. Limit: {MAX_REQUESTS_PER_WINDOW} per minute.
        </p>
      </div>

      {rateLimited && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <TimerReset className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>Rate limit reached. Try again in {Math.ceil(retryAfterMs / 1000)}s.</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || blocked}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(194,65,12,0.8)] transition hover:bg-accent-hover active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : <Sparkles className="h-4 w-4" strokeWidth={2.25} />}
        <span>{generating ? "Writing your record…" : "Generate record"}</span>
      </button>

      <ToastViewport toast={toast} />
    </div>
  );
}
