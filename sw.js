// Offline support: the app shell is cached on install; exercise photos and fonts are cached the first time they load.
// Bump VERSION whenever you change app files so phones pick up the update.
const VERSION = "fc-v1";
const SHELL = ["./", "index.html", "styles.css", "manifest.webmanifest", "js/app.js", "js/ai.js", "js/store.js", "js/profile.js", "js/prompts.js",
  "js/foods.js", "js/exercises.js", "data/exercise-media.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "fc-media").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname === "generativelanguage.googleapis.com" || url.hostname.includes("youtube")) return; // never cache AI or video
  if (url.origin === location.origin){
    // app files: network first so updates show, cache when offline
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  if (url.hostname === "raw.githubusercontent.com" || url.hostname.endsWith("gstatic.com") || url.hostname === "fonts.googleapis.com"){
    e.respondWith(caches.open("fc-media").then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }))));
  }
});
