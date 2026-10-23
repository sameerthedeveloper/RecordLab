import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { delta } from "@/lib/adminFormat";

export function Card({ title, aside, children, className = "" }: { title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`ui-card overflow-hidden ${className}`}>
      {(title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6">
          {title && <h2 className="font-serif text-base font-bold text-ink">{title}</h2>}
          {aside && <div className="text-xs text-ink-soft">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** One headline number with what changed. `previous` makes the trend chip; `note` is the plain-language line under it. */
export function Kpi({ label, value, note, current, previous, icon: Icon, href }: { href?: string; label: string; value: string | number; note?: string; current?: number; previous?: number; icon: LucideIcon }) {
  const d = current !== undefined && previous !== undefined ? delta(current, previous) : null;
  const TrendIcon = d?.tone === "up" ? ArrowUpRight : d?.tone === "down" ? ArrowDownRight : ArrowRight;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink-soft">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 font-serif text-[2.1rem] font-bold leading-none tracking-tight text-ink">{value}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {d && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${d.tone === "up" ? "bg-emerald-50 text-emerald-700" : d.tone === "down" ? "bg-red-50 text-red-700" : "bg-black/5 text-ink-soft"}`}>
            <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
            {d.label}
          </span>
        )}
        {note && <span className="text-ink-soft/80">{note}</span>}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="ui-card block p-5 transition-shadow hover:shadow-md">
      {body}
    </Link>
  ) : (
    <div className="ui-card p-5">{body}</div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-ink-soft sm:px-6">{children}</p>;
}

/** A person's initial in a tinted circle: the same face everywhere a user is listed. */
export function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  );
}

/** Bars with a value axis, one per day. Hover or focus a bar for its exact count. */
export function BarChart({ series, label, tone = "accent" }: { series: { day: string; value: number }[]; label: string; tone?: "accent" | "ink" }) {
  const peak = Math.max(1, ...series.map((s) => s.value));
  // Round the axis to a tidy step (1, 2, 5, 10, 20, 50...) so the three gridlines read 3n, 2n, n.
  const raw = peak / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? 10 * mag);
  const top = step * 3;
  const ticks = [top, step * 2, step, 0];
  const total = series.reduce((n, s) => n + s.value, 0);
  const bar = tone === "accent" ? "bg-accent/75 group-hover:bg-accent group-focus:bg-accent" : "bg-ink/40 group-hover:bg-ink/70 group-focus:bg-ink/70";
  return (
    <div className="px-5 pb-5 pt-4 sm:px-6" role="figure" aria-label={`${label}: ${total} in ${series.length} days, peak ${peak} in a day`}>
      <div className="flex gap-3">
        <div className="flex h-44 flex-col justify-between pb-px text-right font-mono text-[10px] leading-none text-ink-soft/60" aria-hidden>
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((_, i) => (
              <span key={i} className="border-t border-dashed border-line" />
            ))}
          </div>
          <div className="relative flex h-full items-end gap-[3px]">
            {series.map((s) => (
              <button
                key={s.day}
                type="button"
                className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm"
                aria-label={`${s.day}: ${s.value}`}
              >
                <span className={`w-full rounded-t-[4px] transition-colors ${s.value ? bar : "bg-ink/[0.07]"}`} style={{ height: `${Math.max(2, (s.value / top) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-mono text-[10px] text-paper shadow group-hover:block group-focus:block">
                  {s.day.slice(5)} · {s.value}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-8 font-mono text-[10px] text-ink-soft/60">
        <span>{series[0]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}
