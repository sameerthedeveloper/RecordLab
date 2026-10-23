"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Mail, Ticket, Trash2 } from "lucide-react";
import { createPromo, loadPromos, resendPromo, revokePromo, type PromoRow } from "@/lib/promo";
import { fmtDate } from "@/lib/adminFormat";
import { useAdmin } from "./AdminProvider";
import { Card, Empty } from "./ui";

const LENGTHS = [
  { days: 7, label: "1 week" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];
const VALID = [
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
];

const input = "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1 block text-xs font-semibold text-ink-soft";

/** Admin > Billing > Promo codes: give one person free Pro. The code only works for the email it was made for, until its redeem-by date. */
export function PromoCodes() {
  const { data } = useAdmin();
  const [rows, setRows] = useState<PromoRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [validDays, setValidDays] = useState(14);
  const [note, setNote] = useState("");
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState("");
  const [made, setMade] = useState<{ code: string; email: string; mailed: boolean; mailError: string | null } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await loadPromos());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const people = useMemo(() => new Map((data?.usage.profiles ?? []).map((p) => [p.uid, p])), [data]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMade(null);
    try {
      const r = await createPromo({ email, days, validDays, note, send });
      setMade({ ...r, email: email.trim().toLowerCase() });
      setEmail("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't make the code.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? "" : c)), 1800);
    } catch {
      /* clipboard blocked: the code is on screen to copy by hand */
    }
  }

  async function act(code: string, fn: () => Promise<unknown>, okText?: string) {
    setRowBusy(code);
    setError("");
    try {
      await fn();
      if (okText) setMade(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setRowBusy("");
    }
  }

  const now = Date.now();
  const state = (r: PromoRow) => (r.redeemedAt ? "used" : r.codeExpiresAt && r.codeExpiresAt.getTime() < now ? "expired" : "open");
  const chip = { used: "bg-emerald-50 text-emerald-700", expired: "bg-black/5 text-ink-soft", open: "bg-accent-soft text-accent-ink" } as const;
  const btn = "flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-soft hover:border-accent/40 hover:text-accent-ink disabled:opacity-50";

  return (
    <Card title="Promo codes" aside={rows ? `${rows.filter((r) => state(r) === "open").length} unused` : undefined}>
      <div className="space-y-5 px-5 pb-6 pt-4 sm:px-6">
        <form onSubmit={(e) => void create(e)} className="space-y-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            Give one person free Pro. The code works only when they are signed in with this email, and only until the redeem-by date. It adds to any Pro they already have.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
            <label className="block">
              <span className={label}>Their email</span>
              <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.ac.in" autoComplete="off" />
            </label>
            <label className="block">
              <span className={label}>Pro lasts</span>
              <select className={input} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {LENGTHS.map((l) => (
                  <option key={l.days} value={l.days}>
                    {l.label} ({l.days} days)
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Redeem within</span>
              <select className={input} value={validDays} onChange={(e) => setValidDays(Number(e.target.value))}>
                {VALID.map((l) => (
                  <option key={l.days} value={l.days}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={label}>Message in the email (optional)</span>
            <input className={input} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thanks for helping us test Record Lab." />
          </label>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="submit" disabled={busy} className="ui-primary flex min-h-10 items-center gap-1.5 px-5 text-[13px] font-semibold disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" strokeWidth={2.25} />}
              {send ? "Create and email code" : "Create code"}
            </button>
            <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
              <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-accent))]" />
              Email the code to them
            </label>
          </div>
        </form>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        {made && (
          <div role="status" className="rounded-2xl border border-dashed border-accent/50 bg-accent-soft/30 p-4">
            <p className="text-xs font-semibold text-ink-soft">Code for {made.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-[0.12em] text-ink">{made.code}</span>
              <button type="button" onClick={() => void copy(made.code)} className={btn}>
                {copied === made.code ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" />}
                {copied === made.code ? "Copied" : "Copy"}
              </button>
            </div>
            <p className={`mt-2 text-xs font-medium ${made.mailError ? "text-amber-700" : "text-emerald-700"}`}>
              {made.mailError ?? (made.mailed ? "Emailed to them." : "Not emailed. Copy it and send it yourself.")}
            </p>
          </div>
        )}

        {loadError ? (
          <Empty>Couldn&apos;t read promo codes. Deploy the latest firestore.rules (see docs/billing.md), then refresh.</Empty>
        ) : rows === null ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>No codes yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/70 rounded-2xl border border-line bg-white">
            {rows.map((r) => {
              const s = state(r);
              const user = r.redeemedBy ? people.get(r.redeemedBy) : null;
              return (
                <li key={r.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-[13px] font-semibold text-ink">{r.email}</p>
                    <p className="truncate text-xs text-ink-soft">
                      <span className="font-mono">{r.code}</span> · {r.days} days of Pro ·{" "}
                      {s === "used" ? `used ${fmtDate(r.redeemedAt)}${user ? ` by ${user.displayName || user.email}` : ""}` : `redeem by ${fmtDate(r.codeExpiresAt)}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chip[s]}`}>{s === "open" ? "Unused" : s === "used" ? "Used" : "Expired"}</span>
                  {s !== "used" && (
                    <div className="flex gap-2">
                      {s === "open" && (
                        <button type="button" disabled={rowBusy === r.code} className={btn} onClick={() => void act(r.code, async () => {
                          const err = await resendPromo(r.code);
                          if (err) throw new Error(err);
                        })}>
                          <Mail className="h-3.5 w-3.5" /> Resend
                        </button>
                      )}
                      <button type="button" disabled={rowBusy === r.code} className={`${btn} hover:!border-red-300 hover:!text-red-700`} onClick={() => void act(r.code, () => revokePromo(r.code))} aria-label={`Delete code ${r.code}`}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
