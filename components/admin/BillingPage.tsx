"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { Check, CircleAlert, Loader2, Wallet } from "lucide-react";
import { saveBillingConfig, useBillingConfig } from "@/lib/billing";
import { DEFAULT_BILLING_CONFIG, formatInr, type BillingConfig } from "@/lib/billingShared";
import { fmtDate } from "@/lib/adminFormat";
import { getDb, getFirebaseAuth } from "@/lib/firebaseConfig";
import { useAdmin } from "./AdminProvider";
import { PromoCodes } from "./PromoCodes";
import { Avatar, Card, Empty, Kpi, Switch } from "./ui";

interface ServerStatus {
  razorpayKeys: boolean;
  testMode: boolean;
  webhookSecret: boolean;
  adminSdk: boolean;
}
interface SubRow {
  uid: string;
  plan: string;
  expiresAt: Date | null;
}
interface PayRow {
  id: string;
  uid: string;
  amount: number;
  plan: string;
  paidAt: Date | null;
}

const input = "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1 block text-xs font-semibold text-ink-soft";
const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

/** Admin > Billing: switch paid plans on, set the free limit and prices, check the Razorpay setup, see who has paid. */
export function BillingPage() {
  const { me, data } = useAdmin();
  const saved = useBillingConfig();
  const [draft, setDraft] = useState<BillingConfig>(DEFAULT_BILLING_CONFIG);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [subs, setSubs] = useState<SubRow[] | null>(null);
  const [pays, setPays] = useState<PayRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (saved && !synced) {
      setDraft(saved);
      setSynced(true);
    }
  }, [saved, synced]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = await getFirebaseAuth().currentUser?.getIdToken();
        const res = await fetch("/api/billing/status", { headers: { Authorization: `Bearer ${token}` } });
        if (live && res.ok) setStatus((await res.json()) as ServerStatus);
      } catch {
        /* the checklist just stays hidden */
      }
      try {
        const [s, p] = await Promise.all([
          getDocs(query(collection(getDb(), "subscriptions"), limit(500))),
          getDocs(query(collection(getDb(), "payments"), orderBy("paidAt", "desc"), limit(500))),
        ]);
        if (!live) return;
        setSubs(s.docs.map((d) => ({ uid: d.id, plan: String(d.data().plan ?? ""), expiresAt: date(d.data().expiresAt) })));
        setPays(p.docs.map((d) => ({ id: d.id, uid: String(d.data().uid ?? ""), amount: Number(d.data().amount ?? 0), plan: String(d.data().plan ?? ""), paidAt: date(d.data().paidAt) })));
      } catch {
        if (live) setLoadError(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const people = useMemo(() => new Map((data?.usage.profiles ?? []).map((p) => [p.uid, p])), [data]);
  const nameOf = (uid: string) => people.get(uid)?.displayName || people.get(uid)?.email || uid;

  const changed = !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const now = Date.now();
  const active = (subs ?? []).filter((s) => s.expiresAt && s.expiresAt.getTime() > now).sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime());
  const revenue = (pays ?? []).reduce((n, p) => n + p.amount, 0);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await saveBillingConfig(draft, me.uid);
      setMessage({ ok: true, text: draft.enabled ? "Saved. Paid plans are on: free accounts are now limited." : "Saved. Paid plans are off: everything is free." });
    } catch (e) {
      setMessage({ ok: false, text: /permission/i.test(String((e as Error)?.message)) ? "Firestore refused this. Deploy the latest firestore.rules (see docs/billing.md)." : "Couldn't save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const ready = status ? status.razorpayKeys && status.adminSdk : null;
  return (
    <>
      <Card title="Paid plans" aside={saved ? (saved.enabled ? "On" : "Off") : undefined}>
        <div className="space-y-5 px-5 pb-6 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Wallet className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Charge for Pro</p>
                <p className="text-xs leading-relaxed text-ink-soft">
                  Off: every account is free and unlimited. On: a free account keeps up to the limit below; Pro is unlimited. Nobody&apos;s existing records are deleted.
                </p>
                {draft.enabled && ready === false && <p className="mt-1.5 text-xs font-semibold text-amber-700">Razorpay isn&apos;t fully set up yet (see below). People would hit a limit they can&apos;t pay to lift.</p>}
              </div>
            </div>
            <Switch checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} label="Charge for Pro" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={label}>Free records per account</span>
              <input type="number" min={1} max={1000} value={draft.freeLimit} onChange={(e) => setDraft({ ...draft, freeLimit: Number(e.target.value) })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Monthly price (₹)</span>
              <input type="number" min={1} max={10000} step="0.5" value={draft.monthPaise / 100} onChange={(e) => setDraft({ ...draft, monthPaise: Math.round(Number(e.target.value) * 100) })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Yearly price (₹)</span>
              <input type="number" min={1} max={10000} step="0.5" value={draft.yearPaise / 100} onChange={(e) => setDraft({ ...draft, yearPaise: Math.round(Number(e.target.value) * 100) })} className={input} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void save()} disabled={!changed || saving} className="ui-primary flex min-h-10 items-center gap-1.5 px-5 text-[13px] font-semibold disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              Save billing settings
            </button>
            {changed && <span className="text-xs text-ink-soft">Unsaved changes</span>}
          </div>
          {message && (
            <p role="status" className={`rounded-xl px-3 py-2 text-xs font-medium ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}
        </div>
      </Card>

      <Card title="Razorpay setup" aside={status?.testMode ? "Test mode" : undefined}>
        <div className="space-y-3 px-5 pb-6 pt-4 sm:px-6">
          {status ? (
            <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
              {[
                ["API keys", status.razorpayKeys ? (status.testMode ? "Set (test)" : "Set (live)") : "Not set", status.razorpayKeys],
                ["Server write access", status.adminSdk ? "Set" : "Not set", status.adminSdk],
                ["Webhook secret", status.webhookSecret ? "Set" : "Not set", status.webhookSecret],
              ].map(([k, v, ok]) => (
                <div key={String(k)} className="rounded-xl bg-black/[0.04] px-3 py-2.5">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className={`mt-0.5 flex items-center gap-1.5 font-semibold ${ok ? "text-ink" : "text-amber-700"}`}>
                    {!ok && <CircleAlert className="h-3.5 w-3.5" />}
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-ink-soft">Checking what the server has…</p>
          )}
          <p className="text-xs leading-relaxed text-ink-soft">
            Keys are environment variables on the server (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT) and are never shown here. The webhook URL is <span className="font-mono">/api/billing/webhook</span>. Steps are in docs/billing.md.
          </p>
        </div>
      </Card>

      <PromoCodes />

      <div className="grid gap-4 sm:grid-cols-2">
        <Kpi label="Active Pro accounts" value={subs ? active.length : "…"} icon={Wallet} />
        <Kpi label="Collected so far" value={pays ? formatInr(revenue) : "…"} note={pays ? `${pays.length} payment${pays.length === 1 ? "" : "s"}` : undefined} icon={Wallet} />
      </div>

      <Card title="Pro accounts" aside={subs ? `${active.length} active` : undefined}>
        {loadError ? (
          <Empty>Couldn&apos;t read subscriptions. Deploy the latest firestore.rules (see docs/billing.md), then refresh.</Empty>
        ) : subs === null ? (
          <Empty>Loading…</Empty>
        ) : active.length === 0 ? (
          <Empty>No one is on Pro yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
            {active.map((s) => (
              <li key={s.uid} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={nameOf(s.uid)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{nameOf(s.uid)}</p>
                  <p className="truncate text-xs text-ink-soft">{people.get(s.uid)?.email ?? s.uid}</p>
                </div>
                <p className="shrink-0 text-right text-xs text-ink-soft">
                  {s.plan === "year" ? "Yearly" : "Monthly"}
                  <br />
                  until {fmtDate(s.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
