/**
 * The admin's controls over the AI assistant, stored at config/ai (readable by every signed-in user, writable by admins).
 * Shared by the browser (to hide or explain the feature) and the server (which is what actually enforces it).
 */
export type AiMode =
  | "auto" // server API key if there is one, else the keyless provider, then Puter
  | "keyless" // the keyless public provider only, then Puter
  | "key" // the server's API key only, then Puter
  | "puter"; // Puter only: the server never answers

export interface AiConfig {
  /** Master switch for everyone. */
  enabled: boolean;
  mode: AiMode;
  /** Server requests allowed per user. */
  perMinute: number;
  perDay: number;
  /** Optional model name for the server provider; empty = the provider's default. */
  model: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = { enabled: true, mode: "auto", perMinute: 6, perDay: 60, model: "" };

export const AI_MODES: { id: AiMode; name: string; note: string }[] = [
  { id: "auto", name: "Automatic", note: "Your API key if one is set, otherwise the keyless provider. Puter is the backup." },
  { id: "keyless", name: "Keyless provider", note: "A free public provider that needs no key. Shared, can be slow. Puter is the backup." },
  { id: "key", name: "Your API key", note: "Only the key set on the server. Best quality and speed. Puter is the backup." },
  { id: "puter", name: "Puter only", note: "No server provider. Each student links a Puter account." },
];

const num = (v: unknown, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

/** Anything stored (or sent) becomes a safe config: unknown values fall back to the defaults. */
export function sanitizeAiConfig(raw: Record<string, unknown> | null | undefined): AiConfig {
  const d = DEFAULT_AI_CONFIG;
  const mode = AI_MODES.some((m) => m.id === raw?.mode) ? (raw!.mode as AiMode) : d.mode;
  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : d.enabled,
    mode,
    perMinute: num(raw?.perMinute, 1, 60, d.perMinute),
    perDay: num(raw?.perDay, 1, 1000, d.perDay),
    model: typeof raw?.model === "string" ? raw.model.trim().slice(0, 80) : d.model,
  };
}
