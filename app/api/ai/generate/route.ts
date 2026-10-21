import { NextResponse } from "next/server";
import { aiGenerate, aiUsable } from "@/lib/server/aiProvider";
import { readAiConfig } from "@/lib/server/aiConfig";
import { verifyUser } from "@/lib/server/userAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT_CHARS = 24_000;

/** Best-effort limits per user, kept in this server instance's memory (a restart or another instance resets them). */
const hits = new Map<string, number[]>();

function allow(uid: string, perMinute: number, perDay: number): "ok" | "minute" | "day" {
  const now = Date.now();
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < 24 * 60 * 60 * 1000);
  if (recent.length >= perDay) return "day";
  if (recent.filter((t) => now - t < 60_000).length >= perMinute) return "minute";
  recent.push(now);
  hits.set(uid, recent);
  return "ok";
}

/**
 * Generates text with the server's own AI provider for any signed-in user, so the AI assistant works with one
 * Record Lab sign-in and no Puter account. What is allowed (on or off, which provider, the limits, the model) is
 * set by an admin in Settings > AI and read from config/ai. Keys never leave the server.
 */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const idToken = request.headers.get("authorization")!.replace(/^Bearer\s+/i, "");

  const config = await readAiConfig(idToken);
  if (!config.enabled) return NextResponse.json({ error: "disabled" }, { status: 403 });
  if (!aiUsable(config.mode)) return NextResponse.json({ error: config.mode === "puter" ? "mode_puter" : "not_configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!prompt.trim() || prompt.length > MAX_PROMPT_CHARS) return NextResponse.json({ error: "bad_prompt" }, { status: 400 });

  const gate = allow(user.uid, config.perMinute, config.perDay);
  if (gate !== "ok") return NextResponse.json({ error: gate === "day" ? "daily_limit" : "rate_limit" }, { status: 429 });

  try {
    const text = await aiGenerate(prompt, config.mode, config.model);
    if (!text.trim()) return NextResponse.json({ error: "empty" }, { status: 502 });
    return NextResponse.json({ text });
  } catch (e) {
    console.error("AI provider failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "provider_failed" }, { status: 502 });
  }
}
