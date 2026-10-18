"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Copy, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import type { ProfileRow } from "@/lib/adminService";
import { DAY, emailDomainOf, firstName } from "@/lib/adminFormat";
import { buildMailHtml } from "@/lib/mailTemplate";
import { buildMailPrompt, draftFromAnswer, MAIL_PURPOSES, MAIL_TONES, parseMailDraft, type MailTone } from "@/lib/mailAi";
import { generateContent } from "@/lib/puter";
import { Card } from "./admin/ui";

type Audience = "all" | "active7" | "new7" | "college" | "me" | "one";

const DRAFT_KEY = "recordlab.admin-mail-draft";
const LOG_KEY = "recordlab.admin-mail-log";
interface SentLog {
  at: number;
  subject: string;
  audience: string;
  sent: number;
  failed: number;
}

const AUDIENCES: { id: Audience; label: string; note: string }[] = [
  { id: "all", label: "Everyone", note: "Every user with an email address" },
  { id: "active7", label: "Active this week", note: "Seen in the last 7 days" },
  { id: "new7", label: "New this week", note: "Joined in the last 7 days" },
  { id: "college", label: "One college", note: "Everyone with the same email domain" },
  { id: "me", label: "Just me (test)", note: "Send it to yourself first" },
  { id: "one", label: "One person", note: "The user you chose in Users" },
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
  const toUid = useSearchParams().get("to");
  const [audience, setAudience] = useState<Audience>(toUid ? "one" : "all");
  const [log, setLog] = useState<SentLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftLoaded = useRef(false);
  const [domain, setDomain] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Hi {{name}},\n\n\n\nThanks,\nRecord Lab");
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState<MailTone>("friendly");
  const [aiMode, setAiMode] = useState<"direct" | "copy">("direct");
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [writing, setWriting] = useState(false);
  const [aiError, setAiError] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ sent: number; failed: { email: string; error: string }[]; error?: string; note?: string } | null>(null);

  // Bring back an unsent draft and the recent sends from this browser.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as { subject?: string; message?: string; ctaLabel?: string; ctaUrl?: string; purpose?: string } | null;
      if (d) {
        if (d.subject) setSubject(d.subject);
        if (d.message) setMessage(d.message);
        if (d.ctaLabel) setCtaLabel(d.ctaLabel);
        if (d.ctaUrl) setCtaUrl(d.ctaUrl);
        if (d.purpose) setPurpose(d.purpose);
        if (d.subject || (d.message && d.message.trim().length > 40)) setDraftSaved(true);
      }
      setLog(JSON.parse(localStorage.getItem(LOG_KEY) || "[]") as SentLog[]);
    } catch {}
    draftLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, message, ctaLabel, ctaUrl, purpose }));
      } catch {}
    }, 400);
    return () => window.clearTimeout(t);
  }, [subject, message, ctaLabel, ctaUrl, purpose]);

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
      if (audience === "one") return p.uid === toUid;
      return true;
    });
    return list.map((p) => ({ email: p.email as string, name: p.displayName ?? "" }));
  }, [profiles, audience, domain, adminEmail, toUid]);

  const preview = firstName(recipients[0]?.name);
  const previewHtml = useMemo(
    () => buildMailHtml({ subject: (subject || "Your subject").replace(/\{\{\s*name\s*\}\}/gi, preview), text: message.replace(/\{\{\s*name\s*\}\}/gi, preview), cta: ctaLabel.trim() ? { label: ctaLabel, url: ctaUrl } : null }),
    [subject, message, ctaLabel, ctaUrl, preview],
  );
  const ctaBad = ctaLabel.trim().length > 0 && !/^https?:\/\//i.test(ctaUrl.trim());
  const ready = status !== "loading" && status !== "error" && status.configured;
  const canSend = ready && !ctaBad && subject.trim().length > 0 && message.trim().length > 0 && recipients.length > 0 && !sending;

  /** The prompt for the current purpose, tone and audience: what "Copy prompt" puts on the clipboard. */
  const promptText = () => buildMailPrompt(purpose, tone, AUDIENCES.find((a) => a.id === audience)?.note ?? "Record Lab users");

  async function copyPrompt() {
    if (!purpose.trim()) return;
    try {
      await navigator.clipboard.writeText(promptText());
    } catch {
      const t = document.createElement("textarea");
      t.value = promptText();
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function useAnswer() {
    const draft = draftFromAnswer(pasted);
    if (!draft) {
      setAiError("Nothing to use yet. Paste the AI's whole answer.");
      return;
    }
    // No subject line in the answer: keep the message and let the person write the subject.
    setAiError(draft.subject ? "" : "Used the message. The answer had no subject line, so write one in the Subject box.");
    if (draft.subject) setSubject(draft.subject);
    setMessage(draft.message);
    setCtaLabel(draft.buttonLabel);
    setCtaUrl(draft.buttonUrl);
    setConfirm(false);
    setPasted("");
  }

  async function writeWithAi() {
    if (!purpose.trim() || writing) return;
    setWriting(true);
    setAiError("");
    try {
      const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.note ?? "Record Lab users";
      const draft = parseMailDraft(await generateContent(buildMailPrompt(purpose, tone, audienceLabel)));
      if (!draft) throw new Error("The AI answer wasn't an email. Try again, or give it a bit more detail.");
      setSubject(draft.subject);
      setMessage(draft.message);
      setCtaLabel(draft.buttonLabel);
      setCtaUrl(draft.buttonUrl);
      setConfirm(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't write the email. Try again.");
    } finally {
      setWriting(false);
    }
  }

  function recordSend(sent: number, failedCount: number) {
    const entry: SentLog = { at: Date.now(), subject, audience: AUDIENCES.find((a) => a.id === audience)?.label ?? "", sent, failed: failedCount };
    const next = [entry, ...log].slice(0, 8);
    setLog(next);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(next));
      if (failedCount === 0) localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function clearDraft() {
    setSubject("");
    setMessage("Hi {{name}},\n\n\n\nThanks,\nRecord Lab");
    setCtaLabel("");
    setCtaUrl("");
    setPurpose("");
    setPasted("");
    setResult(null);
    setDraftSaved(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  /** One real email to the admin only, no confirmation needed: the safe way to check how it looks in an inbox. */
  async function sendTest() {
    if (!adminEmail || !subject.trim() || !message.trim() || testing) return;
    setTesting(true);
    setResult(null);
    try {
      const me = profiles.find((p) => p.email?.toLowerCase() === adminEmail.toLowerCase());
      const res = await fetch("/api/admin/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
        body: JSON.stringify({ subject: `[Test] ${subject}`, message, cta: ctaLabel.trim() ? { label: ctaLabel, url: ctaUrl } : null, recipients: [{ email: adminEmail, name: me?.displayName ?? "" }] }),
      });
      const j = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      setResult(res.ok && j.sent ? { sent: 1, failed: [], note: `Test sent to ${adminEmail}. Check your inbox.` } : { sent: 0, failed: [], error: j.error || "The test didn't send." });
    } catch (e) {
      setResult({ sent: 0, failed: [], error: e instanceof Error ? e.message : "The test didn't send." });
    } finally {
      setTesting(false);
    }
  }

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
      setResult({ sent, failed: failed });
      recordSend(sent, failed.length);
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

          {draftSaved && (
            <p className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.04] px-3 py-2 text-xs text-ink-soft">
              <span>Your unsent draft was restored. It saves as you type.</span>
              <button type="button" onClick={clearDraft} className="shrink-0 font-semibold text-accent hover:underline">
                Start over
              </button>
            </p>
          )}
          <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-ink">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} /> Write it with AI
              </p>
              <div role="tablist" aria-label="How to use AI" className="flex rounded-full bg-black/[0.05] p-0.5">
                {([["direct", "Write for me"], ["copy", "Copy prompt"]] as const).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={aiMode === id} onClick={() => { setAiMode(id); setAiError(""); }} className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${aiMode === id ? "bg-white text-accent-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-2 block">
              <span className="sr-only">What is this email for?</span>
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} maxLength={600} placeholder="What is this email for? e.g. We added HTML, CSS and JavaScript output to records. Tell students how to try it." className={`${field} resize-y`} />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MAIL_PURPOSES.map((p) => (
                <button key={p} type="button" onClick={() => setPurpose(p)} className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-accent">
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={tone} onChange={(e) => setTone(e.target.value as MailTone)} aria-label="Tone" className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft outline-none focus:border-accent">
                {MAIL_TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {aiMode === "direct" ? (
                <>
                  <button type="button" onClick={() => void writeWithAi()} disabled={!purpose.trim() || writing} className="ui-primary flex min-h-10 items-center gap-2 px-4 py-2 text-xs font-semibold disabled:opacity-50">
                    {writing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />}
                    {writing ? "Writing…" : subject || message.trim().length > 40 ? "Write again" : "Write the email"}
                  </button>
                  <span className="text-[11px] text-ink-soft/80">Fills the subject, message and button below. You can edit everything.</span>
                </>
              ) : (
                <button type="button" onClick={() => void copyPrompt()} disabled={!purpose.trim()} className="ui-primary flex min-h-10 items-center gap-2 px-4 py-2 text-xs font-semibold disabled:opacity-50">
                  <Copy className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              )}
            </div>
            {aiMode === "copy" && (
              <div className="mt-3 space-y-2 border-t border-accent/20 pt-3">
                <ol className="space-y-1 text-[12px] leading-relaxed text-ink-soft">
                  <li><span className="font-semibold text-ink">1.</span> Describe the purpose above, then press <span className="font-semibold">Copy prompt</span>.</li>
                  <li><span className="font-semibold text-ink">2.</span> Paste it into ChatGPT, Claude or Gemini.</li>
                  <li><span className="font-semibold text-ink">3.</span> Copy the whole answer and paste it here.</li>
                </ol>
                <label className="block">
                  <span className="sr-only">Paste the AI&apos;s answer</span>
                  <textarea value={pasted} onChange={(e) => { setPasted(e.target.value); setAiError(""); }} rows={4} placeholder="Paste the AI's answer here" className={`${field} resize-y font-mono text-xs`} />
                </label>
                <button type="button" onClick={useAnswer} disabled={!pasted.trim()} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-2 px-4 text-xs font-semibold disabled:opacity-50">
                  <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={2.2} /> Use this answer
                </button>
              </div>
            )}
            {aiError && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{aiError}</p>}
          </div>

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
            {AUDIENCES.filter((a) => a.id !== "one" || toUid).map((a) => (
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
              <>
                <button type="button" disabled={!canSend} onClick={() => setConfirm(true)} className="ui-primary flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  <Mail className="h-4 w-4" strokeWidth={2.25} /> Review and send
                </button>
                <button type="button" onClick={() => void sendTest()} disabled={!ready || !adminEmail || !subject.trim() || !message.trim() || testing || sending} className="ui-btn ui-btn-secondary flex min-h-10 w-full items-center justify-center gap-2 px-4 text-xs font-semibold disabled:opacity-50" title={adminEmail ? `Sends one copy to ${adminEmail}` : undefined}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2.2} />} Send a test to me
                </button>
              </>
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
                  {result.note ? "Test sent" : `${result.sent} sent${result.failed.length ? `, ${result.failed.length} failed` : ""}`}
                </p>
                {result.error && <p className="mt-1">{result.error}</p>}
                {result.note && <p className="mt-1">{result.note}</p>}
                {result.failed.slice(0, 5).map((f) => (
                  <p key={f.email} className="mt-1 break-all">{f.email}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        </Card>

        {log.length > 0 && (
          <Card title="Recently sent" aside="From this browser">
            <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
              {log.slice(0, 5).map((l) => (
                <li key={l.at} className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-semibold text-ink">{l.subject}</p>
                  <p className="text-xs text-ink-soft">
                    {l.audience} · {l.sent} sent{l.failed ? `, ${l.failed} failed` : ""} · {new Date(l.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
