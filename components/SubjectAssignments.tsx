"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { findClass, useMySubmissions, type ClassRow } from "@/lib/facultyService";
import type { CloudDocument } from "@/lib/firestoreService";
import { AssignedExperiments, exerciseNumbers } from "./AssignedExperiments";

/** The experiments a faculty assigned to this subject's class. The class is the one the subject was handed in to (or joined by link). */
export function SubjectAssignments({ subjectId, documents }: { subjectId: string; documents: CloudDocument[] }) {
  const mine = useMySubmissions();
  const [stored, setStored] = useState<string | null>(null);
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      setStored(localStorage.getItem(`recordlab.faculty-class.${subjectId}`));
    } catch {
      setStored(null);
    }
  }, [subjectId]);

  const code = mine.find((s) => s.folderId === subjectId)?.classCode ?? stored;

  useEffect(() => {
    if (!code) return setCls(null);
    let off = false;
    findClass(code)
      .then((c) => !off && setCls(c))
      .catch(() => !off && setCls(null));
    return () => {
      off = true;
    };
  }, [code]);

  if (!cls || cls.experiments.length === 0) return null;
  const done = exerciseNumbers(documents);
  const left = cls.experiments.filter((e) => !done.has(e.no)).length;

  return (
    <section aria-label="Assigned experiments" className="mb-5 mt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ClipboardList className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          Assigned by {cls.facultyName}
          <span className="font-normal text-ink-soft"> · {left === 0 ? "all recorded" : `${left} to do`}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && <AssignedExperiments experiments={cls.experiments} doneNumbers={done} />}
    </section>
  );
}
