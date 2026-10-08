"use client";

import { useLayoutEffect, useRef } from "react";

interface AutoTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Smallest visible height, in lines. */
  minRows?: number;
  /** Grows with content up to this many lines, then scrolls. */
  maxRows?: number;
  /** Monospace, Tab indents, shows a line count instead of a word count. */
  code?: boolean;
}

const BASE =
  "block w-full resize-none rounded-xl border border-line p-3 text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-50";

export function AutoTextarea({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  minRows = 4,
  maxRows = 16,
  code = false,
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const escaped = useRef(false);
  const lineHeight = code ? 19.5 : 20;
  const padding = 24;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxRows * lineHeight + padding)}px`;
  }, [value, maxRows, lineHeight]);

  const trimmed = value.trim();
  const count = code
    ? trimmed
      ? value.split("\n").length
      : 0
    : trimmed
      ? trimmed.split(/\s+/).length
      : 0;
  const unit = code ? "line" : "word";

  return (
    <div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={!code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!code) return;
          if (e.key === "Escape") {
            escaped.current = true;
            return;
          }
          if (e.key === "Tab" && !e.shiftKey && !escaped.current) {
            e.preventDefault();
            const el = e.currentTarget;
            el.setRangeText("    ", el.selectionStart, el.selectionEnd, "end");
            onChange(el.value);
          }
          escaped.current = false;
        }}
        style={{ minHeight: minRows * lineHeight + padding }}
        className={`${BASE} ${
          code ? "bg-[#fdfcf8] font-mono text-xs leading-[19.5px] focus:bg-white" : "bg-white text-sm leading-5"
        }`}
      />
      <div className="mt-1 flex justify-between px-1 text-[11px] text-ink-soft/60">
        <span>{code && !disabled ? "Tab indents. Press Esc, then Tab, to leave the field." : ""}</span>
        <span>
          {count} {unit}
          {count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
