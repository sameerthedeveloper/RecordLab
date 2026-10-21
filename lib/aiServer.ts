"use client";

import { getFirebaseAuth } from "./firebaseConfig";

/** Why the server could not answer. `not_configured` and `sign_in` mean "don't ask again this session". */
export class ServerAiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** An error whose message is safe and useful to show the person as it is. */
export class AiUserError extends Error {}

let unavailable = false;

/** True once the server has said it has no key or the person isn't signed in: callers go straight to Puter. */
export const serverAiUnavailable = () => unavailable;

/** Generates text with the server's AI key (see lib/server/aiProvider.ts). Needs a Record Lab sign-in, nothing else. */
export async function generateViaServer(prompt: string): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new ServerAiError("sign_in");
  const token = await user.getIdToken();
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !data.text) {
    const code = data.error ?? "provider_failed";
    if (code === "not_configured") unavailable = true;
    throw new ServerAiError(code);
  }
  return data.text;
}
