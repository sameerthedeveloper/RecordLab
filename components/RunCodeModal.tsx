"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Play, ShieldCheck, Square, Terminal } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { runCode, DEFAULT_REMOTE_URL, type RunResult } from "@/lib/runner";
import { LANGUAGES, detectLanguage, languageInfo, type RunLanguage } from "@/lib/runner/languages";
import { runnableSource } from "@/lib/runner/source";
import type { RecordState } from "@/lib/types";

interface RunCodeModalProps {
  open: boolean;
  onClose: () => void;
  record: RecordState;
  /** Start running as soon as the dialog opens (the person already chose "run" elsewhere). */
  autoRun?: boolean;
  /** Put the captured output in the record. `replace` swaps the current OUTPUT instead of adding below it. */
  /** Remembers the program's input on the record, so it is there next time. */
  onInputChange: (value: string) => void;
  onUse: (result: RunResult, code: string, opts: { replace: boolean; text: boolean; images: boolean }) => void;
}

const CONSENT_KEY = "recordlab.runner-consent";
const REMOTE_KEY = "recordlab.runner-url";

type Phase = "idle" | "running" | "done";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";

/**
 * Runs the record's program and shows what it really printed or drew. Python and JavaScript run
 * on this device; C, C++ and Java are compiled by a runner service the person agrees to first.
 * Nothing reaches the record until "Use in record" is pressed, so results can be inspected first.
 */
export function RunCodeModal({ open, onClose, record, autoRun, onUse, onInputChange }: RunCodeModalProps) {
  const code = runnableSource(record);
  const [choice, setChoice] = useState<RunLanguage | "auto">("auto");
  const stdin = record.program_input ?? "";
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState(DEFAULT_REMOTE_URL);
  const [useText, setUseText] = useState(true);
  const [useImages, setUseImages] = useState(true);
  const [replace, setReplace] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const startedAuto = useRef(false);

  const language: RunLanguage = choice === "auto" ? detectLanguage(code) : choice;
  const info = languageInfo(language);
  const needsConsent = info.where === "remote";

  useEffect(() => {
    if (!open) return;
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1");
      setRemoteUrl(localStorage.getItem(REMOTE_KEY) || DEFAULT_REMOTE_URL);
    } catch {}
    setPhase("idle");
    setResult(null);
    setError("");
    startedAuto.current = false;
    return () => abortRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (open && autoRun && !startedAuto.current && code.trim() && !needsConsent) {
      startedAuto.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoRun]);

  async function run() {
    if (!code.trim()) return;
    if (needsConsent && !consent) return;
    setPhase("running");
    setError("");
    setResult(null);
    setStatus(info.where === "browser" ? "Starting…" : "Sending to the runner…");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await runCode({ language, code, stdin, onStatus: setStatus, signal: ctrl.signal, remoteUrl });
      setResult(r);
      setUseImages(r.images.length > 0);
      setUseText(Boolean(r.stdout.trim()) || r.images.length === 0);
      setPhase("done");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        setPhase("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't run the program.");
      setPhase("idle");
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function remember(v: boolean) {
    setConsent(v);
    try {
      localStorage.setItem(CONSENT_KEY, v ? "1" : "0");
    } catch {}
  }

  const hasOutput = Boolean(result && (result.stdout.trim() || result.images.length));
  const canUse = Boolean(result && hasOutput && (useText || useImages));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run the program"
      description="See the real output before it goes into your record."
      icon={Terminal}
      size="wide"
      bodyClassName="p-5 pb-6 sm:p-7 sm:pb-8"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalButton.secondary}>
            Close
          </button>
          <button
            type="button"
            disabled={!canUse}
            onClick={() => {
              if (result) {
                onUse(result, code, { replace, text: useText, images: useImages });
                onClose();
              }
            }}
            className={`${modalButton.primary} disabled:opacity-50`}
          >
            Use in record
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ---- the program ---- */}
        <section className="min-w-0 space-y-3">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Language</span>
              <select value={choice} onChange={(e) => setChoice(e.target.value as RunLanguage | "auto")} className={`${field} font-sans`}>
                <option value="auto">Auto ({languageInfo(detectLanguage(code)).label})</option>
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="mb-2.5 flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              {info.where === "browser" ? "Runs on this device" : "Runs on a runner service"}
            </span>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Your code</span>
            {code.trim() ? (
              <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-[#faf7f0] p-3 font-mono text-xs leading-relaxed text-ink">{code}</pre>
            ) : (
              <p className="rounded-lg border border-dashed border-line bg-paper/60 p-3 text-xs text-ink-soft">
                There is no code yet. Add the program to the Source code section, then run it.
              </p>
            )}
            <p className="mt-1 text-[11px] text-ink-soft/70">To change the code, close this and edit the Source code section.</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Input for the program <span className="font-normal text-ink-soft/60">(one value per line; filled in by the AI when the program asks for input)</span>
            </span>
            <textarea rows={2} value={stdin} onChange={(e) => onInputChange(e.target.value)} spellCheck={false} className={`${field} resize-y`} placeholder={"5\n10"} />
          </label>

          {needsConsent && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">{info.label} is compiled on a runner service.</p>
              <p className="mt-1 leading-relaxed">
                Your code is sent to <span className="font-mono">{remoteUrl.replace(/^https?:\/\//, "")}</span> to run it, and its output comes back. Python, JavaScript and HTML / CSS / JS never leave this device.
              </p>
              <label className="mt-2 flex cursor-pointer items-start gap-2 font-semibold">
                <input type="checkbox" checked={consent} onChange={(e) => remember(e.target.checked)} className="mt-0.5 accent-[#c2410c]" />
                <span>OK to send my code to the runner</span>
              </label>
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold">Use a different runner</summary>
                <input
                  value={remoteUrl}
                  onChange={(e) => {
                    setRemoteUrl(e.target.value);
                    try {
                      localStorage.setItem(REMOTE_KEY, e.target.value);
                    } catch {}
                  }}
                  className={`${field} mt-1.5`}
                  placeholder={DEFAULT_REMOTE_URL}
                />
                <p className="mt-1 text-[11px]">Any Judge0-compatible server, for example your own.</p>
              </details>
            </div>
          )}

          <div className="flex gap-2">
            {phase === "running" ? (
              <button type="button" onClick={stop} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent/40">
                <Square className="h-3.5 w-3.5" strokeWidth={2.5} /> Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={run}
                disabled={!code.trim() || (needsConsent && !consent)}
                className="ui-primary flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2.5} /> {phase === "done" ? "Run again" : "Run"}
              </button>
            )}
          </div>
        </section>

        {/* ---- the result ---- */}
        <section className="min-w-0" aria-live="polite">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Result</p>
          {phase === "idle" && !result && !error && (
            <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-line bg-paper/60 p-4 text-center text-xs text-ink-soft">
              Press Run. What the program prints, and any graph it draws, shows up here.
            </div>
          )}
          {phase === "running" && (
            <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-xl border border-line bg-paper/60 p-4 text-center text-xs text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              {status}
            </div>
          )}
          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}
          {phase === "done" && result && (
            <div className="space-y-3">
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
                {result.ok ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} /> : <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />}
                {result.ok ? "Finished" : "Stopped with an error"} · {(result.durationMs / 1000).toFixed(1)} s
              </p>

              {result.stdout.trim() && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
                    <Terminal className="h-3.5 w-3.5" strokeWidth={2} /> Console output
                  </p>
                  <pre className="max-h-56 overflow-auto rounded-lg bg-[#1f1f1f] p-3 font-mono text-xs leading-relaxed text-[#e8e8e8]">{result.stdout}</pre>
                </div>
              )}

              {result.images.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
                    <ImageIcon className="h-3.5 w-3.5" strokeWidth={2} /> {language === "web" ? "Page screenshot" : `Graphs and images (${result.images.length})`}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.images.map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={img.name + img.dataUrl.length} src={img.dataUrl} alt={img.name} className="w-full rounded-lg border border-line bg-white" />
                    ))}
                  </div>
                </div>
              )}

              {result.stderr.trim() && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-red-700">{result.ok ? "Messages" : "Error"}</p>
                  <pre className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-xs leading-relaxed text-red-800">{result.stderr}</pre>
                </div>
              )}

              {!hasOutput && result.ok && <p className="text-xs text-ink-soft">The program finished without printing anything.</p>}

              {hasOutput && (
                <fieldset className="space-y-1.5 rounded-xl border border-line bg-white p-3">
                  <legend className="px-1 text-[11px] font-semibold text-ink-soft">Put in the record</legend>
                  {result.stdout.trim() && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
                      <input type="checkbox" checked={useText} onChange={(e) => setUseText(e.target.checked)} className="accent-[#c2410c]" /> Console output as text
                    </label>
                  )}
                  {result.images.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
                      <input type="checkbox" checked={useImages} onChange={(e) => setUseImages(e.target.checked)} className="accent-[#c2410c]" /> {language === "web" ? "Page screenshot" : "Graphs and images"}
                    </label>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
                    <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-[#c2410c]" /> Replace the current output
                  </label>
                </fieldset>
              )}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
