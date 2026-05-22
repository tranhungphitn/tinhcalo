const CACHE_NAME = "tinhcalo-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching App Shell and Assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Force activation immediately
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch events
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Bypass cache completely for API endpoints
  if (url.pathname.startsWith("/api/")) {
    return; // Handled by standard browser network
  }

  // 2. Network-First strategy for documents / root navigation requests
  if (
    event.request.mode === "navigate" || 
    url.pathname === "/" || 
    url.pathname === "/index.html"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Cache-First strategy for static assets (JS, CSS, images, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Fallback offline behavior if resource not found
      });
    })
  );
});
