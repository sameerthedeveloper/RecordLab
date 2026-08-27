"use client";

import { Pencil, Eye } from "lucide-react";

interface MobileNavProps {
  activePanel: "inputs" | "preview";
  onSelect: (panel: "inputs" | "preview") => void;
}

export function MobileNav({ activePanel, onSelect }: MobileNavProps) {
  const itemClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors ${
      active ? "bg-accent-soft text-accent-ink" : "text-ink-soft"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around gap-1.5 border-t border-line bg-white p-2 shadow-[0_-2px_10px_rgba(28,43,51,0.06)] md:hidden">
      <button type="button" onClick={() => onSelect("inputs")} className={itemClass(activePanel === "inputs")}>
        <Pencil className="h-5 w-5" strokeWidth={activePanel === "inputs" ? 2.4 : 2} />
        <span className="text-[11px] font-semibold">Inputs</span>
      </button>

      <button type="button" onClick={() => onSelect("preview")} className={itemClass(activePanel === "preview")}>
        <Eye className="h-5 w-5" strokeWidth={activePanel === "preview" ? 2.4 : 2} />
        <span className="text-[11px] font-semibold">Preview</span>
      </button>
    </nav>
  );
}
