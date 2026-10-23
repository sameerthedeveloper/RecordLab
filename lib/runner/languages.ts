import { looksLikeWeb } from "./web";

export type RunLanguage = "python" | "javascript" | "web" | "c" | "cpp" | "java";

export interface LanguageInfo {
  id: RunLanguage;
  label: string;
  /** "browser": runs on this device (works offline once loaded). "remote": compiled on a runner service. */
  where: "browser" | "remote";
  /** Judge0 CE language id for remote languages. */
  judge0?: number;
}

export const LANGUAGES: LanguageInfo[] = [
  { id: "python", label: "Python", where: "browser", judge0: 71 },
  { id: "javascript", label: "JavaScript", where: "browser", judge0: 63 },
  { id: "web", label: "HTML / CSS / JS", where: "browser" },
  { id: "c", label: "C", where: "remote", judge0: 50 },
  { id: "cpp", label: "C++", where: "remote", judge0: 54 },
  { id: "java", label: "Java", where: "remote", judge0: 62 },
];

export const languageInfo = (id: RunLanguage): LanguageInfo => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

/** Best guess of the language from the code itself, for the "Auto" choice. */
export function detectLanguage(code: string): RunLanguage {
  const c = code.trim();
  if (looksLikeWeb(c)) return "web";
  if (/\bpublic\s+(static\s+)?(class|void)\b|System\.out\.print/.test(c)) return "java";
  if (/#include\s*<(iostream|vector|string|bits\/stdc\+\+\.h|algorithm|map|set)>|std::|using\s+namespace\s+std/.test(c)) return "cpp";
  if (/#include\s*<(stdio|stdlib|string|math)\.h>|\bint\s+main\s*\(/.test(c)) return "c";
  if (/\bconsole\.(log|error)\b|\bconst\s+\w+\s*=|\blet\s+\w+\s*=|=>\s*[{(]/.test(c) && !/\bdef\s+\w+\(|^\s*import\s+\w+/m.test(c)) return "javascript";
  return "python";
}

/** Maps free text like "Python 3", "C++" or "java" onto a supported language. */
export function languageFromText(text: string): RunLanguage | null {
  const t = text.toLowerCase();
  if (/\bhtml\b|\bcss\b|web ?page|front-?end/.test(t)) return "web";
  if (/c\+\+|cpp/.test(t)) return "cpp";
  if (/\bjava\b(?!script)/.test(t)) return "java";
  if (/javascript|\bjs\b|node/.test(t)) return "javascript";
  if (/python|\bpy\b|matplotlib|numpy/.test(t)) return "python";
  if (/(^|\W)c(\W|$)/.test(t)) return "c";
  return null;
}
