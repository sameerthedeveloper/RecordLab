"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

interface AccordionSectionProps {
  title: string;
  /** Two-digit index shown as a mono eyebrow, e.g. "01" — reserved for
   * sections that follow the record's actual printed order. Sections that
   * aren't part of that sequence (e.g. Watermark Options) omit it. */
  index?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Reproduces the original vanilla-JS accordion: a CSS grid-rows transition
 * driven by toggling an inline style just before the <details> `open`
 * attribute flips, so the collapse animates instead of snapping shut.
 */
export function AccordionSection({ title, index, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleToggle(event: React.MouseEvent) {
    event.preventDefault();
    if (open) {
      if (contentRef.current) contentRef.current.style.gridTemplateRows = "0fr";
      window.setTimeout(() => setOpen(false), 300);
    } else {
      setOpen(true);
      requestAnimationFrame(() => {
        if (contentRef.current) contentRef.current.style.gridTemplateRows = "1fr";
      });
    }
  }

  return (
    <details
      className="record-section rounded-2xl border border-line bg-white shadow-sm transition-all"
      open={open}
    >
      <summary
        onClick={handleToggle}
        className="flex cursor-pointer items-center justify-between gap-3 p-3.5 select-none"
      >
        <span className="flex items-center gap-2.5">
          {index && (
            <span className="font-mono text-[10px] font-semibold tracking-widest text-accent">{index}</span>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-ink">{title}</span>
        </span>
        <ChevronDown className="dropdown-icon h-[18px] w-[18px] shrink-0 text-ink-soft/60" strokeWidth={2.25} />
      </summary>
      <div
        ref={contentRef}
        className="section-content"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="section-content-inner px-3.5 pb-3.5">{children}</div>
      </div>
    </details>
  );
}
