"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { loadAdminData, useAdminAccess, type AdminData } from "@/lib/adminService";
import { buildAdminView, type AdminView } from "@/lib/adminView";
import { useAuthUser } from "@/lib/authService";
import { AuthModal } from "../AuthModal";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export interface AdminContextValue {
  /** The signed-in admin. */
  me: { uid: string; email: string | null; name: string };
  range: Range;
  setRange: (r: Range) => void;
  data: AdminData | null;
  view: AdminView | null;
  loadedAt: Date | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export const AdminContext = createContext<AdminContextValue | null>(null);
const Ctx = AdminContext;

export function useAdmin(): AdminContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside the admin layout.");
  return v;
}

/**
 * The one door to everything under /admin. Anyone who is not a signed-in admin sees a plain 404 and none of
 * the admin screens are rendered. (This is the interface gate; the data itself is protected separately by
 * the Firestore rules and by the server check in /api/admin/*.)
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const access = useAdminAccess();
  const user = useAuthUser();
  const [range, setRangeState] = useState<Range>(30);
  // Remember the range between visits.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("recordlab.admin-range"));
      if (RANGES.includes(saved as Range)) setRangeState(saved as Range);
    } catch {}
  }, []);
  const setRange = useCallback((r: Range) => {
    setRangeState(r);
    try {
      localStorage.setItem("recordlab.admin-range", String(r));
    } catch {}
  }, []);
  const [data, setData] = useState<AdminData | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadAdminData(range));
      setLoadedAt(new Date());
    } catch (e) {
      console.error("Admin load failed:", e);
      setError("Couldn't load the dashboard. Check that the latest firestore.rules are deployed and your admin document exists.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (access.status === "admin") void refresh();
  }, [access.status, refresh]);

  const view = useMemo(() => (data ? buildAdminView(data, range) : null), [data, range]);

  if (access.status === "loading") {
    return (
      <div className="app-canvas fixed inset-0 flex items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">Checking access</span>
      </div>
    );
  }

  if (access.status === "signed-out") {
    return (
      <div className="app-canvas fixed inset-0 flex items-center justify-center px-4">
        <div className="ui-card flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-8 w-8 text-accent" strokeWidth={1.75} />
          <p className="font-serif text-lg font-bold text-ink">Admin sign-in</p>
          <p className="text-sm text-ink-soft">Sign in with your admin account to continue.</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="ui-primary px-6 py-2.5 text-[13px] font-semibold">
            Sign in
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={() => {}} />
        </div>
      </div>
    );
  }

  // Signed in but not an admin: a plain 404, with nothing that says an admin area exists here.
  if (access.status === "denied") {
    return (
      <div className="app-canvas fixed inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-serif text-5xl font-bold text-ink">404</p>
        <p className="text-sm text-ink-soft">This page could not be found.</p>
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          Go to Record Lab
        </Link>
      </div>
    );
  }

  const me = { uid: access.uid, email: user?.email ?? null, name: user?.displayName || user?.email || "Admin" };
  return <Ctx.Provider value={{ me, range, setRange, data, view, loadedAt, loading, error, refresh }}>{children}</Ctx.Provider>;
}
