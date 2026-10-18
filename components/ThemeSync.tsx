"use client";

import { useEffect } from "react";
import { applyTheme, savedTheme } from "@/lib/theme";

/** Keeps the theme right after navigation, and follows the device when the choice is "System". */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(savedTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(savedTheme());
    media.addEventListener("change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return null;
}
