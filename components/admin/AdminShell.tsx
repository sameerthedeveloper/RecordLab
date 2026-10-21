"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, GraduationCap, LayoutDashboard, Loader2, Mail, RefreshCw, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";
import { signOutUser } from "@/lib/authService";
import { ago } from "@/lib/adminFormat";
import { PanelFrame, type PanelNavItem } from "../PanelFrame";
import { RANGES, useAdmin } from "./AdminProvider";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, count: null, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, count: "users" },
  { href: "/admin/records", label: "Records", icon: FileText, count: "records" },
  { href: "/admin/colleges", label: "Colleges", icon: GraduationCap, count: "collegesNamed" },
  { href: "/admin/faculty", label: "Faculty", icon: UserCheck, count: null },
  { href: "/admin/ai", label: "AI", icon: Sparkles, count: null },
  { href: "/admin/mail", label: "Send mail", icon: Mail, count: null },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck, count: "adminCount" },
] as const;

/** The admin area's frame: a sidebar of sections, and a top bar with the date range and refresh. Nothing from the student app. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { me, range, setRange, view, loadedAt, loading, refresh } = useAdmin();
  const router = useRouter();

  const nav: PanelNavItem[] = TABS.map((t) => ({
    href: t.href,
    label: t.label,
    icon: t.icon,
    exact: "exact" in t ? t.exact : false,
    badge: t.count && view ? view[t.count] : null,
  }));

  const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return (
    <PanelFrame
      title="Record Lab admin"
      subtitle={loadedAt ? `Updated ${ago(loadedAt)}` : "Loading…"}
      home="/admin"
      nav={nav}
      account={{ name: me.name, email: me.email }}
      onSignOut={async () => {
        await signOutUser();
        router.replace("/");
      }}
      topbar={
        <>
          <div className="flex rounded-full bg-black/[0.05] p-1" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${focus} ${range === r ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"}`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className={`ui-icon-btn flex items-center justify-center ${focus}`} aria-label="Refresh" title="Refresh">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
          </button>
          <Link href="/editor" aria-label="Back to the editor" title="Back to the editor" className={`ui-icon-btn flex items-center justify-center ${focus}`}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </>
      }
    >
      {children}
    </PanelFrame>
  );
}
