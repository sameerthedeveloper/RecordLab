"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { Check, Loader2, Ticket } from "lucide-react";
import { useAuthUser } from "@/lib/authService";
import { CHECKOUT_MESSAGES, startCheckout, useBillingConfig, useSubscription } from "@/lib/billing";
import { formatInr, PLANS, priceOf, type PlanId } from "@/lib/billingShared";
import { getDb } from "@/lib/firebaseConfig";
import { PROMO_ERRORS, redeemPromoCode } from "@/lib/promo";

export const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The free allowance drawn as ruled lines on a record sheet: one line per record, inked in as they are used. */
function Tally({ used, limit }: { used: number; limit: number }) {
  return (
    <div role="img" aria-label={`${used} of ${limit} free records used`}>
      <div className="flex gap-[3px]">
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={`h-7 flex-1 rounded-[3px] border-b-2 ${i < used ? "border-accent bg-accent/15" : "border-line bg-transparent"}`} />
        ))}
      </div>
      <p className="mt-2 font-mono text-xs text-ink-soft">
        {used} of {limit} free records used
      </p>
    </div>
  );
}

/**
 * Everything about the subscription in one block: the current plan or how full the free plan is, the two plans
 * with Razorpay Checkout, and the promo code field. Lives in Settings > Billing, and in the sheet that opens
 * when a free account runs out of room. `onDone` runs after a payment or code goes through.
 */
export function SubscriptionPanel({ onToast, onDone }: { onToast: (message: string) => void; onDone?: () => void }) {
  const user = useAuthUser();
  const cfg = useBillingConfig();
  const sub = useSubscription();
  const [plan, setPlan] = useState<PlanId>("year");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    if (!user) return;
    let live = true;
    getCountFromServer(query(collection(getDb(), "documents"), where("userId", "==", user.uid)))
      .then((s) => live && setUsed(s.data().count))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeeming(true);
    setCodeError("");
    try {
      const until = await redeemPromoCode(code);
      onToast(`Code accepted. Pro is on until ${fmtDay(until)}.`);
      setCode("");
      onDone?.();
    } catch (err) {
      setCodeError(PROMO_ERRORS[err instanceof Error ? err.message : ""] ?? "Couldn't use that code. Try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const until = await startCheckout(plan);
      onToast(`Pro is on until ${fmtDay(until)}.`);
      onDone?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "dismissed") setError(CHECKOUT_MESSAGES[msg] ?? "The payment didn't go through. You haven't been charged, or Razorpay will refund it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Someone on Pro doesn't need to see a pay button; it comes back in the last two weeks so they can renew.
  const endingSoon = !!sub && sub.expiresAt.getTime() - Date.now() < 14 * 86_400_000;
  const plansOpen = !!cfg?.enabled && (!sub || endingSoon);
  const month12 = cfg ? cfg.monthPaise * 12 : 0;

  if (!user) return <p className="py-6 text-center text-sm text-ink-soft">Sign in to see your plan.</p>;
  if (!cfg)
    return (
      <div className="flex justify-center py-10" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="sr-only">Loading plans</span>
      </div>
    );

  return (
      <div className="space-y-5">
        {sub ? (
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
            <span className="verified-stamp text-xl" role="img" aria-label="Pro">
              PRO
              <small>{sub.plan === "year" ? "YEARLY" : "MONTHLY"}</small>
            </span>
            <p className="text-sm text-ink">
              Active until <strong className="font-semibold">{fmtDay(sub.expiresAt)}</strong>
            </p>
          </div>
        ) : (
          used !== null && <Tally used={Math.min(used, cfg.freeLimit)} limit={cfg.freeLimit} />
        )}

        {!plansOpen && !sub && <p className="text-center text-sm text-ink-soft">Everything is free right now. Nothing to buy.</p>}

        {plansOpen && (
          <>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-ink-soft">{sub ? "Renew early" : "Choose a plan"}</legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  const saving = p.id === "year" ? month12 - cfg.yearPaise : 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPlan(p.id)}
                      className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        active ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-line bg-white hover:border-accent/40"
                      }`}
                    >
                      <span className="flex items-center justify-between text-[13px] font-semibold text-ink">
                        {p.name}
                        {active && <Check className="h-4 w-4 text-accent" strokeWidth={2.75} />}
                      </span>
                      <span className="mt-1 block font-serif text-3xl font-bold leading-none tracking-tight text-ink">{formatInr(priceOf(cfg, p.id))}</span>
                      <span className="mt-2 block text-xs leading-snug text-ink-soft">
                        {saving > 0 ? `Saves ${formatInr(saving)} against 12 months` : p.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}

            <div>
              <button type="button" onClick={() => void pay()} disabled={busy} className="ui-primary flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Pay {formatInr(priceOf(cfg, plan))} with Razorpay
              </button>
              <p className="mt-2 text-center text-xs text-ink-soft">UPI, cards and netbanking. One payment, no auto-renewal.</p>
            </div>
          </>
        )}

        <form onSubmit={(e) => void redeem(e)} className="border-t border-line pt-4">
          <label htmlFor="promo-code" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Ticket className="h-3.5 w-3.5" strokeWidth={2} /> Have a promo code?
          </label>
          <div className="flex gap-2">
            <input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="RL-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-line bg-white p-2.5 font-mono text-sm tracking-wider text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button type="submit" disabled={redeeming || code.trim().length < 8} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-1.5 px-4 text-[13px] font-semibold disabled:opacity-50">
              {redeeming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply
            </button>
          </div>
          {codeError && (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {codeError}
            </p>
          )}
        </form>
      </div>
  );
}
