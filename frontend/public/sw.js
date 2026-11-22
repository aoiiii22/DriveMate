/* DriveMate service worker: makes the app installable and shows a friendly page when offline.
 *
 * Rules (kept simple on purpose, so people never see stale data):
 *  - /api/* is NEVER cached: bookings, prices and photos always come live from the server.
 *  - Pages (navigation): network first; if offline, show /offline.html.
 *  - Built files (/assets/*, icons): cache first, they have unique names per version.
 * Bump CACHE when this file's rules change.
 */
const CACHE = 'drivemate-v1';
const PRECACHE = ['/offline.html', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // only our own GET requests
  if (url.pathname.startsWith('/api/')) return;                            // live data: never cached

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
