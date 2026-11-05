const SHELL = "hanzi-shell-v11";
const DATA = "hanzi-data-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "lib/hanzi-writer.min.js", "lib/pinyin-pro.js",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== DATA && !k.startsWith("hanzi-audio")).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // leave Wikimedia lookups/recordings and any ranged media request to the browser
  if (req.headers.has("range") || req.destination === "audio" || req.destination === "video") return;
  if (url.origin !== self.location.origin && !url.hostname.endsWith("fonts.googleapis.com") && !url.hostname.endsWith("fonts.gstatic.com")) return;
  // character data and fonts: cache first, saved on first use
  if (url.pathname.includes("/data/") || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(DATA).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  // app shell: network first so updates arrive, cache when offline
  e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok && url.origin === self.location.origin) caches.open(SHELL).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html"))));
});
