import type { AdminData } from "./adminService";
import { DAY, domainCandidates, emailDomainOf } from "./adminFormat";
import { dayKey } from "./usageStats";

/** Everything the dashboard pages show, worked out once from the loaded data and the chosen range. */
export function buildAdminView(data: AdminData, range: number) {
  const now = Date.now();
  const { usage, records, colleges } = data;
  const profiles = usage.profiles;
  const within = (d: Date | null, from: number, to: number) => d !== null && now - d.getTime() <= from * DAY && now - d.getTime() > to * DAY;
  const inRange = (d: Date | null) => within(d, range, 0);
  const inPrev = (d: Date | null) => within(d, range * 2, range);

  // Fill every day of both periods so quiet days show as empty bars.
  const byDay = new Map(usage.days.map((d) => [d.day, d]));
  const keys = Array.from({ length: range * 2 }, (_, i) => dayKey(new Date(now - (range * 2 - 1 - i) * DAY)));
  const actionsAll = keys.map((day) => ({ day, value: byDay.get(day)?.total ?? 0 }));
  const actions = actionsAll.slice(range);
  const actionsNow = actions.reduce((n, s) => n + s.value, 0);
  const actionsPrev = actionsAll.slice(0, range).reduce((n, s) => n + s.value, 0);

  const signupDays = new Map<string, number>();
  for (const p of profiles) if (p.createdAt) signupDays.set(dayKey(p.createdAt), (signupDays.get(dayKey(p.createdAt)) ?? 0) + 1);
  const signups = keys.slice(range).map((day) => ({ day, value: signupDays.get(day) ?? 0 }));

  const features: Record<string, number> = {};
  const currentKeys = new Set(keys.slice(range));
  for (const d of usage.days) if (currentKeys.has(d.day)) for (const [k, n] of Object.entries(d.events)) features[k] = (features[k] ?? 0) + n;
  const featureRows = Object.entries(features).sort((a, b) => b[1] - a[1]);
  const featureTotal = featureRows.reduce((n, [, v]) => n + v, 0);

  const collegeByDomain = new Map((colleges ?? []).map((c) => [c.domain, c.name]));
  const collegeOf = (email: string | null) => {
    const d = emailDomainOf(email);
    if (!d) return null;
    for (const c of domainCandidates(d)) if (collegeByDomain.has(c)) return collegeByDomain.get(c)!;
    return null;
  };

  const recordsByUser = new Map<string, number>();
  for (const r of records ?? []) recordsByUser.set(r.userId, (recordsByUser.get(r.userId) ?? 0) + 1);
  const nameOf = new Map(profiles.map((p) => [p.uid, p.displayName || p.email || p.uid.slice(0, 8)]));
  const ownerName = (uid: string) => nameOf.get(uid) ?? uid.slice(0, 8);

  const topUsers = [...recordsByUser.entries()]
    .map(([uid, n]) => ({ uid, n, name: ownerName(uid), college: collegeOf(profiles.find((p) => p.uid === uid)?.email ?? null) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  // Students per college domain (a domain with no saved name shows as "Not named yet").
  const perDomain = new Map<string, number>();
  for (const p of profiles) {
    const d = emailDomainOf(p.email);
    if (d) perDomain.set(d, (perDomain.get(d) ?? 0) + 1);
  }
  const domainRows = [...perDomain.entries()].map(([domain, n]) => ({ domain, n, name: collegeOf(`x@${domain}`) })).sort((a, b) => b.n - a.n);

  return {
    users: profiles.length,
    newNow: profiles.filter((p) => inRange(p.createdAt)).length,
    newPrev: profiles.filter((p) => inPrev(p.createdAt)).length,
    active7: profiles.filter((p) => within(p.lastSeenAt, 7, 0)).length,
    activePrevWeek: profiles.filter((p) => within(p.lastSeenAt, 14, 7)).length,
    records: records?.length ?? null,
    recordsNow: records?.filter((r) => inRange(r.createdAt)).length ?? 0,
    recordsPrev: records?.filter((r) => inPrev(r.createdAt)).length ?? 0,
    actions,
    actionsNow,
    actionsPrev,
    signups,
    featureRows,
    featureTotal,
    topUsers,
    domainRows,
    collegesNamed: colleges?.length ?? 0,
    adminCount: data.admins?.length ?? null,
    recent: (records ?? []).slice(0, 6),
    collegeOf,
    ownerName,
    recordsByUser,
    lifetime: usage.lifetime?.total ?? null,
  };
}

export type AdminView = ReturnType<typeof buildAdminView>;
