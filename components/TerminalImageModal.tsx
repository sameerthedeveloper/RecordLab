"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Play, RotateCcw, ShieldCheck, Square, TerminalSquare } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { CONSENT_KEY, REMOTE_KEY } from "./RunCodeModal";
import type { OutputImage } from "@/lib/types";
import {
  MARGIN_MAX,
  PLATFORMS,
  drawTerminal,
  type TerminalImageOptions,
  type TerminalMargins,
  type TerminalPlatform,
} from "@/lib/terminalImage";
import { DEFAULT_REMOTE_URL, javaMainClass, runCode } from "@/lib/runner";
import { detectLanguage, languageInfo, type RunLanguage } from "@/lib/runner/languages";

interface TerminalImageModalProps {
  open: boolean;
  onClose: () => void;
  /** Output text already in the record; used to prefill. */
  initialOutput: string;
  /** Existing terminal image being edited; null/undefined = make a new one. */
  editing?: OutputImage | null;
  /** Adds the PNG to the record. `clearText` asks the caller to drop the plain output text. */
  onAdd: (src: string, name: string, clearText: boolean, options: TerminalImageOptions) => void;
  /** Replaces the editing image's PNG (and stored settings) in place. */
  onUpdate: (id: number, src: string, options: TerminalImageOptions) => void;
  /** The record's program, so the output can come from really running it. */
  code: string;
  /** Input the program reads (one value per line), stored on the record. */
  stdin: string;
  onInputChange: (value: string) => void;
}

type Side = keyof TerminalMargins;
const SIDES: { side: Side; label: string }[] = [
  { side: "top", label: "Top" },
  { side: "right", label: "Right" },
  { side: "bottom", label: "Bottom" },
  { side: "left", label: "Left" },
];

/** What a student would type to build and run this program in a real terminal. */
export function suggestCommands(language: RunLanguage, code: string): string {
  switch (language) {
    case "python":
      return "python3 main.py";
    case "javascript":
      return "node main.js";
    case "c":
      return "gcc main.c -o main\n./main";
    case "cpp":
      return "g++ main.cpp -o main\n./main";
    case "java": {
      const name = javaMainClass(code) ?? "Main";
      return `javac ${name}.java\njava ${name}`;
    }
    default:
      return "";
  }
}

const STORE_KEY = "recordlab.terminal-image";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[13px] text-ink max-md:min-h-11 outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:ring-2 focus:ring-accent/15";
const labelClass = "mb-1.5 block text-xs font-semibold text-ink-soft";

export function loadIdentity(): Pick<TerminalImageOptions, "user" | "host" | "dir"> {
  const fallback = { user: "student", host: "lab-pc", dir: "record" };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function TerminalImageModal({ open, onClose, initialOutput, editing, onAdd, onUpdate, code, stdin, onInputChange }: TerminalImageModalProps) {
  const [identity, setIdentity] = useState(loadIdentity);
  const [platform, setPlatform] = useState<TerminalPlatform>("macos");
  const [symbol, setSymbol] = useState("%");
  const [commands, setCommands] = useState("");
  const [output, setOutput] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [windowBar, setWindowBar] = useState(false);
  const [endPrompt, setEndPrompt] = useState(true);
  const [clearText, setClearText] = useState(true);
  const [margins, setMargins] = useState<TerminalMargins | null>(null);

  // Running the program
  const language = detectLanguage(code);
  const info = languageInfo(language);
  const needsConsent = info.where === "remote";
  const [consent, setConsent] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState(DEFAULT_REMOTE_URL);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState("");
  const [runInfo, setRunInfo] = useState<{ ok: boolean; seconds: number } | null>(null);
  const [runError, setRunError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const commandsAuto = useRef(true);

  useEffect(() => {
    if (!open) return;
    const saved = editing?.terminal;
    if (saved) {
      setIdentity({ user: saved.user, host: saved.host, dir: saved.dir });
      setPlatform(saved.platform);
      setSymbol(saved.symbol);
      setCommands(saved.commands);
      setOutput(saved.output);
      setTheme(saved.theme);
      setWindowBar(saved.windowBar);
      setEndPrompt(saved.endPrompt);
      setMargins(saved.margins ?? null);
      commandsAuto.current = false;
      setClearText(false);
      return;
    }
    setMargins(null);
    commandsAuto.current = true;
    setIdentity(loadIdentity());
    setOutput(initialOutput);
    setClearText(Boolean(initialOutput.trim()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1");
      setRemoteUrl(localStorage.getItem(REMOTE_KEY) || DEFAULT_REMOTE_URL);
    } catch {}
    setRunInfo(null);
    setRunError("");
    return () => abortRef.current?.abort();
  }, [open]);

  const options: TerminalImageOptions = useMemo(
    () => ({ ...identity, platform, symbol, commands, output, theme, windowBar, endPrompt, ...(margins ? { margins } : {}) }),
    [identity, platform, symbol, commands, output, theme, windowBar, endPrompt, margins],
  );
  const draw = useMemo(() => (open ? drawTerminal(options) : null), [open, options]);
  const preview = draw?.url ?? "";
  const hasDraw = draw !== null;

  async function run() {
    if (!code.trim() || running || (needsConsent && !consent)) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    setRunError("");
    setRunInfo(null);
    setRunStatus(info.where === "browser" ? "Starting…" : "Sending to the runner…");
    try {
      const r = await runCode({ language, code, stdin, onStatus: setRunStatus, signal: ctrl.signal, remoteUrl });
      // A failed run is still worth a screenshot: the error is what the terminal printed.
      setOutput([r.stdout.replace(/\s+$/, ""), r.stderr.replace(/\s+$/, "")].filter(Boolean).join("\n"));
      if (commandsAuto.current || !commands.trim()) {
        setCommands(suggestCommands(language, code));
        commandsAuto.current = true;
      }
      setRunInfo({ ok: r.ok, seconds: r.durationMs / 1000 });
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        setRunError(err instanceof Error ? err.message : "Couldn't run the program.");
      }
    } finally {
      setRunning(false);
    }
  }

  function stopRun() {
    abortRef.current?.abort();
  }

  function rememberConsent(v: boolean) {
    setConsent(v);
    try {
      localStorage.setItem(CONSENT_KEY, v ? "1" : "0");
    } catch {}
  }

  // ---- resizing: every side of the image can be dragged on its own ----
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const dragRef = useRef<{ side: Side; x: number; y: number; start: TerminalMargins; zoom: number } | null>(null);
  const [dragging, setDragging] = useState<Side | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, [open, hasDraw]);

  /** Shrinks the picture to fit the stage; the margins themselves are always real pixels. */
  const zoom = draw ? Math.min(1, Math.max(0.2, (stageW - 40) / draw.width), 360 / draw.height) : 1;

  const clampMargin = (n: number) => Math.min(MARGIN_MAX, Math.max(0, Math.round(n)));
  const setSide = useCallback(
    (side: Side, value: number, base: TerminalMargins) => setMargins({ ...base, [side]: clampMargin(value) }),
    [],
  );

  function beginDrag(side: Side, e: React.PointerEvent) {
    if (!draw) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { side, x: e.clientX, y: e.clientY, start: draw.margins, zoom };
    setDragging(side);
  }

  function moveDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    // The picture is centred, so each edge moves half as far as the size changes: double the drag.
    const delta =
      d.side === "right" ? (e.clientX - d.x) * 2 : d.side === "left" ? (d.x - e.clientX) * 2 : d.side === "bottom" ? (e.clientY - d.y) * 2 : (d.y - e.clientY) * 2;
    setSide(d.side, d.start[d.side] + delta / d.zoom, d.start);
  }

  function endDrag() {
    dragRef.current = null;
    setDragging(null);
  }

  function nudge(side: Side, e: React.KeyboardEvent) {
    if (!draw) return;
    const grows: Record<Side, string> = { right: "ArrowRight", left: "ArrowLeft", bottom: "ArrowDown", top: "ArrowUp" };
    const shrinks: Record<Side, string> = { right: "ArrowLeft", left: "ArrowRight", bottom: "ArrowUp", top: "ArrowDown" };
    if (e.key !== grows[side] && e.key !== shrinks[side]) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 2;
    setSide(side, draw.margins[side] + (e.key === grows[side] ? step : -step), draw.margins);
  }

  function pickPlatform(id: TerminalPlatform) {
    setPlatform(id);
    setSymbol(PLATFORMS.find((p) => p.id === id)?.symbol ?? "%");
  }

  const isWindows = platform === "cmd" || platform === "powershell";
  const placeholderCmds = "javac Main.java\njava Main";

  function setId(key: keyof typeof identity, value: string) {
    setIdentity((prev) => ({ ...prev, [key]: value }));
  }

  function handleAdd() {
    if (!preview) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(identity));
    } catch {
      /* storage blocked — settings just won't persist */
    }
    if (editing) onUpdate(editing.id, preview, options);
    else onAdd(preview, "terminal-output.png", clearText && Boolean(output.trim()), options);
    onClose();
  }

  const seg = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors max-md:min-h-11 ${
      active ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
    }`;

  /** A labelled on/off switch, same look as the Review questions toggle. */
  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-soft max-md:min-h-12">
      {label}
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );

  const group = "text-[13px] font-bold text-ink";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit terminal screenshot" : "Terminal screenshot"}
      description="Turn your output into a terminal-style image."
      icon={TerminalSquare}
      size="big"
      bodyClassName="p-5 pb-6 sm:p-7 sm:pb-8"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalButton.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleAdd} className={`${modalButton.primary} flex items-center gap-1.5`}>
            <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.25} />
            {editing ? "Save changes" : "Add to record"}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8">
        {/* left: live preview, stays in view while the controls on the right scroll */}
        <div className="min-w-0">
          <div className="top-0 md:sticky">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className={group}>Preview</p>
              <p className="text-[11px] text-ink-soft/70">
                {draw ? `${draw.width} × ${draw.height} px` : ""}
                {margins && (
                  <button
                    type="button"
                    onClick={() => setMargins(null)}
                    className="ml-2 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={2.25} /> Auto size
                  </button>
                )}
              </p>
            </div>
            <div
              ref={stageRef}
              className="flex min-h-[15rem] items-center justify-center overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#f1ede0_0%_25%,#faf7f0_0%_50%)] bg-[length:16px_16px] p-5 shadow-[0_10px_24px_-14px_rgba(28,43,51,0.35)]"
            >
              {draw && (
                <div className="relative shrink-0" style={{ width: draw.width * zoom, height: draw.height * zoom }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Terminal preview" draggable={false} className="h-full w-full select-none rounded-md shadow-lg" />
                  {SIDES.map(({ side, label }) => {
                    const horizontal = side === "left" || side === "right";
                    const active = dragging === side;
                    return (
                      <div
                        key={side}
                        role="slider"
                        tabIndex={0}
                        aria-label={`${label} space`}
                        aria-orientation={horizontal ? "horizontal" : "vertical"}
                        aria-valuemin={0}
                        aria-valuemax={MARGIN_MAX}
                        aria-valuenow={draw.margins[side]}
                        onPointerDown={(e) => beginDrag(side, e)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onKeyDown={(e) => nudge(side, e)}
                        className={`group absolute z-10 flex touch-none items-center justify-center outline-none ${
                          horizontal ? "top-0 h-full w-5 cursor-ew-resize" : "left-0 h-5 w-full cursor-ns-resize"
                        } ${side === "left" ? "-left-2.5" : side === "right" ? "-right-2.5" : side === "top" ? "-top-2.5" : "-bottom-2.5"}`}
                      >
                        <span
                          className={`rounded-full bg-accent transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                            horizontal ? "h-10 w-1" : "h-1 w-10"
                          } ${active ? "opacity-100" : "opacity-40"}`}
                        />
                        {active && (
                          <span
                            className={`pointer-events-none absolute whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white ${
                              side === "left" ? "left-6" : side === "right" ? "right-6" : side === "top" ? "top-6" : "bottom-6"
                            }`}
                          >
                            {label} {draw.margins[side]} px
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-soft/70">Drag any edge to resize that side, or focus it and use the arrow keys.</p>
          </div>
        </div>

        {/* right: settings */}
        <div className="min-w-0 space-y-6">
        <section aria-label="Run the program" className="rounded-2xl border border-line bg-paper p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className={group}>Real output</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              {info.label} · {info.where === "browser" ? "on this device" : "runner service"}
            </span>
          </div>
          {code.trim() ? (
            <>
              <p className="mt-1.5 text-xs text-ink-soft">
                Runs the Source code from your record and puts what it prints into the screenshot.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-ink-soft">
                  Input for the program{stdin.trim() ? " (set)" : ""}
                </summary>
                <textarea
                  rows={2}
                  value={stdin}
                  onChange={(e) => onInputChange(e.target.value)}
                  spellCheck={false}
                  placeholder={"5\n10"}
                  className={`${inputClass} mt-1.5 resize-y`}
                />
                <p className="mt-1 text-[11px] text-ink-soft/70">One value per line, in the order the program asks.</p>
              </details>
              {needsConsent && (
                <label className="mt-2.5 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900">
                  <input type="checkbox" checked={consent} onChange={(e) => rememberConsent(e.target.checked)} className="mt-0.5 accent-[#c2410c]" />
                  <span>
                    OK to send my code to {remoteUrl.replace(/^https?:\/\//, "")} to compile and run it.
                  </span>
                </label>
              )}
              <div className="mt-3 flex items-center gap-3">
                {running ? (
                  <button type="button" onClick={stopRun} className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-accent/40">
                    <Square className="h-3.5 w-3.5" strokeWidth={2.5} /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={run}
                    disabled={language === "web" || (needsConsent && !consent)}
                    className="ui-primary flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" strokeWidth={2.5} /> {runInfo ? "Run again" : "Run and fill output"}
                  </button>
                )}
                <p className="min-w-0 text-xs" aria-live="polite">
                  {running && (
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" /> <span className="truncate">{runStatus}</span>
                    </span>
                  )}
                  {!running && runInfo && (
                    <span className={`flex items-center gap-1.5 font-semibold ${runInfo.ok ? "text-emerald-700" : "text-red-700"}`}>
                      {runInfo.ok ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} /> : <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />}
                      {runInfo.ok ? "Finished" : "Stopped with an error, shown below"} · {runInfo.seconds.toFixed(1)} s
                    </span>
                  )}
                  {!running && runError && <span className="font-semibold text-red-700">{runError}</span>}
                  {language === "web" && <span className="text-ink-soft">HTML pages have no terminal output.</span>}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-xs text-ink-soft">
              Add your program to the Source code section and it can be run here. Until then, paste the output below.
            </p>
          )}
        </section>

        <section>
          <h3 className={`${group} mb-2.5`}>Terminal</h3>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Terminal">
            {PLATFORMS.map((p) => {
              const on = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickPlatform(p.id)}
                  className={`flex flex-col items-start rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent max-md:min-h-14 ${
                    on ? "border-accent bg-accent-soft/60 ring-1 ring-accent/30" : "border-line bg-white hover:border-accent/40"
                  }`}
                >
                  <span className={`text-[13px] font-semibold ${on ? "text-accent-ink" : "text-ink"}`}>{p.label}</span>
                  <span className="font-mono text-[10px] text-ink-soft/70">{p.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className={`${group} mb-2.5`}>Prompt</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label>
              <span className={labelClass}>User</span>
              <input className={inputClass} value={identity.user} onChange={(e) => setId("user", e.target.value)} />
            </label>
            {!isWindows && (
              <label>
                <span className={labelClass}>Host</span>
                <input className={inputClass} value={identity.host} onChange={(e) => setId("host", e.target.value)} />
              </label>
            )}
            <label>
              <span className={labelClass}>Folder</span>
              <input className={inputClass} value={identity.dir} onChange={(e) => setId("dir", e.target.value)} />
            </label>
            <label>
              <span className={labelClass}>Symbol</span>
              <input className={inputClass} value={symbol} maxLength={2} onChange={(e) => setSymbol(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className={group}>What it shows</h3>
          <label className="block">
            <span className={labelClass}>Commands (one per line)</span>
            <textarea
              rows={2}
              className={`${inputClass} resize-y`}
              placeholder={placeholderCmds}
              value={commands}
              onChange={(e) => {
                commandsAuto.current = false;
                setCommands(e.target.value);
              }}
              spellCheck={false}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Program output</span>
            <textarea
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder="Paste what the program printed."
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              spellCheck={false}
            />
          </label>
        </section>

        <section>
          <h3 className={`${group} mb-2.5`}>Look</h3>
          <div className="flex gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Theme">
            <button type="button" className={seg(theme === "dark")} onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button type="button" className={seg(theme === "light")} onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
          <fieldset className="mt-3">
            <legend className={labelClass}>Space around the text (px)</legend>
            <div className="grid grid-cols-4 gap-2">
              {SIDES.map(({ side, label }) => (
                <label key={side}>
                  <span className="mb-1 block text-[11px] text-ink-soft/70">{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={MARGIN_MAX}
                    inputMode="numeric"
                    value={draw?.margins[side] ?? 0}
                    onChange={(e) => draw && setSide(side, Number(e.target.value) || 0, draw.margins)}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {toggle("Window bar", windowBar, setWindowBar)}
            {toggle("Ending prompt", endPrompt, setEndPrompt)}
            {!editing && initialOutput.trim() && toggle("Replace output text with image", clearText, setClearText)}
          </div>
        </section>
        </div>
      </div>
    </Modal>
  );
}
