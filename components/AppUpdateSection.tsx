"use client";

import { useSyncExternalStore } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { applyUpdate, BUILD_ID, checkForUpdates, getServerUpdateStatus, getUpdateStatus, subscribeUpdates } from "@/lib/pwaUpdate";

interface AppUpdateSectionProps {
  auto: boolean;
  onAutoChange: (next: boolean) => void;
}

/** Settings, App: keep the installed app current. The switch is saved with Save settings; the buttons act at once. */
export function AppUpdateSection({ auto, onAutoChange }: AppUpdateSectionProps) {
  const status = useSyncExternalStore(subscribeUpdates, getUpdateStatus, getServerUpdateStatus);
  const ready = status === "ready";
  const versionLabel = /^\d{10,}$/.test(BUILD_ID) ? new Date(Number(BUILD_ID)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : BUILD_ID;

  return (
    <section>
      <h3 className="mb-3 font-serif text-sm font-bold text-ink">Updates</h3>

      <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5">
        <div className="min-w-0 flex-1">
          <p id="autoUpdateLabel" className="text-sm font-semibold text-ink">Update automatically</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft/80">
            New versions install in the background and switch on when you leave the app, never while you are writing.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto}
          aria-labelledby="autoUpdateLabel"
          onClick={() => onAutoChange(!auto)}
          className={`relative mt-0.5 h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            auto ? "bg-accent" : "bg-ink/20"
          }`}
        >
          <span
            className={`absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)] ${
              auto ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-xl border border-line bg-white p-3.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            ready ? "bg-accent-soft text-accent" : "bg-ink/[0.06] text-ink-soft"
          }`}
        >
          {status === "checking" ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.25} />
          ) : status === "uptodate" ? (
            <Check className="h-[18px] w-[18px] text-emerald-600" strokeWidth={2.5} />
          ) : (
            <RefreshCw className="h-[18px] w-[18px]" strokeWidth={2.25} />
          )}
        </span>
        <div className="min-w-[10rem] flex-1">
          <p className="text-sm font-semibold text-ink">
            {ready ? "A new version is ready" : status === "checking" ? "Checking…" : status === "uptodate" ? "You have the latest version" : "Version " + versionLabel}
          </p>
          <p className="text-xs text-ink-soft/80">
            {status === "unsupported"
              ? "Updates apply in the installed app and the live site, not in development."
              : ready
                ? auto
                  ? "It will switch on when you leave the app."
                  : "Restart to switch to it."
                : "Looks for a new version every hour and when you come back to the app."}
          </p>
        </div>
        {ready ? (
          <button type="button" onClick={applyUpdate} className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white active:scale-95">
            Restart
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void checkForUpdates()}
            disabled={status === "checking" || status === "unsupported"}
            className="shrink-0 rounded-full bg-ink/[0.06] px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-ink/10 active:scale-95 disabled:opacity-50"
          >
            Check now
          </button>
        )}
      </div>
    </section>
  );
}
