/* Service worker LABSOUMA: hanya cangkang aplikasi (halaman dan berkas statis sama-origin) agar aplikasi terbuka saat sinyal buruk.
 * TIDAK menyentuh /api/*, Firebase/Google, atau permintaan selain GET: data soal tetap dari Firestore (yang punya cache sendiri)
 * dan tidak pernah disajikan dari cache di sini. Naikkan VERSI bila logika berkas ini berubah. */
const VERSI = 'labsouma-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('labsouma-') && k !== VERSI) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/') || u.pathname === '/sw.js') return;

  // Halaman: jaringan dulu (selalu versi terbaru), cadangan dari cache bila offline.
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(r);
        if (res.ok) (await caches.open(VERSI)).put('/', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('/')) || new Response('Anda sedang offline dan halaman belum pernah dibuka di perangkat ini.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Berkas statis (nama berkas berhash dari Vite, ikon, manifest): cache dulu, perbarui di belakang layar.
  e.respondWith((async () => {
    const cache = await caches.open(VERSI);
    const ada = await cache.match(r);
    const jaringan = fetch(r).then((res) => { if (res.ok && res.type === 'basic') cache.put(r, res.clone()); return res; }).catch(() => null);
    return ada || (await jaringan) || new Response('', { status: 504 });
  })());
});
