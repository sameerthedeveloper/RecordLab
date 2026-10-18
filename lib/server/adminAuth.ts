/**
 * Proves a request comes from a Record Lab admin, without the Firebase Admin SDK:
 *  1. identitytoolkit verifies the caller's ID token and returns their uid and email.
 *  2. Firestore REST reads admins/<uid> *as that user*, so the security rules decide: a user can read
 *     only their own admins document, so 200 means "is an admin" and 404 means "is not".
 */
export interface AdminCaller {
  uid: string;
  email: string | null;
}

export async function verifyAdmin(request: Request): Promise<AdminCaller | null> {
  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!idToken || !apiKey || !project) return null;

  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) return null;
  const user = ((await lookup.json()) as { users?: { localId: string; email?: string }[] }).users?.[0];
  if (!user) return null;

  const doc = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/admins/${encodeURIComponent(user.localId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return doc.ok ? { uid: user.localId, email: user.email ?? null } : null;
}
