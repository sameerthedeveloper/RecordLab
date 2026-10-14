"use client";

import type { RecordFormat } from "@/lib/types";

interface RecordFormatPickerProps {
  value: RecordFormat;
  onChange: (next: RecordFormat) => void;
}

const OPTIONS: { id: RecordFormat; name: string; note: string }[] = [
  { id: "standard", name: "Standard", note: "Boxed heading table" },
  { id: "college", name: "College sheet", note: "Heading flush to the border" },
];

/** Two thumbnails of the page: the standard layout and the college lab-sheet layout. */
function Thumb({ format }: { format: RecordFormat }) {
  return (
    <div aria-hidden className="relative mx-auto h-[84px] w-[60px] overflow-hidden rounded-[3px] border border-line bg-white shadow-sm">
      <div className="absolute inset-[4px] border border-ink/50">
        {format === "college" ? (
          <div className="absolute inset-x-0 top-0 flex h-[14px] border-b border-ink/60">
            <div className="w-[30%] border-r border-ink/60" />
            <div className="flex-1" />
          </div>
        ) : (
          <div className="absolute inset-x-[4px] top-[5px] flex h-[11px] border border-ink/60">
            <div className="w-[30%] border-r border-ink/60" />
          </div>
        )}
        <div className="absolute inset-x-[5px] top-[24px] space-y-[3px]">
          <div className="h-[2px] w-full rounded bg-ink/15" />
          <div className="h-[2px] w-4/5 rounded bg-ink/15" />
          <div className="h-[2px] w-full rounded bg-ink/15" />
          <div className="h-[2px] w-3/5 rounded bg-ink/15" />
        </div>
      </div>
    </div>
  );
}

export function RecordFormatPicker({ value, onChange }: RecordFormatPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Record format">
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`rounded-2xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              active ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-line bg-white hover:border-accent/40"
            }`}
          >
            <Thumb format={o.id} />
            <p className="mt-2.5 text-[13px] font-bold text-ink">{o.name}</p>
            <p className="text-[11px] leading-snug text-ink-soft/70">{o.note}</p>
          </button>
        );
      })}
    </div>
  );
}
