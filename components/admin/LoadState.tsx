"use client";

import { Loader2 } from "lucide-react";
import { useAdmin } from "./AdminProvider";

/** Shows the load error or spinner until the dashboard data is ready; renders children (with the data) once it is. */
export function WhenLoaded({ children }: { children: (ctx: NonNullable<ReturnType<typeof useAdminReady>>) => React.ReactNode }) {
  const ready = useAdminReady();
  const { error } = useAdmin();
  if (error) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  }
  if (!ready) {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }
  return <>{children(ready)}</>;
}

export function useAdminReady() {
  const a = useAdmin();
  return a.data && a.view ? { ...a, data: a.data, view: a.view } : null;
}
