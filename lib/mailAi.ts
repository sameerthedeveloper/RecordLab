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

/**
 * Reads the model's answer: the JSON the prompt asks for (a code fence or a sentence around it is fine),
 * or, when a chat assistant ignores that, plain text with a "Subject:" line.
 */
export function parseMailDraft(text: string): DraftedMail | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      const subject = str(j.subject).slice(0, 150);
      const message = str(j.message);
      if (subject && message) {
        const url = str(j.buttonUrl);
        const ok = /^https?:\/\//i.test(url);
        return { subject, message, buttonLabel: ok ? str(j.buttonLabel).slice(0, 60) : "", buttonUrl: ok ? url : "" };
      }
    } catch {
      /* fall through to the plain-text reading */
    }
  }
  const plain = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  const m = plain.match(/^\s*subject\s*:\s*(.+)$/im);
  if (!m) return null;
  const message = plain.replace(m[0], "").replace(/^\s*(body|message)\s*:\s*/im, "").trim();
  return message ? { subject: m[1].trim().slice(0, 150), message, buttonLabel: "", buttonUrl: "" } : null;
}
