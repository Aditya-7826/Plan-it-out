// Plan it out service worker: lets the app open offline and be installed on a phone.
// Bump CACHE_VERSION whenever the precached files change.
const CACHE_VERSION = "v2";
const CACHE_NAME = `plan-it-out-${CACHE_VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "config.js",
  "app.js",
  "sync.js",
  "manifest.webmanifest",
  "assets/background.jpg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png",
  "assets/fonts/inter-latin.woff2",
  "assets/fonts/inter-latin-ext.woff2",
  "assets/fonts/inter-cyrillic.woff2",
  "assets/fonts/inter-cyrillic-ext.woff2",
  "assets/fonts/inter-greek.woff2",
  "assets/fonts/inter-greek-ext.woff2",
  "assets/fonts/inter-vietnamese.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("plan-it-out-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only same-origin GET requests. HEAD (the time check) and cross-origin requests
  // (the time APIs) are never intercepted, so the time is never served from cache.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Network first, falling back to the cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("index.html");
          return Response.error();
        })
      )
  );
});
