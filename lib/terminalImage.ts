export interface TerminalImageOptions {
  user: string;
  host: string;
  dir: string;
  symbol: string;
  /** One command per line; each is printed after its own prompt. */
  commands: string;
  output: string;
  theme: "dark" | "light";
  windowBar: boolean;
  /** Trailing empty prompt with a block cursor, like a finished session. */
  endPrompt: boolean;
}

const THEMES = {
  dark: { bg: "#1e1e1e", bar: "#2b2b2b", text: "#ececec", user: "#7be0a2", dir: "#6ea8fe", cursor: "#9a9a9a" },
  light: { bg: "#fbfaf6", bar: "#ebe7da", text: "#1c2b33", user: "#15803d", dir: "#1d4ed8", cursor: "#8a8f94" },
} as const;

const FONT_STACK = 'Menlo, Monaco, Consolas, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';
const MAX_COLS = 100;

type Segment = { text: string; color: keyof (typeof THEMES)["dark"] };

function wrap(line: string): string[] {
  if (line.length <= MAX_COLS) return [line];
  const out: string[] = [];
  for (let i = 0; i < line.length; i += MAX_COLS) out.push(line.slice(i, i + MAX_COLS));
  return out;
}

/** Strips tags in case output text ever carries rich-text markup. */
function plain(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\t/g, "    ").replace(/\r/g, "");
}

/** Draws a terminal screenshot and returns it as a PNG data URL (browser only). */
export function renderTerminalImage(opts: TerminalImageOptions): string {
  const prompt = `${opts.user.trim() || "student"}@${opts.host.trim() || "lab-pc"}`;
  const dir = opts.dir.trim() || "~";
  const symbol = opts.symbol.trim() || "%";

  const rows: Segment[][] = [];
  const promptSegs = (): Segment[] => [
    { text: prompt, color: "user" },
    { text: " ", color: "text" },
    { text: dir, color: "dir" },
    { text: ` ${symbol} `, color: "text" },
  ];

  for (const cmd of plain(opts.commands).split("\n").filter((c) => c.trim())) {
    const [first, ...rest] = wrap(cmd);
    rows.push([...promptSegs(), { text: first, color: "text" }]);
    rest.forEach((r) => rows.push([{ text: r, color: "text" }]));
  }
  const outText = plain(opts.output).replace(/\s+$/, "");
  if (outText) {
    for (const line of outText.split("\n")) {
      for (const piece of wrap(line)) rows.push([{ text: piece, color: "text" }]);
    }
  }
  if (opts.endPrompt) rows.push(promptSegs());
  if (rows.length === 0) rows.push(promptSegs());

  const t = THEMES[opts.theme];
  const scale = 2;
  const fontSize = 15;
  const lineH = Math.round(fontSize * 1.55);
  const pad = 22;
  const barH = opts.windowBar ? 34 : 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  const charW = ctx.measureText("M").width;
  const cols = Math.max(...rows.map((r) => r.reduce((n, s) => n + s.text.length, 0))) + (opts.endPrompt ? 2 : 0);
  const width = Math.round(Math.max(520, cols * charW + pad * 2));
  const height = barH + pad * 2 - 6 + rows.length * lineH;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, width, height);

  if (opts.windowBar) {
    ctx.fillStyle = t.bar;
    ctx.fillRect(0, 0, width, barH);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(18 + i * 20, barH / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  rows.forEach((segs, i) => {
    const baseline = barH + pad - 6 + i * lineH + fontSize + 3;
    let x = pad;
    for (const seg of segs) {
      ctx.fillStyle = t[seg.color];
      ctx.fillText(seg.text, x, baseline);
      x += seg.text.length * charW;
    }
    if (opts.endPrompt && i === rows.length - 1) {
      ctx.fillStyle = t.cursor;
      ctx.fillRect(x, baseline - fontSize + 1, charW, fontSize + 3);
    }
  });

  return canvas.toDataURL("image/png");
}
