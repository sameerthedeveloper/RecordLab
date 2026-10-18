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

Answer with ONE html code block and nothing else (no text before or after it). Use exactly these element ids, each once:

\`\`\`html
<div id="mail">
  <h1 id="subject">Subject line here</h1>
  <div id="message">
    <p>Hi {{name}},</p>
    <p>First short paragraph.</p>
    <p>Second short paragraph.</p>
    <p>Regards,<br>Sameer<br>Record Lab</p>
  </div>
  <a id="button" href="https://...">Button label</a>
</div>
\`\`\`

Inside #message use only <p>, <br>, <ul> and <li>, with no styles, classes, images or scripts. Leave out the <a id="button"> element entirely when there is no single clear action.`;
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

/**
 * JSON.parse, after fixing what chat assistants get wrong: a backslash before a character that needs none
 * ("https\://..." from markdown escaping), trailing commas, and curly quotes around keys and values.
 */
function parseLenientJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const fixed = raw
      .replace(/\\(?!["\\/bfnrtu])/g, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201c\u201d]/g, '"');
    return JSON.parse(fixed);
  }
}

/** Text of an element as plain text: <br> is a line break, <li> becomes "- item", block children are separated. */
function htmlToText(el: Element): string {
  const walk = (n: Node): string => {
    if (n.nodeType === 3) return (n.textContent ?? "").replace(/\s+/g, " ");
    if (n.nodeType !== 1) return "";
    const e = n as Element;
    const tag = e.tagName.toLowerCase();
    if (tag === "br") return "\n";
    const inner = Array.from(e.childNodes).map(walk).join("");
    if (tag === "li") return `- ${inner.trim()}\n`;
    if (/^(p|div|h[1-6]|ul|ol|section|blockquote)$/.test(tag)) return `${inner.trim()}\n\n`;
    return inner;
  };
  return Array.from(el.childNodes).map(walk).join("").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** The html block the prompt asks for: #subject, #message and an optional #button link. */
function fromHtml(text: string): DraftedMail | null {
  if (typeof DOMParser === "undefined") return null;
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  const markup = fence ? fence[1] : /<\/?(div|p|h1|a)\b/i.test(text) ? text : "";
  if (!markup) return null;
  const doc = new DOMParser().parseFromString(markup, "text/html");
  doc.querySelectorAll("script,style").forEach((n) => n.remove());
  const subject = (doc.getElementById("subject")?.textContent ?? doc.querySelector("h1")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 150);
  const box = doc.getElementById("message");
  let message: string;
  if (box) message = htmlToText(box);
  else {
    // No #message: every paragraph that is not the subject or the button.
    const skip = new Set([doc.getElementById("subject"), doc.getElementById("button")]);
    message = Array.from(doc.body.querySelectorAll("p")).filter((p) => !skip.has(p)).map((p) => htmlToText(p)).filter(Boolean).join("\n\n");
  }
  message = normaliseName(message);
  if (!subject || !message) return null;
  const link = doc.getElementById("button") ?? doc.querySelector("a[href^='http']");
  const url = link?.getAttribute("href")?.trim() ?? "";
  const ok = /^https?:\/\//i.test(url);
  return { subject, message, buttonLabel: ok ? (link?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : "", buttonUrl: ok ? url : "" };
}

function fromJson(text: string): DraftedMail | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  const raw = text.slice(start, end + 1);
  try {
    const j = parseLenientJson(raw) as Record<string, unknown>;
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

/** Strict reading, for the model we prompt ourselves: the html block, JSON, or plain text with a subject. Null when it is none of those. */
export function parseMailDraft(text: string): DraftedMail | null {
  return fromHtml(text) ?? fromJson(text) ?? fromPlain(text);
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
