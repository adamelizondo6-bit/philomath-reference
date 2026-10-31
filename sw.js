/* Philomath Reference service worker.
   Strategy: network first, cache fallback. Online you always get the newest files; offline you get
   the last copy that loaded. Bump VERSION whenever files change so old caches are dropped. */
var VERSION = '2026-10-31.5';
var CACHE = 'pmref-' + VERSION;
var PRECACHE = [
  './', './index.html', './manifest.webmanifest',
  './assets/app.css', './assets/app.js', './assets/mustknows.js', './assets/drills.js',
  './assets/questions.js', './assets/questions-verbal.js', './assets/practice.js', './assets/icon.svg'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
