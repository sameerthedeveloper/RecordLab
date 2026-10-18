export type OnboardingPanel = "inputs" | "preview";
export type OnboardingSide = "top" | "bottom" | "left" | "right";

export interface OnboardingStep {
  /** CSS selector for the element this step points at, e.g. a `data-onboarding` attribute. */
  target: string;
  /** Which mobile panel must be showing for the target to be visible/measurable. Ignored on desktop, where both panels render side by side. */
  panel: OnboardingPanel;
  /** Preferred side to place the callout on — flipped automatically if there isn't room. */
  side: OnboardingSide;
  title: string;
  body: string;
  /** Tour version that introduced this step (default 1). Returning visitors only see steps newer than what they've seen. */
  since?: number;
}

/**
 * First-open walkthrough, ordered to match the record's own printed
 * flow: header details, then the AI shortcut, then the six sections,
 * then the live preview and export. Reuses the app's own "01" mono
 * step-index convention (see AccordionSection) for the counter.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: '[data-onboarding="brand"]',
    panel: "inputs",
    side: "bottom",
    title: "Welcome to Record Lab",
    body: "Fill in an experiment once — Record Lab typesets it into a print-ready lab record, paginated to true A4 pages.",
  },
  {
    target: '[data-onboarding="record-details"]',
    panel: "inputs",
    side: "right",
    title: "Start with the basics",
    body: "RRN, exercise number, date, and title anchor the header on every page.",
  },
  {
    target: '[data-onboarding="ai-generate"]',
    panel: "inputs",
    side: "left",
    title: "Or let AI draft it",
    body: "Paste your rough notes in here and Record Lab fills in the aim, algorithm, code, and result for you.",
  },
  {
    target: '[data-onboarding="save-cloud"]',
    panel: "inputs",
    side: "bottom",
    title: "Save to your account",
    body: "Sign in with Google (top right of the preview) to save records to the cloud and pick them up on any device from My Documents.",
  },
  {
    target: '[data-onboarding="open-settings"]',
    panel: "inputs",
    side: "bottom",
    title: "Set your defaults",
    body: "Register your RRN once, pick a document font, and size the title table — new records start with these, and you can still adjust any of it per record.",
  },
  {
    target: '[data-onboarding="sections"]',
    panel: "inputs",
    side: "right",
    title: "Six sections, one flow",
    body: "Aim, algorithm, source code, output, review questions, result — each unfolds in the order it prints.",
  },
  {
    target: '[data-onboarding="preview-heading"]',
    panel: "preview",
    side: "bottom",
    title: "Watch it typeset live",
    body: "Every change repaginates the preview into real A4 pages, right as you type.",
  },
  {
    target: '[data-onboarding="save-button"]',
    panel: "preview",
    side: "top",
    title: "Export when it's ready",
    body: "Download a print-ready PDF or DOCX — page border and watermark included.",
  },
  {
    target: '[data-onboarding="account-menu"]',
    panel: "preview",
    side: "bottom",
    title: "Your account",
    body: "Sign in with Google to sync records across devices. Once signed in, link your Puter account here too for AI drafting under your own name.",
  },
  {
    target: '[data-onboarding="record-format"]',
    panel: "inputs",
    side: "right",
    since: 2,
    title: "New: College sheet format",
    body: "Switch to the College sheet to get the heading block that runs edge to edge, like a printed lab sheet.",
  },
  {
    target: '[data-onboarding="page-border"]',
    panel: "inputs",
    side: "right",
    since: 2,
    title: "New: page border",
    body: "Pick the style, thickness, colour, distance from the edge and corner radius, per side, for every page.",
  },
  {
    target: '#manual',
    panel: "inputs",
    side: "right",
    since: 2,
    title: "New: manual calculation",
    body: "Turn it on to leave 35 blank lines before Result for hand-written working. It starts right under the last section.",
  },
  {
    target: '[data-onboarding="share"]',
    panel: "preview",
    side: "bottom",
    since: 2,
    title: "New: share a link",
    body: "Make a link anyone can open as an editable copy. Manage or revoke your links in Settings.",
  },
  {
    target: '[data-onboarding="open-files"]',
    panel: "inputs",
    side: "bottom",
    since: 2,
    title: "New: files and new records",
    body: "Open your files, download any of them as a PDF from its menu, or start a clean new record.",
  },
];
