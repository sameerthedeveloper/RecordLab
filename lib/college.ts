const LIST_URL = "https://cdn.jsdelivr.net/gh/Hipo/university-domains-list@master/world_universities_and_domains.json";
const CACHE_KEY = "recordlab.college";

/** Personal mail providers: the domain says nothing about a college. */
const PERSONAL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "yahoo.co.in", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "proton.me", "protonmail.com", "rediffmail.com", "aol.com", "zoho.com", "gmx.com", "mail.com",
]);

export interface College {
  /** Full name when found in the university list; otherwise a readable guess from the domain. */
  name: string;
  domain: string;
  /** True when the name came from the list, false when guessed from the domain. */
  verified: boolean;
  country?: string;
}

export const emailDomain = (email: string | null | undefined): string | null => {
  const d = email?.split("@")[1]?.trim().toLowerCase();
  return d || null;
};

export const isPersonalDomain = (domain: string) => PERSONAL.has(domain);

/** "psgtech.ac.in" -> "Psgtech" : a fallback when the college is not in the list. */
function guessName(domain: string): string {
  const parts = domain.split(".").filter((p) => !["ac", "edu", "in", "com", "org", "net", "co", "uk", "au", "gov"].includes(p));
  const word = parts[parts.length - 1] || domain;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

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

/**
 * Looks the email domain up in the open university-domains list (also tries the parent domain, so
 * "cse.psgtech.ac.in" finds "psgtech.ac.in"). Returns null for personal mail providers.
 */
export async function findCollege(email: string | null | undefined): Promise<College | null> {
  const domain = emailDomain(email);
  if (!domain || isPersonalDomain(domain)) return null;
  const cached = readCache(domain);
  if (cached) return cached;

  let found: College | null = null;
  try {
    const res = await fetch(LIST_URL);
    if (res.ok) {
      const list = (await res.json()) as { name: string; country?: string; domains: string[] }[];
      const labels = domain.split(".");
      // Exact domain first, then each parent domain with at least two labels.
      for (let i = 0; i < labels.length - 1 && !found; i++) {
        const candidate = labels.slice(i).join(".");
        const hit = list.find((u) => u.domains.some((d) => d.toLowerCase() === candidate));
        if (hit) found = { name: hit.name, domain, verified: true, country: hit.country };
      }
    }
  } catch {
    return { name: guessName(domain), domain, verified: false };
  }
  const college = found ?? { name: guessName(domain), domain, verified: false };
  writeCache(college);
  return college;
}
