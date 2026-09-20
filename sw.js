/* 오프라인 캐시: 처음 한 번 열어 두면 이후에는 인터넷 없이 실행된다 (HTTPS 또는 localhost 에서만 등록됨)
 * - 인터넷이 되면 항상 서버의 최신 파일을 받아 오고(캐시도 갱신), 안 되거나 4초 넘게 응답이 없으면 저장된 파일로 실행한다.
 * - 설치 때도 브라우저/서버(GitHub Pages max-age=600) 캐시를 거치지 않고 새로 받는다. */
const CACHE = 'tqa-tablet-v1.2.1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const NET_TIMEOUT_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(FILES.map((f) => fetch(new Request(f, { cache: 'reload' })).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return c.put(f, r); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req, { cache: 'no-cache' }),                       // 서버에 최신 여부를 확인 (변경 없으면 304 로 가볍게)
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT_MS)),
      ]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
      if (hit) return hit;
      throw err;
    }
  })());
});
