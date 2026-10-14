// Service Worker "Training": App offline öffnen und schneller starten.
// - App-Seite: Netz zuerst (kurzes Zeitlimit), sonst gespeicherte Kopie -> Updates kommen an, offline geht es trotzdem.
// - Schriften, Bibliothek, Symbole: aus dem Speicher (ändern sich nicht; Bibliothek hat die Version im Dateinamen).
// - Datenbank-Anfragen (anderer Server) fasst der Service Worker nicht an: Lese-Cache und Warteschlange liegen in der Seite.
const SHELL = "training-shell-v1";
const PRECACHE = [
  "app.html", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/space-grotesk-500-700-latin.woff2", "fonts/inter-400-600-latin.woff2",
  "fonts/ibm-plex-mono-500-latin.woff2", "fonts/ibm-plex-mono-600-latin.woff2",
  "vendor/supabase-2.117.3.js",
];
const STATIC_RE = /\/(fonts|vendor|icons)\/|manifest\.webmanifest$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("training-shell-") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, fallbackKey){
  const cache = await caches.open(SHELL);
  try{
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    if(res && res.ok) cache.put(fallbackKey, res.clone());
    return res;
  }catch(e){
    const hit = await cache.match(fallbackKey, { ignoreSearch: true });
    if(hit) return hit;
    return fetch(req);   // kein Speicher: normaler Versuch (darf scheitern)
  }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === "navigate" || url.pathname.endsWith("/app.html") || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")){
    e.respondWith(networkFirst(req, "app.html"));
    return;
  }
  if(STATIC_RE.test(url.pathname)){
    e.respondWith(caches.open(SHELL).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if(hit) return hit;
      const res = await fetch(req);
      if(res.ok) cache.put(req, res.clone());
      return res;
    }));
  }
});
