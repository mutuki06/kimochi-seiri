// オフライン用のキャッシュ。アプリ本体のファイルだけを扱い、記録データには触れない。
// ファイルを更新したら CACHE の番号を上げること。
const CACHE = 'kimochi-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/db.js',
  './js/data.js',
  './js/logic.js',
  './js/birds.js',
  './js/today.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// 同一オリジンの GET だけ。まずネットから取り（更新がすぐ反映される）、
// つながらないときだけキャッシュを返す。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request, { cache: 'no-cache' });
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch {
        return (await cache.match(e.request, { ignoreSearch: true }))
          || (e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
      }
    })
  );
});
