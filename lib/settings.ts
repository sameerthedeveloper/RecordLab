import { DEFAULT_DOC_FONT } from "./fonts";
import { DEFAULT_HEADER_LAYOUT, DEFAULT_WATERMARK, type HeaderLayout, type WatermarkOptions } from "./types";

/**
 * App-wide preferences, separate from any one record's .rlab.json payload —
 * set once via the Settings modal and remembered across sessions in this
 * browser. `rrn`, `watermark`, and `headerLayout` are only *defaults*: new
 * sessions start with them, but the Record Details field, Watermark Options
 * accordion, and the draggable header table all stay editable per record
 * (see app/page.tsx's initial-state seeding and handleSaveSettings). `font`
 * applies uniformly to every export — there's no per-record override for it.
 */
/** "apple": frosted, rounded, pill buttons (default). "classic": the original flat look. */
export type UiStyle = "apple" | "classic";

export const UI_STYLES: UiStyle[] = ["apple", "classic"];

/** Flips the look of the whole app by setting `data-ui` on <html> (see the .ui-* classes in globals.css). */
export function applyUiStyle(style: UiStyle): void {
  if (typeof document !== "undefined") document.documentElement.dataset.ui = style;
}

export interface AppSettings {
  rrn: string;
  watermark: WatermarkOptions;
  font: string;
  headerLayout: HeaderLayout;
  uiStyle: UiStyle;
}

export const DEFAULT_SETTINGS: AppSettings = {
  rrn: "",
  watermark: DEFAULT_WATERMARK,
  font: DEFAULT_DOC_FONT,
  headerLayout: DEFAULT_HEADER_LAYOUT,
  uiStyle: "apple",
};

const STORAGE_KEY = "recordlab-settings-v1";

/** Fills every missing or invalid field with its default, so data from localStorage or Firestore (old or partial) is safe to use. */
export function normalizeSettings(raw: unknown): AppSettings {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<AppSettings>;
  return {
    ...DEFAULT_SETTINGS,
    rrn: typeof parsed.rrn === "string" ? parsed.rrn : DEFAULT_SETTINGS.rrn,
    font: typeof parsed.font === "string" && parsed.font ? parsed.font : DEFAULT_SETTINGS.font,
    watermark: { ...DEFAULT_WATERMARK, ...(parsed.watermark ?? {}) },
    headerLayout: { ...DEFAULT_HEADER_LAYOUT, ...(parsed.headerLayout ?? {}) },
    uiStyle: UI_STYLES.includes(parsed.uiStyle as UiStyle) ? (parsed.uiStyle as UiStyle) : "apple",
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing / storage disabled — settings just won't persist.
  }
}
