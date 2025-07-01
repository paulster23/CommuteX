const CACHE_NAME = 'commutex-v2-standalone';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '../assets/icon.png',
  '../assets/favicon.png',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network with fallback
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch(() => {
          // If fetch fails and it's a navigation request, return the cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw new Error('Network request failed and no cached version available');
        });
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for route updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(updateRouteData());
  }
});

async function updateRouteData() {
  try {
    // In a real app, this would fetch fresh MTA data
    console.log('Background sync: updating route data');
    
    // Simulate API call
    const response = await fetch('/api/routes');
    if (response.ok) {
      const data = await response.json();
      // Store updated data in IndexedDB or cache
      console.log('Route data updated:', data);
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}
