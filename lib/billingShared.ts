/**
 * Paid plans. The admin's switch and prices live at config/billing (readable by every signed-in user,
 * writable by admins). Shared by the browser (to show prices and the limit) and the server (which prices
 * every order itself, so a browser can never choose its own amount).
 */
export type PlanId = "month" | "year";

export interface BillingConfig {
  /** Master switch. Off: everything is free and nothing is limited. */
  enabled: boolean;
  /** Records a free account can keep in the cloud. */
  freeLimit: number;
  /** Prices in paise (₹1 = 100 paise), the unit Razorpay uses. */
  monthPaise: number;
  yearPaise: number;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = { enabled: false, freeLimit: 15, monthPaise: 4900, yearPaise: 39900 };

export const PLANS: { id: PlanId; name: string; days: number; blurb: string }[] = [
  { id: "month", name: "Monthly", days: 30, blurb: "Pay for one month at a time." },
  { id: "year", name: "Yearly", days: 365, blurb: "A full academic year, paid once." },
];

export const priceOf = (cfg: BillingConfig, plan: PlanId) => (plan === "year" ? cfg.yearPaise : cfg.monthPaise);

export const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const num = (v: unknown, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

/** Anything stored (or sent) becomes a safe config: unknown values fall back to the defaults. */
export function sanitizeBillingConfig(raw: Record<string, unknown> | null | undefined): BillingConfig {
  const d = DEFAULT_BILLING_CONFIG;
  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : d.enabled,
    freeLimit: num(raw?.freeLimit, 1, 1000, d.freeLimit),
    monthPaise: num(raw?.monthPaise, 100, 1_000_000, d.monthPaise),
    yearPaise: num(raw?.yearPaise, 100, 1_000_000, d.yearPaise),
  };
}

/** What a signed-in person is on right now. */
export interface Subscription {
  plan: PlanId;
  expiresAt: Date;
}
