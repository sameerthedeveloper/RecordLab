"use client";

import { Check } from "lucide-react";

interface EditorSectionProps {
  id: string;
  title: string;
  /** Position in the printed record, e.g. "01". */
  index?: string;
  filled: boolean;
  /** Shown beside the title, e.g. the include/exclude switch. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/** One always-visible block of the record, anchored by `id` for the section rail. */
export function EditorSection({ id, title, index, filled, aside, children }: EditorSectionProps) {
  return (
    <section
      id={id}
      data-section={id}
      aria-labelledby={`${id}-heading`}
      className="rounded-[1.5rem] border border-black/[0.05] bg-white p-5 shadow-[0_1px_2px_rgba(28,43,51,0.04),0_10px_28px_-16px_rgba(28,43,51,0.16)]"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={`${id}-heading`} className="flex items-center gap-2 font-serif text-[17px] font-bold tracking-tight text-ink">
          {index && <span className="font-mono text-[10px] font-semibold text-accent">{index}</span>}
          {title}
          {filled && <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} aria-label="Filled in" />}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
