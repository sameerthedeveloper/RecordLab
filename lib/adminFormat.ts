export const DAY = 24 * 60 * 60 * 1000;

export const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d: Date | null) =>
  d ? d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export const ago = (d: Date | null) => {
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return fmtDate(d);
};

/** Change from a previous period: "+12%", "-4%", or "new" when there was nothing before. */
export function delta(current: number, previous: number): { label: string; tone: "up" | "down" | "flat" } {
  if (previous === 0) return current === 0 ? { label: "no change", tone: "flat" } : { label: "new", tone: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: "no change", tone: "flat" };
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, tone: pct > 0 ? "up" : "down" };
}

export const emailDomainOf = (email: string | null | undefined) => email?.split("@")[1]?.toLowerCase() ?? null;

/** "cse.psgtech.ac.in" then "psgtech.ac.in": the domain and its parents, most specific first. */
export function domainCandidates(domain: string): string[] {
  const labels = domain.split(".");
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) out.push(labels.slice(i).join("."));
  return out;
}
