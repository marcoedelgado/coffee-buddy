// Network-first service worker: always try for the latest files, fall back to
// the cached copy when offline. Bump CACHE when the list of files changes.
// Google Fonts are cached the same way, so the app keeps its look offline.
const CACHE = 'coffee-buddy-v2';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/styles.css',
  'assets/app.js',
  'assets/ledger.js',
  'assets/dragon.png',
  'assets/cup.png',
  'assets/icon-180.png',
  'assets/icon-192.png',
];

const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const origin = new URL(req.url).origin;
  const cacheable = origin === self.location.origin || FONT_ORIGINS.includes(origin);
  if (req.method !== 'GET' || !cacheable) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
