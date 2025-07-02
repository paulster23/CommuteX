/**
 * Offline Service for PWA functionality
 * 
 * Following CLAUDE.md principles - clean, focused offline data management
 * Integrates with service worker for cached route data
 */

import { Route, GTFSData, ServiceAlert } from './RealMTAService';

export interface OfflineRoute extends Route {
  isOfflineData: true;
  lastCached: Date;
  cacheExpiry: Date;
}

export interface OfflineData {
  routes: OfflineRoute[];
  alerts: ServiceAlert[];
  lastSyncAttempt: Date;
  offlineMode: boolean;
}

export class OfflineService {
  private readonly OFFLINE_CACHE_KEY = 'commutex-offline-data';
  private readonly ROUTE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ALERT_CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours
  
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initializeServiceWorker();
  }

  async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[OfflineService] Service worker registered');
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
      } catch (error) {
        console.error('[OfflineService] Service worker registration failed:', error);
      }
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'GTFS_DATA_UPDATED':
        console.log('[OfflineService] GTFS data updated in background');
        this.notifyDataUpdate('gtfs');
        break;
        
      case 'SERVICE_ALERTS_UPDATED':
        console.log('[OfflineService] Service alerts updated in background');
        this.notifyDataUpdate('alerts');
        break;
    }
  }

  private notifyDataUpdate(dataType: string): void {
    // Notify UI components about data updates (only in browser environment)
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('offlineDataUpdate', {
        detail: { dataType, timestamp: new Date() }
      }));
    }
  }

  async isOfflineCapable(): Promise<boolean> {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'caches' in window;
  }

  async cacheRoutes(routes: Route[], origin: string, destination: string): Promise<void> {
    if (!await this.isOfflineCapable()) {
      return;
    }

    const offlineRoutes: OfflineRoute[] = routes.map(route => ({
      ...route,
      isOfflineData: true,
      lastCached: new Date(),
      cacheExpiry: new Date(Date.now() + this.ROUTE_CACHE_TTL),
      confidenceWarning: 'This route uses cached data and may not reflect current conditions.'
    }));

    // Store in localStorage for quick access (if available)
    if (typeof localStorage !== 'undefined') {
      const cacheData = {
        routes: offlineRoutes,
        origin,
        destination,
        cachedAt: new Date().toISOString()
      };

      localStorage.setItem(`${this.OFFLINE_CACHE_KEY}-${origin}-${destination}`, JSON.stringify(cacheData));
    }

    // Also store in service worker cache (if available)
    if (this.serviceWorkerRegistration && typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_ROUTES',
        payload: { routes: offlineRoutes, origin, destination }
      });
    }

    console.log('[OfflineService] Cached routes for offline access:', { origin, destination, count: routes.length });
  }

  async getCachedRoutes(origin: string, destination: string): Promise<OfflineRoute[]> {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const cacheKey = `${this.OFFLINE_CACHE_KEY}-${origin}-${destination}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return [];
      }

      const parsed = JSON.parse(cachedData);
      const routes: OfflineRoute[] = parsed.routes || [];

      // Filter out expired routes
      const now = new Date();
      const validRoutes = routes.filter(route => {
        const expiry = new Date(route.cacheExpiry);
        return expiry > now;
      });

      if (validRoutes.length !== routes.length) {
        // Some routes expired, update cache
        if (validRoutes.length > 0) {
          parsed.routes = validRoutes;
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
        } else {
          localStorage.removeItem(cacheKey);
        }
      }

      return validRoutes;

    } catch (error) {
      console.error('[OfflineService] Error retrieving cached routes:', error);
      return [];
    }
  }

  async getAllCachedRoutes(): Promise<{ origin: string; destination: string; routes: OfflineRoute[] }[]> {
    const cachedRoutes: { origin: string; destination: string; routes: OfflineRoute[] }[] = [];
    
    // Only access localStorage in browser environment
    if (typeof localStorage === 'undefined') {
      return cachedRoutes;
    }
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(this.OFFLINE_CACHE_KEY)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.routes && data.origin && data.destination) {
            cachedRoutes.push({
              origin: data.origin,
              destination: data.destination,
              routes: data.routes
            });
          }
        } catch (error) {
          console.error('[OfflineService] Error parsing cached route data:', error);
        }
      }
    }
    
    return cachedRoutes;
  }

  async clearExpiredCache(): Promise<void> {
    // Only access localStorage in browser environment
    if (typeof localStorage === 'undefined') {
      return;
    }

    const now = new Date();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(this.OFFLINE_CACHE_KEY)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.routes) {
            const hasValidRoutes = data.routes.some((route: OfflineRoute) => {
              const expiry = new Date(route.cacheExpiry);
              return expiry > now;
            });
            
            if (!hasValidRoutes) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          keysToRemove.push(key); // Remove corrupted data
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log('[OfflineService] Cleared expired cache entries:', keysToRemove.length);
    }
  }

  async getOfflineData(): Promise<OfflineData> {
    const allCachedRoutes = await this.getAllCachedRoutes();
    const flatRoutes = allCachedRoutes.flatMap(cache => cache.routes);
    
    return {
      routes: flatRoutes,
      alerts: [], // Service alerts would be cached separately
      lastSyncAttempt: new Date(),
      offlineMode: !navigator.onLine
    };
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async canProvideOfflineRoutes(origin: string, destination: string): Promise<boolean> {
    const cachedRoutes = await this.getCachedRoutes(origin, destination);
    return cachedRoutes.length > 0;
  }

  getOfflineCapabilities(): {
    hasServiceWorker: boolean;
    hasCacheAPI: boolean;
    hasLocalStorage: boolean;
    isOnline: boolean;
  } {
    return {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasCacheAPI: 'caches' in window,
      hasLocalStorage: 'localStorage' in window,
      isOnline: navigator.onLine
    };
  }

  // Hook for when network status changes
  setupNetworkListeners(): void {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        console.log('[OfflineService] Network came online');
        this.handleNetworkOnline();
      });

      window.addEventListener('offline', () => {
        console.log('[OfflineService] Network went offline');
        this.handleNetworkOffline();
      });
    }
  }

  private handleNetworkOnline(): void {
    // Trigger background sync when network comes back
    if (this.serviceWorkerRegistration && typeof window !== 'undefined' && 'ServiceWorkerRegistration' in window && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.serviceWorkerRegistration.sync.register('gtfs-data-sync');
      this.serviceWorkerRegistration.sync.register('service-alerts-sync');
    }

    // Notify UI that network is back
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('networkStatusChange', {
        detail: { online: true, timestamp: new Date() }
      }));
    }
  }

  private handleNetworkOffline(): void {
    // Notify UI that network is offline
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('networkStatusChange', {
        detail: { online: false, timestamp: new Date() }
      }));
    }
  }

  async preloadCriticalRoutes(routePairs: Array<{ origin: string; destination: string }>): Promise<void> {
    // This would be called to preload commonly used routes for offline access
    console.log('[OfflineService] Preloading critical routes for offline access:', routePairs.length);
    
    // Implementation would fetch and cache these routes
    // This is a placeholder for future enhancement
  }

  getCacheStatistics(): {
    totalCachedRoutes: number;
    cacheSize: string;
    oldestCache: Date | null;
    newestCache: Date | null;
  } {
    let totalRoutes = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;
    let totalSize = 0;

    // Only access localStorage in browser environment
    if (typeof localStorage === 'undefined') {
      return {
        totalCachedRoutes: 0,
        cacheSize: '0 KB',
        oldestCache: null,
        newestCache: null
      };
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(this.OFFLINE_CACHE_KEY)) {
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
        
        try {
          const data = JSON.parse(value);
          if (data.routes) {
            totalRoutes += data.routes.length;
            
            const cacheDate = new Date(data.cachedAt);
            if (!oldestDate || cacheDate < oldestDate) {
              oldestDate = cacheDate;
            }
            if (!newestDate || cacheDate > newestDate) {
              newestDate = cacheDate;
            }
          }
        } catch (error) {
          // Ignore corrupted cache entries
        }
      }
    }

    return {
      totalCachedRoutes: totalRoutes,
      cacheSize: `${Math.round(totalSize / 1024)} KB`,
      oldestCache: oldestDate,
      newestCache: newestDate
    };
  }
}