"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebaseConfig";
import { DAY } from "@/lib/adminFormat";

type Audience = "all" | "active7" | "me" | "email";
interface Person {
  email: string;
  name: string;
  lastSeen: Date | null;
}

const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "active7", label: "Active this week" },
  { id: "me", label: "Just me (test)" },
  { id: "email", label: "One address" },
];
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const CHUNK = 50;
const field = "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

async function loadPeople(): Promise<Person[]> {
  const snap = await getDocs(query(collection(getDb(), "profiles"), orderBy("lastSeenAt", "desc"), limit(500)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { email: String(x.email ?? "").toLowerCase(), name: String(x.displayName ?? ""), lastSeen: x.lastSeenAt instanceof Timestamp ? x.lastSeenAt.toDate() : null };
    })
    .filter((p) => p.email);
}

/** A short message to a simple audience, from Settings. Longer or designed mail lives in the full Mail page. */
export function QuickMail({ adminEmail, onNavigate }: { adminEmail: string | null; onNavigate: () => void }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [audience, setAudience] = useState<Audience>("me");
  const [address, setAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    loadPeople().then((p) => live && setPeople(p), () => live && setPeople([]));
    return () => {
      live = false;
    };
  }, []);

  const recipients = useMemo(() => {
    if (audience === "email") return EMAIL.test(address.trim()) ? [{ email: address.trim().toLowerCase(), name: people?.find((p) => p.email === address.trim().toLowerCase())?.name ?? "" }] : [];
    if (audience === "me") return adminEmail ? [{ email: adminEmail, name: people?.find((p) => p.email === adminEmail.toLowerCase())?.name ?? "" }] : [];
    const now = Date.now();
    return (people ?? []).filter((p) => audience === "all" || (p.lastSeen !== null && now - p.lastSeen.getTime() <= 7 * DAY)).map(({ email, name }) => ({ email, name }));
  }, [audience, address, people, adminEmail]);

  const ready = subject.trim().length > 0 && message.trim().length > 0 && recipients.length > 0 && !sending;
  const bulk = recipients.length > 1;

  async function send() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return setNote({ ok: false, text: "Sign in again to send mail." });
    setSending(true);
    setConfirm(false);
    setNote(null);
    let sent = 0;
    let failed = 0;
    try {
      const token = await user.getIdToken();
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const res = await fetch("/api/admin/send-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subject, message, cta: null, recipients: recipients.slice(i, i + CHUNK) }),
        });
        const j = (await res.json().catch(() => ({}))) as { sent?: number; failed?: unknown[]; error?: string };
        if (!res.ok) throw new Error(j.error || "The mail service answered with an error.");
        sent += j.sent ?? 0;
        failed += j.failed?.length ?? 0;
      }
      setNote({ ok: failed === 0, text: `Sent to ${sent} ${sent === 1 ? "person" : "people"}${failed ? `, ${failed} failed` : ""}.` });
      if (sent > 0) {
        setSubject("");
        setMessage("");
      }
    } catch (e) {
      setNote({ ok: false, text: `${sent ? `Sent to ${sent}, then stopped. ` : ""}${e instanceof Error ? e.message : "Couldn't send."}` });
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-sm font-bold text-ink">Send mail</h3>
        <Link href="/admin/mail" onClick={onNavigate} className="text-xs font-semibold text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          Open full mail page
        </Link>
      </div>
      <div className="space-y-3 rounded-2xl border border-line p-4">
        <div role="radiogroup" aria-label="Who gets it" className="flex flex-wrap gap-1.5">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={audience === a.id}
              onClick={() => { setAudience(a.id); setConfirm(false); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${audience === a.id ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-soft hover:border-accent/40"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        {audience === "email" && <input type="email" value={address} onChange={(e) => { setAddress(e.target.value); setConfirm(false); }} placeholder="name@college.ac.in" aria-label="Email address" className={field} />}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="Subject" aria-label="Subject" className={field} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Message. Use {{name}} for their first name." aria-label="Message" className={`${field} resize-y`} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-soft" aria-live="polite">
            {people === null && audience !== "me" && audience !== "email" ? "Loading people…" : <><span className="font-semibold text-ink">{recipients.length}</span> {recipients.length === 1 ? "person" : "people"} will get this.</>}
          </p>
          {confirm ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="rounded-full px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-ink/5">Cancel</button>
              <button type="button" onClick={send} className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90">Send to {recipients.length} now</button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => (bulk ? setConfirm(true) : send())}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.25} />}
              {sending ? "Sending…" : "Send"}
            </button>
          )}
        </div>
        {note && <p role={note.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-xs font-medium ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{note.text}</p>}
      </div>
    </section>
  );
}
