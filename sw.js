/* Service worker ASTI U9: membuat website bisa dipasang sebagai aplikasi (Android & iPhone).
 * Data dan tampilan SELALU diambil terbaru dari internet (tidak ada cache lama).
 * Hanya halaman "Tidak Ada Koneksi" yang disimpan untuk dipakai saat offline. */
const CACHE = 'asti-u9-offline-v1';
const OFFLINE = 'offline.html';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll([OFFLINE, 'assets/ikon/icon-192.png']);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  // Hanya navigasi halaman yang ditangani; permintaan lain (data Apps Script, gambar, CSS, JS) dibiarkan normal.
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return caches.match(OFFLINE);
  }));
});
