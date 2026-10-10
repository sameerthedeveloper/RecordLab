"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production builds only: in dev it would cache stale chunks) and
 * keeps the page at a fixed zoom. iOS ignores `user-scalable=no`, so pinch and double-tap zoom
 * are also blocked from script.
 */
export function PwaRegister() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const stopPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    let lastTouchEnd = 0;
    const stopDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd < 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    document.addEventListener("touchmove", stopPinch, { passive: false });
    document.addEventListener("touchend", stopDoubleTap, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", stopPinch);
      document.removeEventListener("touchend", stopDoubleTap);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.error("SW registration failed:", err));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
