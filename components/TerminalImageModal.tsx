"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, TerminalSquare } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import type { OutputImage } from "@/lib/types";
import { PLATFORMS, renderTerminalImage, type TerminalImageOptions, type TerminalPlatform } from "@/lib/terminalImage";

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
}

const STORE_KEY = "recordlab.terminal-image";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[13px] text-ink max-md:min-h-11 outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:ring-2 focus:ring-accent/15";
const labelClass = "mb-1.5 block text-xs font-semibold text-ink-soft";

function loadIdentity(): Pick<TerminalImageOptions, "user" | "host" | "dir"> {
  const fallback = { user: "student", host: "lab-pc", dir: "record" };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function TerminalImageModal({ open, onClose, initialOutput, editing, onAdd, onUpdate }: TerminalImageModalProps) {
  const [identity, setIdentity] = useState(loadIdentity);
  const [platform, setPlatform] = useState<TerminalPlatform>("macos");
  const [symbol, setSymbol] = useState("%");
  const [commands, setCommands] = useState("");
  const [output, setOutput] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [windowBar, setWindowBar] = useState(false);
  const [endPrompt, setEndPrompt] = useState(true);
  const [clearText, setClearText] = useState(true);

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
      setClearText(false);
      return;
    }
    setIdentity(loadIdentity());
    setOutput(initialOutput);
    setClearText(Boolean(initialOutput.trim()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo(() => {
    if (!open) return "";
    return renderTerminalImage({ ...identity, platform, symbol, commands, output, theme, windowBar, endPrompt });
  }, [open, identity, platform, symbol, commands, output, theme, windowBar, endPrompt]);

  function pickPlatform(id: TerminalPlatform) {
    setPlatform(id);
    setSymbol(PLATFORMS.find((p) => p.id === id)?.symbol ?? "%");
  }

  const isWindows = platform === "cmd" || platform === "powershell";
  const placeholderCmds =
    platform === "cmd" || platform === "powershell" ? "javac Main.java\njava Main" : "javac Main.java\njava Main";

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
    const options: TerminalImageOptions = { ...identity, platform, symbol, commands, output, theme, windowBar, endPrompt };
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
            <p className={`${group} mb-2.5`}>Preview</p>
            <div className="overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#f1ede0_0%_25%,#faf7f0_0%_50%)] bg-[length:16px_16px] p-3 shadow-[0_10px_24px_-14px_rgba(28,43,51,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview && <img src={preview} alt="Terminal preview" className="mx-auto max-h-[28rem] max-w-full rounded-md shadow-lg" />}
            </div>
          </div>
        </div>

        {/* right: settings */}
        <div className="min-w-0 space-y-6">
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
              onChange={(e) => setCommands(e.target.value)}
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
