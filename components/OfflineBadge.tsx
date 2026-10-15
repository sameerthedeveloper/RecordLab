"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Small pill shown while the device has no connection: editing and PDF export keep working, cloud and AI don't. */
export function OfflineBadge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(8px,env(safe-area-inset-top))]"
    >
      <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink">
        <WifiOff className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
        Offline. Editing and exports still work.
      </span>
    </div>
  );
}
