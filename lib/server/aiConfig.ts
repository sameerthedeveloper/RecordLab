import { DEFAULT_AI_CONFIG, sanitizeAiConfig, type AiConfig } from "../aiConfigShared";

let cache: { at: number; value: AiConfig } | null = null;

/**
 * Reads config/ai through Firestore's REST API as the calling user (the rules let any signed-in user read it),
 * cached for 30 seconds so an admin's change reaches the server almost at once without a read per request.
 * No document, or the rules not deployed: the defaults.
 */
export async function readAiConfig(idToken: string): Promise<AiConfig> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let value = DEFAULT_AI_CONFIG;
  if (project) {
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/config/ai`, {
        headers: { Authorization: `Bearer ${idToken}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const f = ((await res.json()) as { fields?: Record<string, Record<string, string | boolean>> }).fields ?? {};
        value = sanitizeAiConfig({
          enabled: f.enabled?.booleanValue,
          mode: f.mode?.stringValue,
          perMinute: f.perMinute?.integerValue ?? f.perMinute?.doubleValue,
          perDay: f.perDay?.integerValue ?? f.perDay?.doubleValue,
          model: f.model?.stringValue,
        });
      }
    } catch {
      /* keep the defaults */
    }
  }
  cache = { at: Date.now(), value };
  return value;
}
