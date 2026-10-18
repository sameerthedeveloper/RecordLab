"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, FileText, GraduationCap, LayoutDashboard, Loader2, LogOut, Mail, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { signOutUser } from "@/lib/authService";
import { ago } from "@/lib/adminFormat";
import { RANGES, useAdmin } from "./AdminProvider";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, count: null },
  { href: "/admin/users", label: "Users", icon: Users, count: "users" },
  { href: "/admin/records", label: "Records", icon: FileText, count: "records" },
  { href: "/admin/colleges", label: "Colleges", icon: GraduationCap, count: "collegesNamed" },
  { href: "/admin/mail", label: "Send mail", icon: Mail, count: null },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck, count: "adminCount" },
] as const;

/** The admin area's own frame: header, section navigation and the signed-in admin. Nothing from the student app. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { me, range, setRange, view, loadedAt, loading, refresh } = useAdmin();
  const pathname = usePathname().replace(/\/+$/, "") || "/admin";
  const router = useRouter();

  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        <header className="ui-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/editor" aria-label="Back to the editor" title="Back to the editor" className="ui-icon-btn flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Record Lab admin</h1>
              <p className="text-xs text-ink-soft">{loadedAt ? `Updated ${ago(loadedAt)}` : "Loading…"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-black/[0.05] p-1" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${range === r ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"}`}
                >
                  {r} days
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void refresh()} disabled={loading} className="ui-icon-btn flex items-center justify-center" aria-label="Refresh" title="Refresh">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3" title={me.email ?? undefined}>
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">
                {(me.name.trim()[0] || "A").toUpperCase()}
              </span>
              <span className="hidden max-w-[11rem] truncate text-xs font-semibold text-ink sm:block">{me.name}</span>
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={async () => {
                  await signOutUser();
                  router.replace("/");
                }}
                className="text-ink-soft transition-colors hover:text-accent"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto lg:sticky lg:top-0 lg:flex-col lg:self-start lg:overflow-visible">
            {TABS.map((t) => {
              const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
              const count = t.count && view ? view[t.count] : null;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition-colors ${active ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"}`}
                >
                  <t.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="flex-1">{t.label}</span>
                  {count !== null && count !== undefined && <span className="font-mono text-[11px] font-medium opacity-70">{count}</span>}
                </Link>
              );
            })}
          </nav>
          <main className="min-w-0 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
