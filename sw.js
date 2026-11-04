/* Monk Mode Service Worker – v5 (App-Version 4.0) */
const CACHE = 'monk-mode-v5';
const ASSETS = ['./', './index.html', './styles.css', './store.js', './app.js', './sync.js', './vendor/supabase.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];
const SCOPE = new URL('./', self.location).pathname;           // z. B. /Monkmode/
const isOther = url => url.pathname.startsWith(SCOPE + 'english/'); // English-Daily-App hat einen eigenen Service Worker

self.addEventListener('install', e => {
  // neue Version sofort aktivieren (Daten liegen in localStorage/IndexedDB, nicht im Cache)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // nur eigene alte Caches löschen (nicht die der English-App)
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('monk-mode-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
// Network first (Updates kommen sofort), Cache als Offline-Fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || isOther(url)) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
