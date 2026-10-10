/* Record Lab service worker: offline shell + fast repeat loads.
   - Static assets (/_next/static, icons, fonts, images): cache-first.
   - Pages: network-first, falling back to the last cached copy, then /offline.html.
   - Anything cross-origin (Firebase, Puter, CDNs) and non-GET requests go straight to the network. */
const VERSION = "v1";
const STATIC = `recordlab-static-${VERSION}`;
const PAGES = `recordlab-pages-${VERSION}`;
const SHELL = ["/", "/editor", "/dashboard", "/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/landing/") ||
    /\.(?:woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES);
          return (
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match("/editor")) ||
            (await cache.match("/offline.html")) ||
            Response.error()
          );
        })
    );
  }
});
