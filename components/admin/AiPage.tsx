"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Loader2, PlayCircle, Sparkles } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { saveAiConfig, useAiConfig } from "@/lib/aiConfig";
import { AI_MODES, DEFAULT_AI_CONFIG, type AiConfig } from "@/lib/aiConfigShared";
import { generateViaServer, ServerAiError } from "@/lib/aiServer";
import { useAdmin } from "./AdminProvider";
import { Card } from "./ui";

interface Availability {
  anthropic: boolean;
  openaiCompatible: boolean;
  keyless: boolean;
  defaultModel: string | null;
}

const input =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1 block text-xs font-semibold text-ink-soft";

const ERRORS: Record<string, string> = {
  disabled: "AI is switched off in the saved settings.",
  mode_puter: "The saved mode is Puter only, so the server doesn't answer.",
  not_configured: "That mode needs something the server doesn't have (an API key, or the keyless provider is off).",
  rate_limit: "You hit the per-minute limit. Wait a moment.",
  daily_limit: "You hit the daily limit.",
  provider_failed: "The provider didn't answer. Try again, or pick another mode.",
  sign_in: "Sign in first.",
};

/** Admin > AI: switch the assistant on or off for everyone, choose who answers, set the limits. Saved to config/ai. */
export function AiPage() {
  const { me } = useAdmin();
  const saved = useAiConfig();
  const [draft, setDraft] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);

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
        const res = await fetch("/api/ai/status", { headers: { Authorization: `Bearer ${token}` } });
        if (live && res.ok) setAvail((await res.json()) as Availability);
      } catch {
        /* the strip just stays hidden */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const changed = !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await saveAiConfig(draft, me.uid);
      setMessage({ ok: true, text: "Saved. The server picks it up within 30 seconds." });
    } catch (e) {
      setMessage({ ok: false, text: /permission/i.test(String((e as Error)?.message)) ? "Firestore refused this. Deploy the latest firestore.rules (see docs/ai-provider.md)." : "Couldn't save the AI settings. Try again." });
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTest(null);
    const t0 = performance.now();
    try {
      const text = await generateViaServer("Reply with the single word: ok");
      setTest({ ok: true, text: `Answered in ${((performance.now() - t0) / 1000).toFixed(1)} s: "${text.trim().slice(0, 40)}"` });
    } catch (e) {
      setTest({ ok: false, text: ERRORS[(e as ServerAiError)?.code] ?? "The test failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Card title="AI assistant" aside={saved ? (saved.enabled ? "On" : "Off") : undefined}>
        <div className="space-y-5 px-5 pb-6 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">AI assistant for everyone</p>
                <p className="text-xs leading-relaxed text-ink-soft">Off hides Direct LLM in the editor and the server refuses it. Copy prompt and Paste import keep working.</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              aria-label="AI assistant for everyone"
              onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${draft.enabled ? "bg-accent" : "bg-ink/20"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${draft.enabled ? "left-6" : "left-1"}`} />
            </button>
          </div>

          <fieldset>
            <legend className={label}>Who answers Direct LLM</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Who answers">
              {AI_MODES.map((m) => {
                const active = draft.mode === m.id;
                const missing = avail && ((m.id === "key" && !avail.anthropic && !avail.openaiCompatible) || (m.id === "keyless" && !avail.keyless));
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDraft({ ...draft, mode: m.id })}
                    className={`rounded-2xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-line bg-white hover:border-accent/40"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-ink">{m.name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{m.note}</span>
                    {missing && <span className="mt-1.5 block text-xs font-semibold text-amber-700">Not set up on the server</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={label}>Requests a minute, per user</span>
              <input type="number" min={1} max={60} value={draft.perMinute} onChange={(e) => setDraft({ ...draft, perMinute: Number(e.target.value) })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Requests a day, per user</span>
              <input type="number" min={1} max={1000} value={draft.perDay} onChange={(e) => setDraft({ ...draft, perDay: Number(e.target.value) })} className={input} />
            </label>
            <label className="block">
              <span className={label}>Model (optional)</span>
              <input type="text" maxLength={80} value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder={avail?.defaultModel ?? "Provider default"} className={input} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!changed || saving}
              className="ui-primary flex min-h-10 items-center gap-1.5 px-5 text-[13px] font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              Save AI settings
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

      <Card title="Server and test">
        <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
          {avail ? (
            <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
              {[
                ["Claude API key", avail.anthropic ? "Set" : "Not set"],
                ["OpenAI-compatible key", avail.openaiCompatible ? "Set" : "Not set"],
                ["Keyless provider", avail.keyless ? "On" : "Off"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-black/[0.04] px-3 py-2.5">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-ink-soft">Checking what the server has…</p>
          )}
          <p className="text-xs leading-relaxed text-ink-soft">Keys are set on the server (see docs/ai-provider.md) and are never shown here.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runTest()}
              disabled={testing}
              className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-1.5 text-[13px] disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" strokeWidth={2.25} />}
              Test the saved settings
            </button>
          </div>
          {test && (
            <p role="status" className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium ${test.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {test.ok ? <Check className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> : <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />}
              {test.text}
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
