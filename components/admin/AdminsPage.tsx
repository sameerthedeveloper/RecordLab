"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, ShieldCheck, UserPlus } from "lucide-react";
import { addAdmin, stepDownAsAdmin, transferAdmin, type ProfileRow } from "@/lib/adminService";
import { fmtDate } from "@/lib/adminFormat";
import { useAdmin } from "./AdminProvider";
import { WhenLoaded } from "./LoadState";
import { Avatar, Card, Empty } from "./ui";

const select = "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

export function AdminsPage() {
  return <WhenLoaded>{({ data }) => <Admins profiles={data.usage.profiles} />}</WhenLoaded>;
}

function Admins({ profiles }: { profiles: ProfileRow[] }) {
  const { me, data, view, refresh } = useAdmin();
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<"add" | "transfer" | "stepdown" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const admins = data?.admins ?? null;
  const adminIds = new Set((admins ?? []).map((a) => a.uid));
  const nameOf = (uid: string) => {
    const p = profiles.find((x) => x.uid === uid);
    return { name: p?.displayName || p?.email || `${uid.slice(0, 8)}…`, email: p?.email ?? null };
  };
  const candidates = profiles.filter((p) => p.email && !adminIds.has(p.uid));
  const chosen = profiles.find((p) => p.uid === target) ?? null;
  const onlyAdmin = (admins?.length ?? 0) <= 1;

  async function run() {
    if (!mode) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "add" && chosen) {
        await addAdmin(chosen.uid, me.uid);
        setDone(`${chosen.displayName || chosen.email} is now an admin.`);
        setTarget("");
        setMode(null);
        await refresh();
      } else if (mode === "transfer" && chosen) {
        await transferAdmin(me.uid, chosen.uid);
        router.replace("/editor");
      } else if (mode === "stepdown") {
        await stepDownAsAdmin(me.uid);
        router.replace("/editor");
      }
    } catch (e) {
      setError(e instanceof Error && /permission/i.test(e.message) ? "Firestore refused this. The admin rules that allow adding and handing over admin access aren't deployed yet (see docs/admin.md)." : "Couldn't make the change. Try again.");
      setMode(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card title="Admins" aside={admins ? `${admins.length} ${admins.length === 1 ? "admin" : "admins"}` : undefined}>
        {admins === null ? (
          <Empty>Couldn&apos;t read the admin list. Deploy the latest firestore.rules, then refresh.</Empty>
        ) : (
          <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
            {admins.map((a) => {
              const who = nameOf(a.uid);
              const mine = a.uid === me.uid;
              return (
                <li key={a.uid} className="flex flex-wrap items-center gap-3 px-3 py-3">
                  <Avatar name={who.name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[13px] font-semibold text-ink">
                      {who.name}
                      {mine && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-ink">You</span>}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {who.email ?? a.uid}
                      {a.grantedAt ? ` · admin since ${fmtDate(a.grantedAt)}` : ""}
                      {a.grantedBy && a.grantedBy !== a.uid ? ` · added by ${nameOf(a.grantedBy).name}` : ""}
                    </p>
                  </div>
                  {mine && (
                    <button type="button" disabled={onlyAdmin} onClick={() => setMode("stepdown")} title={onlyAdmin ? "You are the only admin. Make someone else an admin first." : undefined} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft">
                      Step down
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Add or hand over admin access">
        <div className="space-y-4 px-5 pb-5 pt-3 sm:px-6">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Pick a user who has signed in to Record Lab. <strong className="text-ink">Add admin</strong> gives them the same access you have.{" "}
            <strong className="text-ink">Transfer</strong> gives them admin and removes yours, in one step, so there is never a time with no admin. You can only remove your own access, never someone else&apos;s.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">User</span>
            <select value={target} onChange={(e) => { setTarget(e.target.value); setMode(null); setDone(""); }} className={select} aria-label="User to make admin">
              <option value="">Choose a user…</option>
              {candidates.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.displayName ? `${p.displayName} (${p.email})` : p.email}
                </option>
              ))}
            </select>
          </label>

          {mode === null && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!chosen} onClick={() => setMode("add")} className="ui-primary flex min-h-10 items-center gap-2 px-4 py-2 text-xs font-semibold disabled:opacity-50">
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2.3} /> Add as admin
              </button>
              <button type="button" disabled={!chosen} onClick={() => setMode("transfer")} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-2 px-4 text-xs font-semibold disabled:opacity-50">
                <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.3} /> Transfer my access
              </button>
            </div>
          )}

          {mode && (
            <div role="alertdialog" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
                {mode === "add" && `Make ${chosen?.displayName || chosen?.email} an admin? They will be able to read all records and send mail to users.`}
                {mode === "transfer" && `Hand admin access to ${chosen?.displayName || chosen?.email}? You will lose access to this area right away.`}
                {mode === "stepdown" && "Step down as admin? You will lose access to this area right away."}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void run()} disabled={busy} className="ui-primary min-h-10 px-4 py-2 text-xs font-semibold disabled:opacity-50">
                  {busy ? "Working…" : mode === "add" ? "Yes, add admin" : mode === "transfer" ? "Yes, transfer" : "Yes, step down"}
                </button>
                <button type="button" onClick={() => setMode(null)} disabled={busy} className="ui-btn ui-btn-secondary px-4 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          {done && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" /> {done}</p>}
          {view && candidates.length === 0 && <p className="text-xs text-ink-soft">Everyone who has signed in is already an admin.</p>}
        </div>
      </Card>
    </>
  );
}
