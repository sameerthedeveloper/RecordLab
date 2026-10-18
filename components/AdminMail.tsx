"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import type { ProfileRow } from "@/lib/adminService";
import { DAY, emailDomainOf, firstName } from "@/lib/adminFormat";
import { buildMailHtml } from "@/lib/mailTemplate";
import { Card } from "./admin/ui";

type Audience = "all" | "active7" | "new7" | "college" | "me";

const AUDIENCES: { id: Audience; label: string; note: string }[] = [
  { id: "all", label: "Everyone", note: "Every user with an email address" },
  { id: "active7", label: "Active this week", note: "Seen in the last 7 days" },
  { id: "new7", label: "New this week", note: "Joined in the last 7 days" },
  { id: "college", label: "One college", note: "Everyone with the same email domain" },
  { id: "me", label: "Just me (test)", note: "Send it to yourself first" },
];

const CHUNK = 50;
const field = "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

async function idToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in again to send mail.");
  return user.getIdToken();
}

interface Props {
  profiles: ProfileRow[];
  adminEmail: string | null;
  collegeOf: (email: string | null) => string | null;
}

/** Admin: write a message and send it from the Workspace address to a chosen group of users. */
export function AdminMail({ profiles, adminEmail, collegeOf }: Props) {
  const [status, setStatus] = useState<{ configured: boolean; sender: string | null } | "loading" | "error">("loading");
  const [audience, setAudience] = useState<Audience>("all");
  const [domain, setDomain] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Hi {{name}},\n\n\n\nThanks,\nRecord Lab");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ sent: number; failed: { email: string; error: string }[]; error?: string } | null>(null);

  useEffect(() => {
    let live = true;
    idToken()
      .then((t) => fetch("/api/admin/send-mail", { headers: { Authorization: `Bearer ${t}` } }))
      .then((r) => r.json())
      .then((j) => live && setStatus(j.error ? "error" : { configured: j.configured, sender: j.sender }))
      .catch(() => live && setStatus("error"));
    return () => {
      live = false;
    };
  }, []);

  const domains = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of profiles) {
      const d = emailDomainOf(p.email);
      if (d) m.set(d, (m.get(d) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [profiles]);

  const recipients = useMemo(() => {
    const now = Date.now();
    const list = profiles.filter((p) => {
      if (!p.email) return false;
      if (audience === "active7") return p.lastSeenAt !== null && now - p.lastSeenAt.getTime() <= 7 * DAY;
      if (audience === "new7") return p.createdAt !== null && now - p.createdAt.getTime() <= 7 * DAY;
      if (audience === "college") return emailDomainOf(p.email) === domain;
      if (audience === "me") return p.email.toLowerCase() === (adminEmail ?? "").toLowerCase();
      return true;
    });
    return list.map((p) => ({ email: p.email as string, name: p.displayName ?? "" }));
  }, [profiles, audience, domain, adminEmail]);

  const preview = firstName(recipients[0]?.name);
  const previewHtml = useMemo(
    () => buildMailHtml({ subject: (subject || "Your subject").replace(/\{\{\s*name\s*\}\}/gi, preview), text: message.replace(/\{\{\s*name\s*\}\}/gi, preview), cta: ctaLabel.trim() ? { label: ctaLabel, url: ctaUrl } : null }),
    [subject, message, ctaLabel, ctaUrl, preview],
  );
  const ctaBad = ctaLabel.trim().length > 0 && !/^https?:\/\//i.test(ctaUrl.trim());
  const ready = status !== "loading" && status !== "error" && status.configured;
  const canSend = ready && !ctaBad && subject.trim().length > 0 && message.trim().length > 0 && recipients.length > 0 && !sending;

  async function send() {
    setSending(true);
    setConfirm(false);
    setResult(null);
    setProgress(0);
    let sent = 0;
    const failed: { email: string; error: string }[] = [];
    try {
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const res = await fetch("/api/admin/send-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
          body: JSON.stringify({ subject, message, cta: ctaLabel.trim() ? { label: ctaLabel, url: ctaUrl } : null, recipients: recipients.slice(i, i + CHUNK) }),
        });
        const j = (await res.json().catch(() => ({}))) as { sent?: number; failed?: { email: string; error: string }[]; error?: string };
        if (!res.ok) {
          setResult({ sent, failed, error: j.error || "The mail service answered with an error." });
          setSending(false);
          return;
        }
        sent += j.sent ?? 0;
        failed.push(...(j.failed ?? []));
        setProgress(Math.min(recipients.length, i + CHUNK));
      }
      setResult({ sent, failed });
    } catch (e) {
      setResult({ sent, failed, error: e instanceof Error ? e.message : "Couldn't send." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card title="Write a message" aside={status !== "loading" && status !== "error" && status.sender ? <>From <span className="font-mono">{status.sender}</span></> : null}>
        <div className="space-y-4 px-5 pb-5 pt-4 sm:px-6">
          {status === "error" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Couldn&apos;t reach the mail service. Reload, and make sure you&apos;re signed in as an admin.</p>}
          {status !== "loading" && status !== "error" && !status.configured && (
            <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <div>
                <p className="font-semibold">Mail isn&apos;t connected yet</p>
                <p className="mt-0.5 leading-relaxed">
                  Add the <span className="font-mono">GMAIL_CLIENT_ID</span>, <span className="font-mono">GMAIL_CLIENT_SECRET</span>, <span className="font-mono">GMAIL_REFRESH_TOKEN</span> and <span className="font-mono">MAIL_SENDER</span> environment variables for your Workspace address, then redeploy. The steps are in <span className="font-mono">docs/admin-mail.md</span>.
                </p>
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="What's new in Record Lab" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Message <span className="font-normal text-ink-soft/70">· use {"{{name}}"} for each person&apos;s first name</span>
            </span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} maxLength={20000} className={`${field} resize-y leading-relaxed`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Button text <span className="font-normal text-ink-soft/70">· optional</span></span>
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={60} placeholder="Open Record Lab" className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Button link</span>
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://record-lab.vercel.app/editor" inputMode="url" className={field} aria-invalid={ctaBad} />
              {ctaBad && <span className="mt-1 block text-xs text-red-700">The link must start with https://</span>}
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">How it looks <span className="font-normal text-ink-soft/70">· as {preview} would see it</span></p>
            <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="h-[26rem] w-full rounded-xl border border-line bg-white" />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Who gets it">
          <div className="space-y-2 px-5 pb-5 pt-3">
            {AUDIENCES.map((a) => (
              <label key={a.id} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${audience === a.id ? "border-accent bg-accent-soft/40" : "border-line hover:border-accent/40"}`}>
                <input type="radio" name="audience" checked={audience === a.id} onChange={() => { setAudience(a.id); setConfirm(false); }} className="mt-0.5 accent-[#c2410c]" />
                <span>
                  <span className="block text-[13px] font-semibold text-ink">{a.label}</span>
                  <span className="block text-xs text-ink-soft">{a.note}</span>
                </span>
              </label>
            ))}
            {audience === "college" && (
              <select value={domain} onChange={(e) => { setDomain(e.target.value); setConfirm(false); }} className={`${field} mt-1`} aria-label="College email domain">
                <option value="">Choose a college…</option>
                {domains.map(([d, n]) => (
                  <option key={d} value={d}>
                    {collegeOf(`x@${d}`) ?? `@${d}`} ({n})
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>

        <Card title="Send">
          <div className="space-y-3 px-5 pb-5 pt-3 text-[13px]">
            <p className="text-ink-soft">
              <span className="font-serif text-2xl font-bold text-ink">{recipients.length}</span> {recipients.length === 1 ? "person" : "people"} will get this.
            </p>
            {recipients.length > 0 && subject && (
              <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-xs text-ink-soft">
                First line reads: <span className="text-ink">{message.trim().split("\n")[0].replace(/\{\{\s*name\s*\}\}/gi, preview)}</span>
              </p>
            )}
            {!confirm ? (
              <button type="button" disabled={!canSend} onClick={() => setConfirm(true)} className="ui-primary flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <Mail className="h-4 w-4" strokeWidth={2.25} /> Review and send
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <p className="text-xs font-semibold text-accent-ink">Send &quot;{subject}&quot; to {recipients.length} {recipients.length === 1 ? "person" : "people"}? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void send()} className="ui-primary flex min-h-10 flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold">
                    <Send className="h-3.5 w-3.5" strokeWidth={2.25} /> Send now
                  </button>
                  <button type="button" onClick={() => setConfirm(false)} className="ui-btn ui-btn-secondary px-3 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {sending && (
              <p className="flex items-center gap-2 text-xs text-ink-soft" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-accent" /> Sending… {progress} of {recipients.length}
              </p>
            )}
            {result && (
              <div role="status" className={`rounded-xl p-3 text-xs ${result.error || result.failed.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                <p className="flex items-center gap-1.5 font-semibold">
                  {result.error || result.failed.length ? <AlertTriangle className="h-4 w-4" strokeWidth={2.2} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />}
                  {result.sent} sent{result.failed.length ? `, ${result.failed.length} failed` : ""}
                </p>
                {result.error && <p className="mt-1">{result.error}</p>}
                {result.failed.slice(0, 5).map((f) => (
                  <p key={f.email} className="mt-1 break-all">{f.email}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
