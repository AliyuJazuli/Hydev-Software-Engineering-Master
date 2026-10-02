// HYDEV SE service worker - minimal pass-through (no offline caching yet).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', () => {
  // Intentionally no-op: network requests pass straight through.
  // A future revision could add a cache-first strategy for static assets
  // if offline support becomes a requirement.
});
