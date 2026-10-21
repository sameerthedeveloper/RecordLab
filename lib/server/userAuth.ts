/** Proves a request comes from a signed-in Record Lab user: identitytoolkit verifies the caller's Firebase ID token. */
export interface Caller {
  uid: string;
  email: string | null;
}

export async function verifyUser(request: Request): Promise<Caller | null> {
  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!idToken || !apiKey) return null;
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) return null;
  const user = ((await lookup.json()) as { users?: { localId: string; email?: string }[] }).users?.[0];
  return user ? { uid: user.localId, email: user.email ?? null } : null;
}
