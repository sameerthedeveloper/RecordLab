# Record Lab

A Next.js 14 (App Router) + TypeScript + Tailwind port of the original single-file
`index.html` lab-record builder. Behavior, layout, and UX are preserved 1:1; the
codebase has been split into typed components and modules.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## Project layout

- `app/page.tsx` — top-level client component holding all app state (record,
  watermark options, mobile panel, AI modal) and wiring the editor, preview,
  print, and PDF-save flows together.
- `app/layout.tsx` — loads Material Symbols and `html2pdf.js` (via
  `next/script`, `strategy="lazyOnload"` — it touches `document`/`canvas` and
  isn't SSR-safe).
- `components/` — `RecordEditorPanel`, `WatermarkOptionsSection`,
  `AccordionSection`, `PreviewPanel`, `A4Page`, `MobileNav`, and
  `AiAssistantModal` (with `ai/CopyPromptTab`, `ai/PasteImportTab`,
  `ai/DirectLlmTab`).
- `lib/paginate.ts` — the smart pagination engine, ported line-for-line from
  the original. It still measures real rendered heights in a hidden offscreen
  DOM node (`lib/usePaginatedPages.ts` wraps it in a debounced
  `useEffect`/`useState` hook) because text wrapping depends on actual font
  rendering and can't be predicted analytically — this keeps it accurate but
  means it isn't a pure function in the strict sense; it's as close to
  testable/pure as the original algorithm allows.
- `lib/buildPrintHtml.ts` / `lib/printCss.ts` — build the exact print-document
  HTML string reused by both the hidden print `<iframe>` and `html2pdf.js`.
- `lib/aiAssistant.ts` — the AI prompt template, DOMParser-based section
  parser with regex `extractTag` fallback, validator, and Gemini API call.
- `lib/types.ts` — `RecordState`, `OutputImage`, `WatermarkOptions`,
  `PageObject`.

## Design

The app chrome (editor, preview toolbar, modal, nav) uses a "lab notebook"
visual identity — a warm paper background, a serif/mono title-block treatment
(`Source Serif 4` + `Inter` + `JetBrains Mono`, loaded via `next/font/google`),
a copper accent color, and numbered section eyebrows (01 AIM, 02 ALGORITHM, …)
that mirror the record's actual printed order. Icons are from `lucide-react`.

This only touches the app UI. The generated record itself (`.a4-page` and
everything inside it, in `A4Page.tsx` / `globals.css` / `printCss.ts` /
`buildPrintHtml.ts`) intentionally keeps its own hard-coded Arial stack so
preview, print, and PDF stay pixel-identical — never point the chrome's
`--font-*` variables at those selectors.

## Implementation notes

- **Escaping**: form inputs, thumbnails, and the AI modal are rendered as real
  JSX, so React handles escaping automatically. The one exception is the
  paginated document content (`lib/paginate.ts` output, rendered via
  `dangerouslySetInnerHTML` in `A4Page`): the pagination engine has to work in
  raw HTML strings because it measures and splits content by rendered pixel
  height across page boundaries, and re-deriving that from JSX per fragment
  isn't safely feasible without changing the algorithm. All user text within
  those fragments is still run through `escapeHTML` before being placed in the
  HTML string, matching the original's XSS-safety guarantee.
- **Debounced pagination**: added an ~80ms debounce in
  `usePaginatedPages` so rapid typing doesn't trigger a synchronous
  DOM-measurement pass on every keystroke. This is a minor smoothness
  improvement over the original (which re-paginated on every `input` event
  synchronously); it does not change output.
- **No persistence**: state is in-memory only (`useState`), matching the
  original — nothing is written to `localStorage`/`sessionStorage`.
- **Two direct LLM providers**: the "Direct LLM" tab supports Google Gemini
  (`gemini-1.5-flash`) and NVIDIA NIM's OpenAI-compatible chat completions
  endpoint (`integrate.api.nvidia.com`, model defaults to
  `meta/llama-3.1-70b-instruct`, editable). Both share one prompt builder
  (`buildLabRecordPrompt`) and response parser, so switching providers doesn't
  change what gets imported.
- **Client-side rate limiting**: `lib/rateLimiter.ts` is a small in-memory
  sliding-window limiter (5 requests / 60s, shared across both providers) used
  by `DirectLlmTab` to block rapid repeat clicks and show a countdown before
  the next request is allowed. It's a UX guard against accidentally burning
  through API quota, not a security control.

## Known limitations (carried over from the original, not silently "fixed")

- **API keys are exposed client-side.** The "Direct LLM" tab calls the Gemini
  and NVIDIA NIM APIs directly from the browser using the key the user types
  in. This was true of the original single-file app's Gemini integration too
  — a backend proxy would fix it, but that's out of scope unless requested.
  Note NVIDIA NIM's endpoint may not allow direct browser (CORS) requests in
  all environments; `generateLabRecordViaNim` surfaces that as a clear error
  rather than failing silently.
- The pagination engine relies on browser font metrics (it creates a hidden,
  offscreen `.a4-page` node and measures `scrollHeight`), so it only produces
  accurate output in a browser environment, not during SSR — this matches the
  original's DOM-measurement approach.
