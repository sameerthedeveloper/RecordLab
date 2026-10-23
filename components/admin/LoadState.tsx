"use client";

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
    const block = "rounded-2xl border border-line bg-white motion-safe:animate-pulse";
    return (
      <div role="status" aria-label="Loading the dashboard" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${block} h-[8.5rem]`} />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className={`${block} h-72`} />
          <div className={`${block} h-72`} />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  return <>{children(ready)}</>;
}

export function useAdminReady() {
  const a = useAdmin();
  return a.data && a.view ? { ...a, data: a.data, view: a.view } : null;
}
