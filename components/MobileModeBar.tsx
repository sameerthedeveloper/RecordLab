"use client";

import Link from "next/link";
import { ChevronLeft, Eye, Pencil } from "lucide-react";

interface MobileModeBarProps {
  activePanel: "inputs" | "preview";
  onSelect: (panel: "inputs" | "preview") => void;
}

/**
 * Phones only. A slim bar at the top of the editor: back to the Home screen, and an Edit / Preview switch.
 * It takes the place of the floating bottom bar, which sat over the form while typing.
 */
export function MobileModeBar({ activePanel, onSelect }: MobileModeBarProps) {
  const tabs = [
    { id: "inputs" as const, label: "Edit", Icon: Pencil },
    { id: "preview" as const, label: "Preview", Icon: Eye },
  ];
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-paper px-3 pb-2 pt-[max(8px,env(safe-area-inset-top,0px))] md:hidden">
      <Link
        href="/dashboard"
        aria-label="Back to Home"
        className="flex h-10 shrink-0 items-center gap-0.5 rounded-full pl-1.5 pr-3 text-[13px] font-semibold text-ink-soft transition-colors active:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.3} />
        Home
      </Link>
      <div role="tablist" aria-label="Editor view" className="ml-auto flex rounded-full bg-ink/[0.06] p-1">
        {tabs.map(({ id, label, Icon }) => {
          const active = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(id)}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active ? "bg-white text-accent shadow-sm" : "text-ink-soft"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
