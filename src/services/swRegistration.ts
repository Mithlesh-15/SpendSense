const SW_URL = '/sw.js';

export function registerOfflineServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((registration) => {
        console.info('[SpendSense][SW] registered', registration.scope);
      })
      .catch((error) => {
        console.error('[SpendSense][SW] registration failed', error);
      });
  });
}
