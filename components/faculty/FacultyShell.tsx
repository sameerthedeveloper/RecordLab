"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Home } from "lucide-react";
import { signOutUser } from "@/lib/authService";
import { watchAllSubmissions, watchMyClasses, type ClassRow, type Submission } from "@/lib/facultyService";
import { PanelFrame } from "../PanelFrame";
import { useFaculty } from "./FacultyProvider";

/** The faculty area's frame: a sidebar with a link to every class and how many are waiting, built like the admin one. */
export function FacultyShell({ children }: { children: React.ReactNode }) {
  const { uid, name, email } = useFaculty();
  const router = useRouter();
  const current = String(useParams<{ code?: string }>()?.code ?? "").toUpperCase();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    const a = watchMyClasses(uid, setClasses, () => {});
    const b = watchAllSubmissions(uid, setSubs, () => {});
    return () => {
      a();
      b();
    };
  }, [uid]);

  const waiting = (code: string) => subs.filter((s) => s.classCode === code && s.status === "pending").length;
  const totalWaiting = subs.filter((s) => s.status === "pending").length;

  return (
    <PanelFrame
      title="Record Lab faculty"
      subtitle="Check and verify your students' records"
      home="/faculty"
      nav={[{ href: "/faculty", label: "All classes", icon: Home, exact: true, badge: totalWaiting > 0 ? `${totalWaiting} waiting` : null }]}
      sidebarExtra={
        classes.length > 0 ? (
          <div>
            <p className="px-3.5 pb-1.5 pt-1 text-xs font-semibold text-ink-soft/80">Your classes</p>
            <ul className="flex flex-col gap-1">
              {classes.map((c) => {
                const n = waiting(c.code);
                const active = c.code === current;
                return (
                  <li key={c.code}>
                    <Link
                      href={`/faculty/${c.code}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"}`}
                    >
                      <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
                      <span className="min-w-0 flex-1 truncate">{c.subject}</span>
                      {n > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{n}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : undefined
      }
      account={{ name, email }}
      onSignOut={async () => {
        await signOutUser();
        router.replace("/faculty");
      }}
    >
      {children}
    </PanelFrame>
  );
}
