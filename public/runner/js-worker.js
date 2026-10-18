/* Record Lab: runs JavaScript in a Worker (no page access, killable). console.* is captured. */
self.onmessage = async (event) => {
  const { code } = event.data;
  const out = [];
  const err = [];
  const fmt = (a) => a.map((x) => (typeof x === "string" ? x : (() => { try { return typeof x === "object" ? JSON.stringify(x) : String(x); } catch (_) { return String(x); } })())).join(" ");
  const fake = {
    log: (...a) => out.push(fmt(a)),
    info: (...a) => out.push(fmt(a)),
    debug: (...a) => out.push(fmt(a)),
    warn: (...a) => err.push(fmt(a)),
    error: (...a) => err.push(fmt(a)),
  };
  let ok = true;
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction("console", code)(fake);
  } catch (e) {
    ok = false;
    err.push(String(e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n") : e));
  }
  self.postMessage({ type: "done", ok, stdout: out.join("\n"), stderr: err.join("\n"), images: [] });
};
