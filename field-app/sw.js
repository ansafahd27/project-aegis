const CACHE_NAME = "aegis-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/sync.js",
  "./manifest.json",
  "https://unpkg.com/dexie@latest/dist/dexie.js"
];

// Install: Cache all static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate for static, Network-First for API
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // API calls: Network first, no cache (handled by Sync Engine)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    }).catch(() => {
        // Fallback for navigation (if offline and not cached)
        if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
    })
  );
});
