"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

/** Settings: install Record Lab as an app (works offline once installed). */
export function InstallAppSection() {
  const { state, install } = useInstallPrompt();
  return (
    <section>
      <h3 className="mb-3 font-serif text-sm font-bold text-ink">Install app</h3>
      {state === "installed" && <p className="text-sm text-ink-soft">Record Lab is installed on this device. It opens on the editor and works offline.</p>}
      {state === "promptable" && (
        <>
          <p className="mb-2.5 text-sm text-ink-soft">Add Record Lab to your home screen. Opens on the editor, works offline.</p>
          <button type="button" onClick={install} className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-hover">
            <Download className="h-3.5 w-3.5" strokeWidth={2.25} /> Install Record Lab
          </button>
        </>
      )}
      {state === "ios" && (
        <p className="flex flex-wrap items-center gap-x-1 text-sm text-ink-soft">
          In Safari tap <Share className="inline h-4 w-4 text-accent" strokeWidth={2} /> Share, then{" "}
          <SquarePlus className="inline h-4 w-4 text-accent" strokeWidth={2} /> Add to Home Screen.
        </p>
      )}
      {state === "unavailable" && (
        <p className="text-sm text-ink-soft">Use your browser menu and choose Install app or Add to Home Screen.</p>
      )}
    </section>
  );
}
