export type TerminalPlatform = "macos" | "linux" | "cmd" | "powershell";

export const PLATFORMS: { id: TerminalPlatform; label: string; symbol: string; hint: string }[] = [
  { id: "macos", label: "macOS", symbol: "%", hint: "zsh" },
  { id: "linux", label: "Linux", symbol: "$", hint: "bash" },
  { id: "cmd", label: "Windows CMD", symbol: ">", hint: "cmd.exe" },
  { id: "powershell", label: "PowerShell", symbol: ">", hint: "Windows" },
];

export interface TerminalImageOptions {
  platform: TerminalPlatform;
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

interface Palette {
  bg: string;
  bar: string;
  barText: string;
  text: string;
  user: string;
  dir: string;
  cursor: string;
}

const PALETTES: Record<TerminalPlatform, Record<"dark" | "light", Palette>> = {
  macos: {
    dark: { bg: "#1e1e1e", bar: "#2b2b2b", barText: "#a8a8a8", text: "#ececec", user: "#7be0a2", dir: "#6ea8fe", cursor: "#9a9a9a" },
    light: { bg: "#fbfaf6", bar: "#ebe7da", barText: "#6b6f73", text: "#1c2b33", user: "#15803d", dir: "#1d4ed8", cursor: "#8a8f94" },
  },
  linux: {
    dark: { bg: "#300a24", bar: "#3c3b37", barText: "#dfdbd2", text: "#eeeeec", user: "#8ae234", dir: "#729fcf", cursor: "#eeeeec" },
    light: { bg: "#f6f5f4", bar: "#e1dedb", barText: "#2e3436", text: "#2e3436", user: "#2e7d0b", dir: "#2a5fa5", cursor: "#2e3436" },
  },
  cmd: {
    dark: { bg: "#0c0c0c", bar: "#1f1f1f", barText: "#e6e6e6", text: "#cccccc", user: "#cccccc", dir: "#cccccc", cursor: "#cccccc" },
    light: { bg: "#ffffff", bar: "#f0f0f0", barText: "#1f1f1f", text: "#1c1c1c", user: "#1c1c1c", dir: "#1c1c1c", cursor: "#1c1c1c" },
  },
  powershell: {
    dark: { bg: "#012456", bar: "#1f1f1f", barText: "#e6e6e6", text: "#eeedf0", user: "#eeedf0", dir: "#eeedf0", cursor: "#eeedf0" },
    light: { bg: "#ffffff", bar: "#f0f0f0", barText: "#1f1f1f", text: "#1c1c1c", user: "#1c1c1c", dir: "#1c1c1c", cursor: "#1c1c1c" },
  },
};

const FONT_STACK = 'Menlo, Monaco, Consolas, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';
const MAX_COLS = 100;

type Segment = { text: string; color: "text" | "user" | "dir" };

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
  const user = opts.user.trim() || "student";
  const host = opts.host.trim() || "lab-pc";
  const dir = opts.dir.trim() || (opts.platform === "linux" || opts.platform === "macos" ? "~" : "record");
  const symbol = opts.symbol.trim() || PLATFORMS.find((p) => p.id === opts.platform)?.symbol || "%";

  const rows: Segment[][] = [];
  const promptSegs = (): Segment[] => {
    switch (opts.platform) {
      case "linux":
        return [
          { text: `${user}@${host}`, color: "user" },
          { text: ":", color: "text" },
          { text: dir.startsWith("~") || dir.startsWith("/") ? dir : `~/${dir}`, color: "dir" },
          { text: `${symbol} `, color: "text" },
        ];
      case "cmd":
        return [{ text: `C:\\Users\\${user}\\${dir}${symbol}`, color: "text" }];
      case "powershell":
        return [{ text: `PS C:\\Users\\${user}\\${dir}${symbol} `, color: "text" }];
      default:
        return [
          { text: `${user}@${host}`, color: "user" },
          { text: " ", color: "text" },
          { text: dir, color: "dir" },
          { text: ` ${symbol} `, color: "text" },
        ];
    }
  };

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

  const t = PALETTES[opts.platform][opts.theme];
  const scale = 2;
  const fontSize = 15;
  const lineH = Math.round(fontSize * 1.55);
  const pad = 22;
  const barH = opts.windowBar ? (opts.platform === "macos" ? 34 : 32) : 0;

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
    if (opts.platform === "macos") {
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(18 + i * 20, barH / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.font = `12px ${FONT_STACK}`;
      ctx.fillStyle = t.barText;
      ctx.textBaseline = "middle";
      const title =
        opts.platform === "linux"
          ? `${user}@${host}: ${dir.startsWith("~") || dir.startsWith("/") ? dir : `~/${dir}`}`
          : opts.platform === "cmd"
            ? "Command Prompt"
            : "Windows PowerShell";
      if (opts.platform === "linux") {
        ctx.textAlign = "center";
        ctx.fillText(title, width / 2, barH / 2 + 1);
        // round close button
        ctx.fillStyle = "#e95420";
        ctx.beginPath();
        ctx.arc(width - 20, barH / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.textAlign = "left";
        ctx.fillText(title, 12, barH / 2 + 1);
        // minimise / maximise / close glyphs
        ctx.strokeStyle = t.barText;
        ctx.lineWidth = 1;
        const cy = barH / 2;
        ctx.beginPath();
        ctx.moveTo(width - 112, cy);
        ctx.lineTo(width - 102, cy);
        ctx.stroke();
        ctx.strokeRect(width - 70, cy - 5, 10, 10);
        ctx.beginPath();
        ctx.moveTo(width - 29, cy - 5);
        ctx.lineTo(width - 19, cy + 5);
        ctx.moveTo(width - 19, cy - 5);
        ctx.lineTo(width - 29, cy + 5);
        ctx.stroke();
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${fontSize}px ${FONT_STACK}`;
    }
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
