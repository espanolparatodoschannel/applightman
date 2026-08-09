// [FIX M-3] Versión incrementada para forzar actualización del caché
const CACHE_NAME = 'lightman-cache-v81';

const CORE_URLS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/utils.js',
  './js/store.js',
  './js/ui.js',
  './js/charts.js',
  './js/api.js',
  './manifest.json'
];

// [FIX M-3] CDNs externos ahora también se guardan en caché para modo offline completo
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Los archivos core deben guardarse sí o sí
      return cache.addAll(CORE_URLS).then(() => {
        // Los CDNs son best-effort: si fallan, el SW se instala igual
        return Promise.allSettled(CDN_URLS.map(url => cache.add(url)));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('ServiceWorker: Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones a Google Scripts (permitir que el navegador las maneje directamente)
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - devolver respuesta cacheada
      if (response) {
        return response;
      }
      // Cache miss - ir a la red y cachear el resultado
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(error => {
        console.warn('ServiceWorker fetch failed, likely offline:', error);
        // El cache.match ya ha devuelto undefined si no estaba en cache
        // Así evitamos el "Uncaught (in promise)" en la consola
        throw error;
      });
    })
  );
});
