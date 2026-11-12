"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { saveAppConfig, useAppConfig } from "@/lib/appConfig";
import { approveFaculty, declineFaculty, loadFaculty, loadFacultyRequests, removeFaculty, type FacultyMember, type FacultyRequest } from "@/lib/facultyService";
import { fmtDate } from "@/lib/adminFormat";
import { useAdmin } from "./AdminProvider";
import { Avatar, Card, Empty, Switch } from "./ui";

/** Faculty requests waiting for approval, and the faculty who already have access. Needs the faculty rules from docs/faculty.md. */
export function FacultyPage() {
  const { me } = useAdmin();
  const [requests, setRequests] = useState<FacultyRequest[] | null>(null);
  const [faculty, setFaculty] = useState<FacultyMember[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const app = useAppConfig();
  const [switching, setSwitching] = useState(false);

  async function setFacultyEnabled(next: boolean) {
    setSwitching(true);
    try {
      await saveAppConfig({ facultyEnabled: next }, me.uid);
      setError("");
    } catch {
      setError("Couldn't change faculty sign-in. Deploy the latest firestore.rules (see docs/billing.md), then try again.");
    } finally {
      setSwitching(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([loadFacultyRequests(), loadFaculty()]);
      setRequests(r);
      setFaculty(f);
      setError("");
    } catch {
      setError("Couldn't read faculty. Deploy the latest firestore.rules (see docs/faculty.md), then refresh.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  async function act(uid: string, fn: () => Promise<void>) {
    setBusy(uid);
    try {
      await fn();
      await load();
    } catch {
      setError("Couldn't make that change. Try again.");
    } finally {
      setBusy("");
    }
  }

  const btn = "flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-50";
  return (
    <>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <Card title="Faculty sign-in" aside={app ? (app.facultyEnabled ? "On" : "Off") : undefined}>
        <div className="flex items-center justify-between gap-4 px-5 pb-5 pt-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-ink">Let faculty sign in</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              Off: /faculty shows a pause notice to everyone, and faculty can&apos;t create classes or review records. Students keep working, and nothing is deleted.
            </p>
          </div>
          <Switch checked={app?.facultyEnabled ?? true} disabled={!app || switching} onChange={(v) => void setFacultyEnabled(v)} label="Let faculty sign in" />
        </div>
      </Card>

      <Card title="Waiting for approval" aside={requests ? `${requests.length}` : undefined}>
        {requests === null ? (
          <Empty>Loading…</Empty>
        ) : requests.length === 0 ? (
          <Empty>No faculty requests right now. Faculty ask for access at /faculty.</Empty>
        ) : (
          <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
            {requests.map((r) => (
              <li key={r.uid} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Avatar name={r.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{r.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {r.email} · {r.department || "No department"}, {r.college || "no college"} · asked {fmtDate(r.requestedAt)}
                  </p>
                </div>
                <button type="button" disabled={busy === r.uid} onClick={() => void act(r.uid, () => approveFaculty(r, me.uid))} className={`${btn} bg-accent text-white hover:bg-accent-hover`}>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Approve
                </button>
                <button type="button" disabled={busy === r.uid} onClick={() => void act(r.uid, () => declineFaculty(r.uid))} className={`${btn} border border-line bg-white text-ink-soft hover:border-red-300 hover:text-red-700`}>
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} /> Decline
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Faculty" aside={faculty ? `${faculty.length}` : undefined}>
        {faculty === null ? (
          <Empty>Loading…</Empty>
        ) : faculty.length === 0 ? (
          <Empty>No faculty yet. Approve a request above.</Empty>
        ) : (
          <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
            {faculty.map((f) => (
              <li key={f.uid} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Avatar name={f.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{f.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {f.email} · {f.department || "No department"}, {f.college || "no college"} · since {fmtDate(f.approvedAt)}
                  </p>
                </div>
                <button type="button" disabled={busy === f.uid} onClick={() => void act(f.uid, () => removeFaculty(f.uid))} className={`${btn} border border-line bg-white text-ink-soft hover:border-red-300 hover:text-red-700`}>
                  Remove access
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
