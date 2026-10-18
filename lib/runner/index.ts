import { languageInfo, type RunLanguage } from "./languages";

export interface RunImage {
  name: string;
  dataUrl: string;
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  images: RunImage[];
  engine: "browser" | "remote";
  language: RunLanguage;
  durationMs: number;
}

export interface RunOptions {
  language: RunLanguage;
  code: string;
  stdin?: string;
  /** Called with progress text ("Loading the Python runtime…"). */
  onStatus?: (text: string) => void;
  signal?: AbortSignal;
  /** Remote runner base URL (Judge0-compatible). */
  remoteUrl?: string;
}

/** Longest a browser run may take after the runtime is loaded, and for the first-time runtime download. */
const RUN_TIMEOUT_MS = 25_000;
const LOAD_TIMEOUT_MS = 180_000;

function runInWorker(script: string, opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const worker = new Worker(script);
    let finished = false;
    // Python needs a long first deadline (download); it shortens once the worker reports it is running.
    let timer = window.setTimeout(() => stop("The program ran for too long and was stopped (limit 25 s). Check for an endless loop."), opts.language === "python" ? LOAD_TIMEOUT_MS : RUN_TIMEOUT_MS);

    function stop(message: string) {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, stdout: "", stderr: message, images: [], engine: "browser", language: opts.language, durationMs: performance.now() - started });
    }
    opts.signal?.addEventListener("abort", () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      worker.terminate();
      reject(new DOMException("Stopped", "AbortError"));
    });

    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "status") {
        opts.onStatus?.(m.text);
        if (m.text === "Running…") {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => stop("The program ran for too long and was stopped (limit 25 s). Check for an endless loop."), RUN_TIMEOUT_MS);
        }
      } else if (m.type === "done" && !finished) {
        finished = true;
        window.clearTimeout(timer);
        worker.terminate();
        resolve({ ok: m.ok, stdout: m.stdout, stderr: m.stderr, images: m.images ?? [], engine: "browser", language: opts.language, durationMs: performance.now() - started });
      }
    };
    worker.onerror = (e) => stop(e.message || "The runner crashed.");
    worker.postMessage({ code: opts.code, stdin: opts.stdin ?? "" });
  });
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string | null | undefined) => {
  if (!s) return "";
  try {
    return decodeURIComponent(escape(atob(s.replace(/\s/g, ""))));
  } catch {
    return "";
  }
};

export const DEFAULT_REMOTE_URL = "https://ce.judge0.com";

/** C, C++ and Java need a compiler: the code is sent to a Judge0-compatible runner and the result comes back. */
async function runRemote(opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  const base = (opts.remoteUrl || DEFAULT_REMOTE_URL).replace(/\/+$/, "");
  const info = languageInfo(opts.language);
  opts.onStatus?.("Compiling and running on the runner service…");
  let res: Response;
  try {
    res = await fetch(`${base}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,status,time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language_id: info.judge0, source_code: b64(opts.code), stdin: b64(opts.stdin ?? "") }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    throw new Error("Couldn't reach the runner service. Check your connection, or run Python / JavaScript, which work offline.");
  }
  if (!res.ok) {
    throw new Error(res.status === 429 ? "The runner service is busy. Wait a moment and run again." : `The runner service answered ${res.status}.`);
  }
  const data = (await res.json()) as {
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    status?: { id: number; description: string };
  };
  const compile = unb64(data.compile_output);
  const err = [compile, unb64(data.stderr), unb64(data.message)].filter(Boolean).join("\n");
  // status 3 = accepted; anything else (compile error, runtime error, time limit) is shown as an error.
  const ok = data.status?.id === 3;
  return {
    ok,
    stdout: unb64(data.stdout),
    stderr: ok ? err : err || data.status?.description || "The program did not finish.",
    images: [],
    engine: "remote",
    language: opts.language,
    durationMs: performance.now() - started,
  };
}

export function runCode(opts: RunOptions): Promise<RunResult> {
  const info = languageInfo(opts.language);
  if (info.where === "remote") return runRemote(opts);
  return runInWorker(opts.language === "python" ? "/runner/python-worker.js" : "/runner/js-worker.js", opts);
}
