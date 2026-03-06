const APP_CACHE = 'spendsense-app-v1';
const RUNTIME_CACHE = 'spendsense-runtime-v1';
const MODEL_CACHE = 'spendsense-models-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(['/'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, RUNTIME_CACHE, MODEL_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

const isModelHost = (url) =>
  url.hostname.includes('huggingface.co') ||
  url.hostname.includes('cdn-lfs.huggingface.co') ||
  url.hostname.includes('cdn.jsdelivr.net') ||
  url.hostname.includes('unpkg.com') ||
  url.hostname.includes('tessdata.projectnaptha.com');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppAsset =
    isSameOrigin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.wasm') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.json'));

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/')),
    );
    return;
  }

  if (isAppAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
    return;
  }

  if (isModelHost(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(MODEL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
  }
});
