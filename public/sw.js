/**
 * Service Worker for CommuteX PWA
 * 
 * Implements offline functionality, caching, and background sync
 * Following CLAUDE.md principles for clean, focused implementation
 */

const CACHE_VERSION = 'v2-route-improvements';
const CACHE_NAME = `commutex-${CACHE_VERSION}`;
const OFFLINE_CACHE = `commutex-offline-${CACHE_VERSION}`;
const RUNTIME_CACHE = `commutex-runtime-${CACHE_VERSION}`;

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Runtime caching patterns
const CACHE_STRATEGIES = {
  api: 'networkFirst',
  assets: 'cacheFirst',
  pages: 'networkFirst'
};

// Cache TTL configurations (matching CacheManager)
const CACHE_TTL = {
  GTFS_DATA: 10 * 60 * 1000,     // 10 minutes
  SERVICE_ALERTS: 2 * 60 * 1000,  // 2 minutes
  ROUTES: 1 * 60 * 1000,          // 1 minute
  OFFLINE_ROUTES: 24 * 60 * 60 * 1000 // 24 hours for offline cache
};

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticAssets(request));
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(RUNTIME_CACHE);
      const responseClone = networkResponse.clone();
      
      // Add timestamp for TTL management
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      await cache.put(cacheKey, cachedResponse);
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    // Network failed, try cache
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isExpired = cachedAt && (Date.now() - parseInt(cachedAt)) > getCacheTTL(url.pathname);
      
      if (!isExpired) {
        console.log('[SW] Serving from cache:', cacheKey);
        return cachedResponse;
      } else {
        console.log('[SW] Cache expired for:', cacheKey);
        await cache.delete(cacheKey);
      }
    }
    
    // Return offline fallback for routes
    if (url.pathname.includes('routes') || url.pathname.includes('calculate')) {
      return getOfflineRouteFallback(request);
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable and no cached data',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`Navigation response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('[SW] Navigation network failed, serving cached app');
    
    // Serve cached app shell
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CommuteX - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>CommuteX</h1>
        <p>You're offline. Please check your connection and try again.</p>
        <button onclick="location.reload()">Retry</button>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function handleStaticAssets(request) {
  // Cache first for static assets
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    
    // Return empty response for failed static assets
    return new Response('', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

async function getOfflineRouteFallback(request) {
  const cache = await caches.open(OFFLINE_CACHE);
  const url = new URL(request.url);
  
  // Try to find cached routes for this origin/destination pair
  const cachedRoutes = await cache.match('offline-routes');
  
  if (cachedRoutes) {
    const data = await cachedRoutes.json();
    
    return new Response(JSON.stringify({
      routes: data.routes || [],
      lastUpdated: data.lastUpdated,
      isRealData: false,
      offlineMode: true,
      message: 'Showing cached route data. Connect to internet for real-time updates.'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Data': 'true'
      }
    });
  }
  
  return new Response(JSON.stringify({
    routes: [],
    error: 'No cached route data available offline',
    offlineMode: true,
    lastUpdated: new Date().toISOString()
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Data': 'true'
    }
  });
}

function getCacheTTL(pathname) {
  if (pathname.includes('gtfs') || pathname.includes('realtime')) {
    return CACHE_TTL.GTFS_DATA;
  }
  if (pathname.includes('alerts')) {
    return CACHE_TTL.SERVICE_ALERTS;
  }
  if (pathname.includes('routes')) {
    return CACHE_TTL.ROUTES;
  }
  return CACHE_TTL.GTFS_DATA; // Default
}

// Background sync for data updates
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'gtfs-data-sync') {
    event.waitUntil(syncGTFSData());
  } else if (event.tag === 'service-alerts-sync') {
    event.waitUntil(syncServiceAlerts());
  }
});

async function syncGTFSData() {
  try {
    console.log('[SW] Syncing GTFS data in background');
    
    // Fetch fresh GTFS data
    const response = await fetch('/api/gtfs/realtime');
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('/api/gtfs/realtime', response.clone());
      
      // Notify clients about update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'GTFS_DATA_UPDATED',
          timestamp: new Date().toISOString()
        });
      });
      
      console.log('[SW] GTFS data sync completed');
    }
  } catch (error) {
    console.error('[SW] GTFS data sync failed:', error);
  }
}

async function syncServiceAlerts() {
  try {
    console.log('[SW] Syncing service alerts in background');
    
    const response = await fetch('/api/alerts');
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('/api/alerts', response.clone());
      
      // Check for new alerts and send notifications
      const alertsData = await response.json();
      await processServiceAlerts(alertsData);
      
      console.log('[SW] Service alerts sync completed');
    }
  } catch (error) {
    console.error('[SW] Service alerts sync failed:', error);
  }
}

async function processServiceAlerts(alertsData) {
  if (!self.registration.showNotification) {
    return;
  }
  
  const alerts = alertsData.alerts || [];
  const severeAlerts = alerts.filter(alert => alert.severity === 'severe');
  
  for (const alert of severeAlerts) {
    await self.registration.showNotification('CommuteX Service Alert', {
      body: alert.alertText,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `alert-${alert.id}`,
      requireInteraction: true,
      data: {
        alert: alert,
        url: '/?action=alerts'
      }
    });
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'New transit update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'transit-update',
    data: data.data || { url: '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification('CommuteX', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Cache management utilities
async function cacheRouteData(routes, origin, destination) {
  const cache = await caches.open(OFFLINE_CACHE);
  const cacheKey = `route-${origin}-${destination}`;
  
  const data = {
    routes: routes,
    origin: origin,
    destination: destination,
    cachedAt: Date.now(),
    lastUpdated: new Date().toISOString()
  };
  
  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  }));
  
  console.log('[SW] Cached route data for offline access:', cacheKey);
}

// Expose cache function to main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_ROUTES') {
    const { routes, origin, destination } = event.data.payload;
    cacheRouteData(routes, origin, destination);
  }
});