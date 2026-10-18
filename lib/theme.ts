export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];

/** Pages that are always light: the marketing page is designed on paper. */
const LIGHT_ONLY = new Set(["/", "/sitemap"]);

/** Resolves the saved choice to light or dark for this page and device. */
export function resolveTheme(theme: Theme, pathname = typeof location !== "undefined" ? location.pathname : "/"): "light" | "dark" {
  if (LIGHT_ONLY.has(pathname.replace(/\/+$/, "") || "/")) return "light";
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Sets `data-theme` on <html> (see the dark tokens in globals.css) and the browser chrome colour. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#161412" : "#faf7f0");
}

export function savedTheme(): Theme {
  try {
    const t = JSON.parse(localStorage.getItem("recordlab-settings-v1") || "{}").theme;
    return THEMES.includes(t) ? t : "system";
  } catch {
    return "system";
  }
}
