/* Record Lab: runs Python in the browser with Pyodide (WebAssembly), inside a Worker so a runaway
   program can be terminated. Matplotlib figures and image files the program writes come back as PNG data.
   Pyodide itself is fetched from the jsDelivr CDN the first time and cached by the service worker. */
const PYODIDE_VERSION = "0.26.4";
const INDEX_URL = (self.__PYODIDE_INDEX__ || `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`);

let pyodide = null;

function post(msg) {
  self.postMessage(msg);
}

async function ensurePyodide() {
  if (pyodide) return pyodide;
  post({ type: "status", text: "Loading the Python runtime (first run downloads about 10 MB)…" });
  importScripts(INDEX_URL + "pyodide.js");
  pyodide = await self.loadPyodide({ indexURL: INDEX_URL });
  return pyodide;
}

const PRELUDE = `
import sys, os
os.environ["MPLBACKEND"] = "AGG"
try:
    import matplotlib
    matplotlib.use("agg", force=True)
    import matplotlib.pyplot as _plt
    _plt.show = lambda *a, **k: None
except Exception:
    pass
`;

const COLLECT = `
import io, base64, os, sys
_imgs = []
if "matplotlib.pyplot" in sys.modules:
    _plt = sys.modules["matplotlib.pyplot"]
    for _n in _plt.get_fignums():
        _buf = io.BytesIO()
        _plt.figure(_n).savefig(_buf, format="png", dpi=140, bbox_inches="tight")
        _imgs.append(("figure-%d.png" % _n, "image/png", base64.b64encode(_buf.getvalue()).decode()))
    _plt.close("all")
_imgs
`;

self.onmessage = async (event) => {
  const { code, stdin = "" } = event.data;
  const stdout = [];
  const stderr = [];
  try {
    const py = await ensurePyodide();
    py.setStdout({ batched: (s) => stdout.push(s) });
    py.setStderr({ batched: (s) => stderr.push(s) });
    const lines = stdin ? String(stdin).split("\n") : [];
    let at = 0;
    py.setStdin({ stdin: () => (at < lines.length ? lines[at++] : null) });

    if (/\b(import|from)\s+(numpy|pandas|matplotlib|scipy|sympy|PIL|sklearn|seaborn|statistics)\b/.test(code)) {
      post({ type: "status", text: "Loading the libraries your program imports…" });
    }
    await py.loadPackagesFromImports(code);
    post({ type: "status", text: "Running…" });

    const before = new Set(py.FS.readdir(".").filter((n) => n !== "." && n !== ".."));
    await py.runPythonAsync(PRELUDE);
    let failed = false;
    try {
      await py.runPythonAsync(code);
    } catch (err) {
      failed = true;
      // Keep only the user's frames: drop Pyodide's own wrapper lines from the traceback.
      const text = String(err && err.message ? err.message : err);
      stderr.push(text.split("\n").filter((l) => !/pyodide\/|_pyodide|File "\/lib\/python/.test(l) || /Error|Exception/.test(l)).join("\n"));
    }

    const images = [];
    try {
      const collected = py.runPython(COLLECT).toJs();
      for (const [name, mime, b64] of collected) images.push({ name, dataUrl: `data:${mime};base64,${b64}` });
    } catch (_) {
      /* no figures */
    }
    // Image files the program wrote (plt.savefig("x.png"), PIL, ...).
    for (const name of py.FS.readdir(".")) {
      if (before.has(name) || !/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) continue;
      const bytes = py.FS.readFile(name);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      const ext = name.split(".").pop().toLowerCase();
      const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      images.push({ name, dataUrl: `data:${mime};base64,${btoa(bin)}` });
    }

    post({ type: "done", ok: !failed, stdout: stdout.join("\n"), stderr: stderr.join("\n"), images });
  } catch (err) {
    post({ type: "done", ok: false, stdout: stdout.join("\n"), stderr: String(err && err.message ? err.message : err), images: [] });
  }
};
