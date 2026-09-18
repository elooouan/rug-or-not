/**
 * Offline support: network first, cache as a fallback. Every same-origin GET
 * that succeeds is copied into the cache, so a desk you've opened once still
 * opens on the train. Nothing is precached, so new builds show up as soon as
 * the network answers.
 */
const CACHE = 'rug-or-not-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then(
            (hit) =>
              hit || (req.mode === 'navigate' ? caches.match(self.registration.scope) : undefined),
          ),
      ),
  );
});
