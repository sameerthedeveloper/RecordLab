"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, TerminalSquare } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { renderTerminalImage, type TerminalImageOptions } from "@/lib/terminalImage";

interface TerminalImageModalProps {
  open: boolean;
  onClose: () => void;
  /** Output text already in the record; used to prefill. */
  initialOutput: string;
  /** Adds the PNG to the record. `clearText` asks the caller to drop the plain output text. */
  onAdd: (src: string, name: string, clearText: boolean) => void;
}

const STORE_KEY = "recordlab.terminal-image";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 font-mono text-xs text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:ring-2 focus:ring-accent/15";
const labelClass = "mb-1 block text-[11px] font-semibold text-ink-soft";

function loadIdentity(): Pick<TerminalImageOptions, "user" | "host" | "dir" | "symbol"> {
  const fallback = { user: "student", host: "lab-pc", dir: "record", symbol: "%" };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function TerminalImageModal({ open, onClose, initialOutput, onAdd }: TerminalImageModalProps) {
  const [identity, setIdentity] = useState(loadIdentity);
  const [commands, setCommands] = useState("");
  const [output, setOutput] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [windowBar, setWindowBar] = useState(false);
  const [endPrompt, setEndPrompt] = useState(true);
  const [clearText, setClearText] = useState(true);

  useEffect(() => {
    if (!open) return;
    setIdentity(loadIdentity());
    setOutput(initialOutput);
    setClearText(Boolean(initialOutput.trim()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo(() => {
    if (!open) return "";
    return renderTerminalImage({ ...identity, commands, output, theme, windowBar, endPrompt });
  }, [open, identity, commands, output, theme, windowBar, endPrompt]);

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
    onAdd(preview, "terminal-output.png", clearText && Boolean(output.trim()));
    onClose();
  }

  const seg = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
    }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terminal screenshot"
      description="Turn your output into a terminal-style image."
      icon={TerminalSquare}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalButton.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleAdd} className={`${modalButton.primary} flex items-center gap-1.5`}>
            <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.25} />
            Add to record
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* live preview */}
        <div className="overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(#f1ede0_0%_25%,#faf7f0_0%_50%)] bg-[length:16px_16px] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Terminal preview" className="mx-auto max-h-64 max-w-full rounded-md shadow-lg" />}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <label>
            <span className={labelClass}>User</span>
            <input className={inputClass} value={identity.user} onChange={(e) => setId("user", e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Host</span>
            <input className={inputClass} value={identity.host} onChange={(e) => setId("host", e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Folder</span>
            <input className={inputClass} value={identity.dir} onChange={(e) => setId("dir", e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Prompt</span>
            <input className={inputClass} value={identity.symbol} maxLength={2} onChange={(e) => setId("symbol", e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Commands (one per line)</span>
          <textarea
            rows={2}
            className={`${inputClass} resize-y`}
            placeholder={"javac Main.java\njava Main"}
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex w-44 gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label="Theme">
            <button type="button" className={seg(theme === "dark")} onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button type="button" className={seg(theme === "light")} onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
            <input type="checkbox" className="accent-[#c2410c]" checked={windowBar} onChange={(e) => setWindowBar(e.target.checked)} />
            Window bar
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
            <input type="checkbox" className="accent-[#c2410c]" checked={endPrompt} onChange={(e) => setEndPrompt(e.target.checked)} />
            Ending prompt
          </label>
          {initialOutput.trim() && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
              <input type="checkbox" className="accent-[#c2410c]" checked={clearText} onChange={(e) => setClearText(e.target.checked)} />
              Replace output text with image
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
