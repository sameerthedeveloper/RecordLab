"use client";

import { Eye, Files, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MobileNavProps {
  activePanel: "inputs" | "preview";
  onSelect: (panel: "inputs" | "preview") => void;
  onOpenFiles: () => void;
}

/**
 * iOS 26 "Liquid Glass" tab bar: a floating capsule inset from the screen
 * edges, frosted and saturated so the page scrolls visibly beneath it, with a
 * glass lens that slides behind the selected tab.
 */
export function MobileNav({ activePanel, onSelect, onOpenFiles }: MobileNavProps) {
  const tabs: { id: string; label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { id: "inputs", label: "Editor", Icon: Pencil, onPress: () => onSelect("inputs") },
    { id: "preview", label: "Preview", Icon: Eye, onPress: () => onSelect("preview") },
    { id: "files", label: "Files", Icon: Files, onPress: onOpenFiles },
  ];
  const activeIndex = activePanel === "inputs" ? 0 : 1;

  return (
    <nav aria-label="Main" className="ios-tabbar fixed inset-x-0 bottom-0 z-50 px-4 md:hidden">
      <div className="liquid-glass relative mx-auto flex h-[62px] max-w-sm items-stretch rounded-full p-1">
        <span
          aria-hidden
          className="liquid-lens pointer-events-none absolute bottom-1 left-1 top-1 rounded-full"
          style={{ width: "calc((100% - 8px) / 3)", transform: `translateX(${activeIndex * 100}%)` }}
        />
        {tabs.map(({ id, label, Icon, onPress }) => {
          const active = (id === "inputs" && activeIndex === 0) || (id === "preview" && activeIndex === 1);
          return (
            <button
              key={id}
              type="button"
              onClick={onPress}
              aria-current={active ? "page" : undefined}
              className={`relative z-10 flex flex-1 select-none flex-col items-center justify-center gap-[3px] rounded-full transition-[color,transform] duration-200 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                active ? "text-accent" : "text-ink/65"
              }`}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={active ? 2.2 : 1.8}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.16 : 0}
              />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
