"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { saveExperiments, type AssignedExperiment, type ClassRow } from "@/lib/facultyService";

const blank = (n: number): AssignedExperiment => ({ no: String(n), title: "", due: "" });

/** Faculty: the experiments every student in this class is asked to record. Students see them with the class code. */
export function ExperimentsPanel({ cls }: { cls: ClassRow }) {
  const [rows, setRows] = useState<AssignedExperiment[]>(cls.experiments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Follow the class when it first loads, but not while the faculty is typing.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setRows(cls.experiments);
  }, [cls.experiments, touched]);

  const edit = (i: number, patch: Partial<AssignedExperiment>) => {
    setTouched(true);
    setSaved(false);
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveExperiments(cls.code, rows);
      setTouched(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error && e.message.length < 80 ? e.message : "Couldn't save. Check that the latest Firestore rules are deployed.");
    } finally {
      setBusy(false);
    }
  }

  const input = "ui-input min-w-0";
  return (
    <section aria-label="Assigned experiments" className="ui-card space-y-3 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" strokeWidth={2.2} />
        <h2 className="font-serif text-lg font-bold text-ink">Assigned experiments</h2>
      </div>
      <p className="text-sm text-ink-soft">Every student with this class code sees this list, and each one is ticked off when they have a record with that exercise number.</p>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[4rem_minmax(0,1fr)_9.5rem_auto]">
              <input aria-label="Exercise number" value={r.no} onChange={(e) => edit(i, { no: e.target.value })} maxLength={10} placeholder="No." className={input} />
              <input aria-label="Experiment title" value={r.title} onChange={(e) => edit(i, { title: e.target.value })} maxLength={120} placeholder="Title or aim" className={input} />
              <input aria-label="Due date" type="date" value={r.due} onChange={(e) => edit(i, { due: e.target.value })} className={`${input} col-span-2 sm:col-span-1`} />
              <button
                type="button"
                aria-label={`Remove experiment ${r.no}`}
                onClick={() => {
                  setTouched(true);
                  setSaved(false);
                  setRows((x) => x.filter((_, j) => j !== i));
                }}
                className="ui-icon-btn flex items-center justify-center hover:!text-red-600"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            setSaved(false);
            const next = Math.max(0, ...rows.map((r) => Number(r.no) || 0)) + 1;
            setRows((r) => [...r, blank(next)]);
          }}
          className="ui-btn ui-btn-secondary flex min-h-9 items-center gap-1.5 px-3.5 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add experiment
        </button>
        <button type="button" disabled={busy || !touched} onClick={() => void save()} className="ui-primary flex min-h-9 items-center gap-2 px-5 text-xs font-semibold disabled:opacity-50">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Assign to students
        </button>
        {saved && <span role="status" className="text-xs font-semibold text-emerald-700">Assigned</span>}
      </div>
    </section>
  );
}
