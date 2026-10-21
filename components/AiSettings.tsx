"use client";

import { Copy, Upload, Zap, type LucideIcon } from "lucide-react";
import { useAiConfig } from "@/lib/aiConfig";
import type { AiStart } from "@/lib/settings";

const OPTIONS: { id: AiStart; name: string; note: string; icon: LucideIcon }[] = [
  { id: "prompt", name: "Copy prompt", note: "Copy a ready-made prompt, run it in any AI chat you like.", icon: Copy },
  { id: "import", name: "Paste & import", note: "Paste the AI's answer and Record Lab fills the record.", icon: Upload },
  { id: "direct", name: "Direct LLM", note: "Record Lab asks the AI for you and fills the record in one step.", icon: Zap },
];

/** Settings > AI assistant: which way the assistant opens. Direct LLM is offered only while an admin has the AI switched on. */
export function AiSettings({ value, onChange }: { value: AiStart; onChange: (next: AiStart) => void }) {
  const config = useAiConfig();
  const directOn = config?.enabled !== false;
  const options = OPTIONS.filter((o) => o.id !== "direct" || directOn);
  const current = value === "direct" && !directOn ? "prompt" : value;

  return (
    <section>
      <h3 className="mb-1 font-serif text-sm font-bold text-ink">How the AI assistant opens</h3>
      <p className="mb-3 text-xs text-ink-soft/80">Pick the way you like to work. You can still switch tabs inside the assistant any time.</p>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="How the AI assistant opens">
        {options.map(({ id, name, note, icon: Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`rounded-2xl border p-3.5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-line bg-white hover:border-accent/40"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-ink-soft"}`} strokeWidth={2} />
              <span className="mt-2 block text-[13px] font-semibold text-ink">{name}</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{note}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
