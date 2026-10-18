import { SITE_URL } from "./site";

export const MAIL_TONES = [
  { id: "friendly", label: "Friendly" },
  { id: "professional", label: "Professional" },
  { id: "short", label: "Short and direct" },
] as const;
export type MailTone = (typeof MAIL_TONES)[number]["id"];

export const MAIL_PURPOSES = [
  "Announce a new feature",
  "Welcome new students",
  "Say sorry for a problem and explain the fix",
  "Ask for feedback",
  "Tell users about planned maintenance",
];

export interface DraftedMail {
  subject: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
}

/** The prompt that turns "what is this email for" into a ready email. The model must answer with JSON only. */
export function buildMailPrompt(purpose: string, tone: MailTone, audience: string): string {
  const toneLine = tone === "friendly" ? "warm, friendly and plain" : tone === "professional" ? "professional, calm and respectful" : "short and direct, under 80 words";
  return `You write emails for Record Lab, a free online lab record maker for college students (${SITE_URL}). It lets students write a lab record, run their code for real output, and download a print-ready PDF or Word file. It is made by Mohamed Sameer S under Cogniheim.

Write one email for this purpose: ${purpose.trim()}
Audience: ${audience}. Tone: ${toneLine}.

Rules:
- Plain text only. No markdown, no emoji, no HTML.
- Start the message with "Hi {{name}}," ({{name}} is replaced with each student's first name). Use {{name}} nowhere else.
- Use blank lines between short paragraphs. At most 140 words unless the purpose needs more.
- Be specific and honest. Never invent features, dates, numbers, discounts or promises that are not in the purpose.
- End with a short sign-off from "Sameer" and "Record Lab".
- The subject is under 60 characters, with no clickbait and no all caps.
- If there is one clear action, give a button label (2 to 4 words) and a full https:// link, preferring ${SITE_URL}/editor. Otherwise leave both empty.

Answer with ONLY a JSON object, no code fence and no other text:
{"subject": "...", "message": "...", "buttonLabel": "...", "buttonUrl": "..."}`;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const pick = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => str(o[k])).find(Boolean) ?? "";

/** Name placeholders chat assistants invent ([Name], {first_name}, <name>...) become the one merge tag we send. */
const normaliseName = (t: string) => t.replace(/\[\s*(?:first\s*)?name\s*\]|\{\s*(?:first_?\s*)?name\s*\}(?!\})|<\s*(?:first\s*)?name\s*>|\{\{\s*first_?name\s*\}\}/gi, "{{name}}");

/** Markdown the assistant adds around a plain email: **bold**, # headings, code fences. */
const stripMarkdown = (t: string) =>
  t
    .replace(/```[a-z]*\n?|```/gi, "")
    .replace(/\*\*|__/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .trim();

function fromJson(text: string): DraftedMail | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const subject = pick(j, ["subject", "title", "subjectLine"]).slice(0, 150);
    const message = normaliseName(pick(j, ["message", "body", "email", "text", "content"]));
    if (!subject || !message) return null;
    const url = pick(j, ["buttonUrl", "button_url", "ctaUrl", "url", "link"]);
    const ok = /^https?:\/\//i.test(url);
    return { subject, message, buttonLabel: ok ? pick(j, ["buttonLabel", "button_label", "ctaLabel", "button", "cta"]).slice(0, 60) : "", buttonUrl: ok ? url : "" };
  } catch {
    return null;
  }
}

/** A plain email: a "Subject:" line (any markdown around it) and the rest as the message. */
function fromPlain(text: string): DraftedMail | null {
  const plain = stripMarkdown(text);
  const m = plain.match(/^\s*(?:email\s+)?subject(?:\s*line)?\s*[:\-–—]\s*(.+)$/im);
  if (!m) return null;
  const message = normaliseName(plain.replace(m[0], "").replace(/^\s*(?:email\s+)?(?:body|message|content)\s*[:\-–—]\s*/im, "").trim());
  return message ? { subject: m[1].replace(/^["“]|["”]$/g, "").trim().slice(0, 150), message, buttonLabel: "", buttonUrl: "" } : null;
}

/** Strict reading, for the model we prompt ourselves: JSON, or plain text with a subject. Null when it is neither. */
export function parseMailDraft(text: string): DraftedMail | null {
  return fromJson(text) ?? fromPlain(text);
}

/**
 * Forgiving reading, for an answer pasted from any chat assistant. Never fails on real text: if there is no
 * subject, the message is kept and the subject comes back empty for the person to fill in.
 */
export function draftFromAnswer(text: string): DraftedMail | null {
  const strict = parseMailDraft(text);
  if (strict) return strict;
  const message = normaliseName(stripMarkdown(text));
  return message.length >= 15 ? { subject: "", message, buttonLabel: "", buttonUrl: "" } : null;
}
