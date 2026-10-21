import type { AiMode } from "../aiConfigShared";

/**
 * The server's own AI provider, used when someone has not linked a Puter account, so one Record Lab sign-in is enough.
 * Pick ONE with environment variables (never NEXT_PUBLIC_*: the key must stay on the server):
 *   ANTHROPIC_API_KEY            Claude via the Messages API.            AI_MODEL optional (default claude-sonnet-5-5)
 *   AI_API_KEY (+ AI_BASE_URL)   Any OpenAI-compatible chat endpoint:    AI_MODEL optional (default gpt-4o-mini)
 *                                OpenAI, OpenRouter, Groq, Gemini's compatibility endpoint, a local server...
 * Anthropic wins when both are set. With neither set, a KEYLESS public provider answers (Pollinations' anonymous tier, an
 * OpenAI-compatible endpoint that needs no account or key). Set AI_KEYLESS=off to turn that off and use Puter only.
 */
const KEYLESS_BASE = "https://text.pollinations.ai/openai";
export const AI_MAX_OUTPUT_TOKENS = 6000;

const hasKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY);
const keylessOn = () => process.env.AI_KEYLESS !== "off";

export function aiConfigured(): boolean {
  return hasKey() || keylessOn();
}

/** What the server has available, for the admin's AI settings (never the keys themselves). */
export function aiAvailability() {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openaiCompatible: !!process.env.AI_API_KEY,
    keyless: keylessOn(),
    defaultModel: process.env.AI_MODEL || null,
  };
}

/** Can the server answer in this mode? (`puter` never; `key` needs a key; `keyless` needs the switch on.) */
export function aiUsable(mode: AiMode): boolean {
  if (mode === "puter") return false;
  if (mode === "key") return hasKey();
  if (mode === "keyless") return keylessOn();
  return aiConfigured();
}

/** `model` (from the admin's settings) beats the AI_MODEL environment variable; empty = the provider's default. */
export async function aiGenerate(prompt: string, mode: AiMode = "auto", modelOverride = ""): Promise<string> {
  const signal = AbortSignal.timeout(55_000);
  const model = modelOverride || process.env.AI_MODEL;
  const useKeyed = mode === "key" || (mode === "auto" && hasKey());

  if (useKeyed && process.env.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: model || "claude-sonnet-5-5", max_tokens: AI_MAX_OUTPUT_TOKENS, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  }

  const keyed = useKeyed && !!process.env.AI_API_KEY;
  const url = keyed ? `${(process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions` : KEYLESS_BASE;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { ...(keyed ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}), "content-type": "application/json" },
    body: JSON.stringify({ model: keyed ? model || "gpt-4o-mini" : model || "openai", max_tokens: AI_MAX_OUTPUT_TOKENS, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}
