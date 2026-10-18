"use client";

import { useEffect, useState } from "react";
import { AppLoader } from "./AppLoader";

/** How long the opening loader stays up. */
export const SPLASH_SECONDS = 5;

let splashDone = false;
const SPLASH_DONE_EVENT = "recordlab:splash-done";

/** Runs `fn` once the opening loader is gone (right away if it already is). Returns a cleanup. */
export function afterSplash(fn: () => void): () => void {
  if (splashDone) {
    fn();
    return () => {};
  }
  const on = () => fn();
  window.addEventListener(SPLASH_DONE_EVENT, on, { once: true });
  return () => window.removeEventListener(SPLASH_DONE_EVENT, on);
}

/**
 * Shows the loader over the page for a few seconds each time the app is opened or reloaded
 * (moving between screens inside the app does not remount it). Click, tap or Escape skips it.
 */
export function BootSplash({ label = "Setting up your sheet" }: { label?: string }) {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">(() => {
    splashDone = false; // a new splash, so anything waiting on it (the tour) waits again
    return "show";
  });

  useEffect(() => {
    if (phase !== "gone") return;
    splashDone = true;
    window.dispatchEvent(new Event(SPLASH_DONE_EVENT));
  }, [phase]);

  useEffect(() => {
    const fade = window.setTimeout(() => setPhase("fade"), SPLASH_SECONDS * 1000);
    const gone = window.setTimeout(() => setPhase("gone"), SPLASH_SECONDS * 1000 + 450);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
  }, []);

  useEffect(() => {
    if (phase === "gone") return;
    const skip = (e: KeyboardEvent) => e.key === "Escape" && setPhase("fade");
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [phase]);

  useEffect(() => {
    if (phase === "fade") {
      const t = window.setTimeout(() => setPhase("gone"), 450);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-[450ms] ${phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"}`}
      onClick={() => setPhase("fade")}
    >
      <AppLoader label={label} seconds={SPLASH_SECONDS} />
      <button type="button" onClick={() => setPhase("fade")} className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium text-ink-soft/70 transition-colors hover:text-accent">
        Skip
      </button>
    </div>
  );
}
