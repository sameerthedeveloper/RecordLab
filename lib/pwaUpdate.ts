"use client";

import { loadSettings } from "./settings";

/**
 * App updates for the installed (PWA) build. Each deploy registers a new service worker (see
 * PwaRegister); this module tells the UI when one is ready and, if the person allows it, switches to it
 * by reloading while the app is in the background, so an edit in progress is never interrupted.
 */
export type UpdateStatus = "unsupported" | "idle" | "checking" | "uptodate" | "ready";

let status: UpdateStatus = "idle";
let registration: ServiceWorkerRegistration | null = null;
let hadController = false;
let started = false;
const listeners = new Set<() => void>();

function set(next: UpdateStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

export const subscribeUpdates = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getUpdateStatus = () => status;
export const getServerUpdateStatus = (): UpdateStatus => "idle";
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Reload now to run the new version. */
export function applyUpdate() {
  window.location.reload();
}

/** Reload when the app is in the background, if the person left automatic updates on. */
function maybeAutoApply() {
  if (status !== "ready" || !loadSettings().autoUpdate) return;
  if (document.hidden) applyUpdate();
}

export async function checkForUpdates(): Promise<void> {
  if (!registration) return;
  if (status === "ready") return;
  set("checking");
  try {
    await registration.update();
  } catch {
    // Offline: nothing to learn.
  }
  // A found update flips the status to "ready" on its own within a moment; otherwise we are current.
  window.setTimeout(() => {
    if (status === "checking") set("uptodate");
  }, 2500);
}

export function startUpdates(reg: ServiceWorkerRegistration) {
  registration = reg;
  if (started) return;
  started = true;
  hadController = !!navigator.serviceWorker.controller;
  set("idle");

  // The worker skips waiting, so a new one takes control by itself; the page still runs the old code until a reload.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true; // first install claiming this page, not an update
      return;
    }
    set("ready");
    maybeAutoApply();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) maybeAutoApply();
    else void checkForUpdates();
  });
  window.setInterval(() => void checkForUpdates(), 60 * 60 * 1000);
}

export function markUnsupported() {
  set("unsupported");
}
