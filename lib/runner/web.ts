import type { RunOptions, RunResult } from "./index";

const WEB_TIMEOUT_MS = 20_000;
const FRAME_WIDTH = 794;

/** Runs in the page before the student's code: forwards console.* and errors to the parent. */
const HOOK = `<script>(function(){
var send=function(t,d){parent.postMessage({rl:1,type:t,data:d},"*")};
var fmt=function(a){return Array.prototype.map.call(a,function(x){if(typeof x==="string")return x;try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(_){return String(x)}}).join(" ")};
["log","info","debug"].forEach(function(k){console[k]=function(){send("out",fmt(arguments))}});
["warn","error"].forEach(function(k){console[k]=function(){send("err",fmt(arguments))}});
window.addEventListener("error",function(e){send("err",e.message+(e.lineno?" (line "+e.lineno+")":""))});
window.addEventListener("unhandledrejection",function(e){send("err","Unhandled promise rejection: "+(e.reason&&e.reason.message||e.reason))});
})();</script>`;

/** Runs after the page has loaded: waits for animations to settle, then sends back the finished DOM (canvases flattened to images). */
const SNAPSHOT = `<script>(function(){
var send=function(t,d){parent.postMessage({rl:1,type:t,data:d},"*")};
function go(){
  try{
    var live=document.querySelectorAll("canvas"),root=document.documentElement.cloneNode(true),copies=root.querySelectorAll("canvas");
    for(var i=0;i<copies.length;i++){try{var im=document.createElement("img");im.src=live[i].toDataURL("image/png");im.width=live[i].width;im.height=live[i].height;im.style.cssText=live[i].style.cssText;im.className=live[i].className;im.id=live[i].id;copies[i].parentNode.replaceChild(im,copies[i])}catch(_){}}
    send("snapshot",root.outerHTML);
  }catch(e){send("snapshot",null)}
}
if(document.readyState==="complete")setTimeout(go,500);else window.addEventListener("load",function(){setTimeout(go,500)});
})();</script>`;

/** Turns a fragment (just a <style>/<div>/<script>) or a full page into one document with both scripts. */
export function buildWebDocument(code: string): string {
  let doc = code.trim();
  if (!/<html[\s>]/i.test(doc)) {
    doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${doc}</body></html>`;
  }
  doc = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (m) => m + HOOK) : doc.replace(/<html[^>]*>/i, (m) => m + HOOK);
  return /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, SNAPSHOT + "</body>") : doc + SNAPSHOT;
}

/** The snapshot came from student code, so it is stripped of anything that could run before it is shown on this origin. */
function sanitizeSnapshot(html: string): string {
  const doc = new DOMParser().parseFromString("<!doctype html>" + html, "text/html");
  doc.querySelectorAll("script,noscript,iframe,object,embed,base,meta[http-equiv]").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  return "<!doctype html>" + doc.documentElement.outerHTML;
}

let html2canvasLoad: Promise<void> | null = null;
function loadHtml2Canvas(): Promise<void> {
  const w = window as unknown as { html2canvas?: unknown };
  if (w.html2canvas) return Promise.resolve();
  html2canvasLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/runner/html2canvas.min.js";
    s.onload = () => resolve();
    s.onerror = () => {
      html2canvasLoad = null;
      reject(new Error("Couldn't load the screenshot tool. Check your connection and run again."));
    };
    document.head.appendChild(s);
  });
  return html2canvasLoad;
}

/** Draws a sanitised snapshot in a script-less frame and screenshots it. */
async function screenshot(html: string): Promise<string> {
  await loadHtml2Canvas();
  const frame = document.createElement("iframe");
  // No allow-scripts: nothing in the page can run. allow-same-origin only lets this app read the layout.
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${FRAME_WIDTH}px;height:10px;border:0;visibility:hidden`;
  try {
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.srcdoc = sanitizeSnapshot(html);
      document.body.appendChild(frame);
    });
    await new Promise((r) => setTimeout(r, 400));
    const body = frame.contentDocument!.body;
    const h = Math.min(Math.max(frame.contentDocument!.documentElement.scrollHeight, body.scrollHeight, 200), 3000);
    frame.style.height = h + "px";
    const bg = getComputedStyle(body).backgroundColor;
    const canvas = await (window as unknown as { html2canvas: (el: HTMLElement, o: object) => Promise<HTMLCanvasElement> }).html2canvas(body, {
      backgroundColor: bg === "rgba(0, 0, 0, 0)" ? "#ffffff" : null,
      scale: 1.5,
      useCORS: true,
      logging: false,
      width: FRAME_WIDTH,
      height: h,
      windowWidth: FRAME_WIDTH,
      windowHeight: h,
    });
    return canvas.toDataURL("image/png");
  } finally {
    frame.remove();
  }
}

/** True when the text looks like a web page or fragment rather than a program. */
export function looksLikeWeb(code: string): boolean {
  return /^\s*(<!doctype\s+html|<html[\s>]|<(head|body|div|section|main|style|script|h[1-6]|p|ul|table|form|canvas|button|span)[\s>])/i.test(code);
}

/** Shows the page in a hidden sandboxed frame (no access to this site), collects its console and takes a screenshot. */
export function runWeb(opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    opts.onStatus?.("Opening the page…");
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${FRAME_WIDTH}px;height:640px;border:0;visibility:hidden`;
    const out: string[] = [];
    const err: string[] = [];
    let finished = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
    };
    const finish = (images: RunResult["images"], note?: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (note) err.push(note);
      resolve({
        ok: images.length > 0,
        stdout: out.join("\n"),
        stderr: err.join("\n"),
        images,
        engine: "browser",
        language: "web",
        durationMs: performance.now() - started,
      });
    };
    const timer = window.setTimeout(() => finish([], "The page took too long to finish loading (limit 20 s)."), WEB_TIMEOUT_MS);

    function onMessage(e: MessageEvent) {
      if (e.source !== frame.contentWindow || !e.data || e.data.rl !== 1) return;
      const { type, data } = e.data as { type: string; data: unknown };
      if (type === "out") out.push(String(data));
      else if (type === "err") err.push(String(data));
      else if (type === "snapshot") {
        if (!data) return finish([], "Couldn't read the finished page.");
        opts.onStatus?.("Taking a screenshot…");
        screenshot(String(data))
          .then((dataUrl) => finish([{ name: "Page output.png", dataUrl }]))
          .catch((e) => finish([], e instanceof Error ? e.message : "Couldn't take a screenshot of the page."));
      }
    }
    window.addEventListener("message", onMessage);
    opts.signal?.addEventListener("abort", () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new DOMException("Stopped", "AbortError"));
    });

    frame.srcdoc = buildWebDocument(opts.code);
    document.body.appendChild(frame);
    opts.onStatus?.("Running…");
  });
}
