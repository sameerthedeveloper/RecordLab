"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";

export interface PanelNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Small number or text on the right (a count). */
  badge?: string | number | null;
  /** Match only this exact path, not its children. */
  exact?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  /** Where the title links to. */
  home: string;
  nav: PanelNavItem[];
  /** Extra sidebar content under the nav (e.g. the faculty's class list). */
  sidebarExtra?: React.ReactNode;
  /** Right side of the top bar (admin: date range and refresh). */
  topbar?: React.ReactNode;
  account: { name: string; email?: string | null };
  onSignOut: () => void;
  children: React.ReactNode;
}

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** The sidebar frame shared by the admin and faculty areas: brand, navigation, account; a drawer on phones. */
export function PanelFrame({ title, subtitle, home, nav, sidebarExtra, topbar, account, onSignOut, children }: Props) {
  const pathname = usePathname().replace(/\/+$/, "") || home;
  const [open, setOpen] = useState(false);

  // Close the drawer after navigating, and on Esc.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2 px-1.5 pt-1">
        <div className="min-w-0">
          <Link href={home} className={`block truncate font-serif text-xl font-bold leading-tight tracking-tight text-ink ${focus}`}>
            {title}
          </Link>
          {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className={`ui-icon-btn flex shrink-0 items-center justify-center lg:hidden ${focus}`}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label={`${title} sections`} className="flex flex-col gap-1">
        {nav.map((t) => {
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${focus} ${active ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"}`}
            >
              <t.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{t.label}</span>
              {t.badge !== null && t.badge !== undefined && <span className="font-mono text-[11px] font-medium opacity-70">{t.badge}</span>}
            </Link>
          );
        })}
      </nav>

      {sidebarExtra && <div className="min-h-0 flex-1 overflow-y-auto">{sidebarExtra}</div>}

      <div className={`${sidebarExtra ? "" : "mt-auto"} flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2`} title={account.email ?? undefined}>
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">
          {(account.name.trim()[0] || "?").toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-ink">{account.name}</span>
          {account.email && <span className="block truncate text-[11px] text-ink-soft">{account.email}</span>}
        </span>
        <button type="button" aria-label="Sign out" title="Sign out" onClick={onSignOut} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-accent ${focus}`}>
          <LogOut className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-canvas fixed inset-0 flex gap-3 p-3 sm:gap-4 sm:p-4">
      {/* Wide screens: a fixed sidebar. */}
      <aside className="ui-panel hidden w-64 shrink-0 overflow-hidden lg:block">{sidebar}</aside>

      {/* Phones: the same sidebar as a drawer. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="ui-panel absolute inset-y-3 left-3 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden !bg-white" role="dialog" aria-modal="true" aria-label={`${title} menu`}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3 pt-0.5 sm:px-2">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className={`ui-icon-btn flex items-center justify-center lg:hidden ${focus}`}>
            <Menu className="h-4 w-4" />
          </button>
          <p className="truncate font-serif text-lg font-bold text-ink lg:hidden">{title}</p>
          <div className="ml-auto flex items-center gap-2">{topbar}</div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.75rem]">
          <main className="mx-auto max-w-6xl space-y-4 px-1 pb-10 sm:px-2">{children}</main>
        </div>
      </div>
    </div>
  );
}
