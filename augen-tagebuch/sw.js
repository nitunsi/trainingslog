// Service Worker "Augen-Tagebuch": Seite offline öffnen.
// Seite: Netz zuerst (3 s), sonst gespeicherte Kopie. Symbole: aus dem Speicher.
// Datenbank-Anfragen (Supabase, anderer Server) fasst der Service Worker nicht an.
const SHELL = "augen-shell-v1";
const PRECACHE = ["./", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("augen-shell-") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === "navigate"){
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try{
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
        if(res && res.ok) cache.put("./", res.clone());
        return res;
      }catch(err){
        return (await cache.match("./", { ignoreSearch: true })) || fetch(req);
      }
    })());
    return;
  }
  if(/\/icons\/|manifest\.webmanifest$/.test(url.pathname)){
    e.respondWith(caches.open(SHELL).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if(hit) return hit;
      const res = await fetch(req);
      if(res.ok) cache.put(req, res.clone());
      return res;
    }));
  }
});
