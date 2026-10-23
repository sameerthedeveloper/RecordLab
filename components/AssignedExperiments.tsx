import { Check, Circle } from "lucide-react";
import type { AssignedExperiment } from "@/lib/facultyService";

/** What the faculty assigned, with a tick for each exercise number the student already has a record for. */
export function AssignedExperiments({ experiments, doneNumbers }: { experiments: AssignedExperiment[]; doneNumbers: Set<string> }) {
  if (experiments.length === 0) return null;
  const done = experiments.filter((e) => doneNumbers.has(e.no)).length;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs font-semibold text-ink-soft">
        Assigned experiments · {done} of {experiments.length} recorded
      </p>
      <ul className="mt-2 space-y-1.5">
        {experiments.map((e) => {
          const ok = doneNumbers.has(e.no);
          return (
            <li key={e.no} className="flex items-start gap-2 text-sm">
              {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.75} /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft/50" strokeWidth={2} />}
              <span className={`min-w-0 flex-1 ${ok ? "text-ink-soft" : "text-ink"}`}>
                <span className="font-mono text-xs">Ex {e.no}</span> {e.title}
              </span>
              {e.due && !ok && <span className="shrink-0 text-xs text-ink-soft">due {e.due}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const exerciseNumbers = (docs: { data?: { record?: { exercise_number?: string } } }[]) =>
  new Set(docs.map((d) => String(d.data?.record?.exercise_number ?? "").trim()).filter(Boolean));
