# .rlab.json format

The save/load file format used by Record Lab's "Save Work" / "Load Work" buttons (`app/page.tsx`). Portable JSON — reuse this schema in other projects that need to import/export the same record shape.

## Top-level payload

```json
{
  "version": 1,
  "record": { /* RecordState, see below */ },
  "watermark": { /* WatermarkOptions, see below */ }
}
```

- `version` — integer, currently always `1`. Bump this if the shape changes, and branch on it in loaders.
- `record` — required.
- `watermark` — optional; loaders should fall back to defaults if absent.

## `RecordState`

```ts
interface RecordState {
  rrn: string;                 // roll/register number
  exercise_number: string;     // e.g. "2"
  date: string;                // ISO date string, e.g. "2026-09-03"
  title: string;                // experiment title
  aim: string;
  algorithm: string;
  source_code: string;
  output: string;               // free-text output notes
  output_images: OutputImage[]; // embedded images (see below)
  review_questions: string;
  review_questions_enabled: boolean; // whether review_questions is included in the exported record
  result: string;
}

interface OutputImage {
  id: number;      // Date.now() + Math.random() at creation — not stable/sequential, just unique
  src: string;     // data: URL (base64), image is embedded inline, not referenced externally
  name: string;    // original filename
}
```

Defaults (used when a field is missing on load):

```json
{
  "rrn": "",
  "exercise_number": "",
  "date": "",
  "title": "",
  "aim": "",
  "algorithm": "",
  "source_code": "",
  "output": "",
  "output_images": [],
  "review_questions": "",
  "review_questions_enabled": true,
  "result": ""
}
```

## `WatermarkOptions`

```ts
interface WatermarkOptions {
  font: string;      // CSS font-family string, e.g. "Arial, sans-serif"
  size: number;      // px, e.g. 72
  rotation: number;  // degrees, e.g. -45
  opacity: number;   // 0-100 (percent, not 0-1)
  color: string;     // hex color, e.g. "#6b7280"
}
```

Defaults:

```json
{
  "font": "Arial, sans-serif",
  "size": 72,
  "rotation": -45,
  "opacity": 10,
  "color": "#6b7280"
}
```

## Loader behavior worth copying

Record Lab's loader (`handleLoadWork`) is deliberately loose:

- It accepts either `{ version, record, watermark }` or a bare `RecordState` object at the top level (`data.record ?? data`).
- It validates only that the result is an object with a string `title` field — anything else passing that check is accepted.
- It merges onto defaults (`{ ...DEFAULT_RECORD, ...loadedRecord }`) rather than requiring every field, so older/partial files still load.
- Invalid files raise a user-facing alert rather than crashing.

## File naming convention

`record-lab[-<slugified-title>][-<slugified-rrn>].rlab.json`, where slugify strips `<>:"/\|?*` and lowercases spaces to hyphens. The `.rlab.json` double extension is just a convention — it's plain JSON, any `.json` reader works.
