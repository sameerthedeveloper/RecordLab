import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebaseConfig";

const LIST_URL = "https://cdn.jsdelivr.net/gh/Hipo/university-domains-list@master/world_universities_and_domains.json";
const CACHE_KEY = "recordlab.college";

/** Personal mail providers: the domain says nothing about a college. */
const PERSONAL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "yahoo.co.in", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "proton.me", "protonmail.com", "rediffmail.com", "aol.com", "zoho.com", "gmx.com", "mail.com",
]);

export interface College {
  name: string;
  domain: string;
  /** "list": the public university list. "community": entered by a student and shared with everyone on that domain. */
  source: "list" | "community";
  country?: string;
}

export const emailDomain = (email: string | null | undefined): string | null => {
  const d = email?.split("@")[1]?.trim().toLowerCase();
  return d || null;
};

export const isPersonalDomain = (domain: string) => PERSONAL.has(domain);

function readCache(domain: string): College | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, College>;
    return all[domain] ?? null;
  } catch {
    return null;
  }
}

function writeCache(college: College) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, College>;
    all[college.domain] = college;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {}
}

/** The domain and its parent domains, most specific first: "cse.psgtech.ac.in" -> "cse.psgtech.ac.in", "psgtech.ac.in". */
const candidates = (domain: string) => {
  const labels = domain.split(".");
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) out.push(labels.slice(i).join("."));
  return out;
};

/**
 * Finds the college for an email: this browser's cache, then the colleges students have already
 * entered (Firestore, shared by everyone), then the open university-domains list. Null when nobody
 * has named it yet, or for personal mail providers.
 */
export async function findCollege(email: string | null | undefined): Promise<College | null> {
  const domain = emailDomain(email);
  if (!domain || isPersonalDomain(domain)) return null;
  const cached = readCache(domain);
  if (cached) return cached;

  const done = (c: College) => {
    writeCache(c);
    return c;
  };

  try {
    for (const d of candidates(domain)) {
      const snap = await getDoc(doc(getDb(), "colleges", d));
      const name = snap.exists() ? snap.data().name : null;
      if (typeof name === "string" && name) return done({ name, domain, source: "community" });
    }
  } catch {
    // Offline or rules not deployed yet: fall through to the public list.
  }

  try {
    const res = await fetch(LIST_URL);
    if (res.ok) {
      const list = (await res.json()) as { name: string; country?: string; domains: string[] }[];
      for (const d of candidates(domain)) {
        const hit = list.find((u) => u.domains.some((x) => x.toLowerCase() === d));
        if (hit) return done({ name: hit.name, domain, source: "list", country: hit.country });
      }
    }
  } catch {}
  return null;
}

/** Saves a college name for this email's domain so every other student from it sees the same name. */
export async function saveCollege(email: string, uid: string, rawName: string): Promise<College> {
  const domain = emailDomain(email);
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!domain || isPersonalDomain(domain)) throw new Error("Sign in with your college email to add your college.");
  if (name.length < 3 || name.length > 120) throw new Error("Enter the full college name (3 to 120 characters).");
  try {
    await setDoc(doc(getDb(), "colleges", domain), { name, domain, createdBy: uid, createdAt: serverTimestamp() });
  } catch (err) {
    // Someone from this domain added it first: show their entry instead.
    const snap = await getDoc(doc(getDb(), "colleges", domain)).catch(() => null);
    const existing = snap?.exists() ? snap.data().name : null;
    if (typeof existing === "string" && existing) return { name: existing, domain, source: "community" };
    throw err;
  }
  const college: College = { name, domain, source: "community" };
  writeCache(college);
  return college;
}
