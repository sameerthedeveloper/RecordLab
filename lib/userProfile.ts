import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { DEFAULT_WATERMARK, type WatermarkOptions } from "./types";

const COLLECTION = "users";

export interface PuterLink {
  puterUserId: string;
  puterUsername: string;
}

/** Remembers which Puter account this Firebase user last linked, so a returning
 * Google sign-in can offer a pre-filled one-click reconnect instead of a cold
 * "Link Puter account" flow (see components/PuterLinkButton.tsx). */
export async function savePuterLink(uid: string, link: PuterLink): Promise<void> {
  await setDoc(doc(getDb(), COLLECTION, uid), link, { merge: true });
}

export async function getPuterLink(uid: string): Promise<PuterLink | null> {
  const snap = await getDoc(doc(getDb(), COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (typeof data.puterUserId !== "string" || typeof data.puterUsername !== "string") return null;
  return { puterUserId: data.puterUserId, puterUsername: data.puterUsername };
}

/** Persists the user's default watermark settings (see lib/settings.ts) to their
 * Firebase profile doc, so the default follows them across browsers/devices instead
 * of living only in this browser's localStorage. */
export async function saveWatermarkSettings(uid: string, watermark: WatermarkOptions): Promise<void> {
  await setDoc(doc(getDb(), COLLECTION, uid), { watermark }, { merge: true });
}

export async function getWatermarkSettings(uid: string): Promise<WatermarkOptions | null> {
  const snap = await getDoc(doc(getDb(), COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.watermark || typeof data.watermark !== "object") return null;
  return { ...DEFAULT_WATERMARK, ...data.watermark };
}
