/**
 * Cache Utility Service
 * Provides cache clearing functionality that can be used across the app
 */
export class CacheUtility {
  /**
   * Clear all application caches including service worker, browser storage, and MTA caches
   */
  static async clearAllCaches(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[CacheUtility] Clearing all caches...');
      console.log('[CacheUtility] Environment check:', {
        hasNavigator: typeof navigator !== 'undefined',
        hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        hasCaches: typeof caches !== 'undefined',
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasSessionStorage: typeof sessionStorage !== 'undefined',
        hasWindow: typeof window !== 'undefined'
      });
      
      // Clear service worker caches
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined') {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('[CacheUtility] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        // Unregister service worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('[CacheUtility] Unregistering service worker');
            return registration.unregister();
          })
        );
      }
      
      // Clear localStorage and sessionStorage
      if (typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        console.log('[CacheUtility] Cleared browser storage');
      }
      
      // Clear MTA service caches if available
      try {
        if (typeof window !== 'undefined' && (window as any).mtaService) {
          const mtaService = (window as any).mtaService;
          if (typeof mtaService.clearAllCaches === 'function') {
            mtaService.clearAllCaches();
            console.log('[CacheUtility] Cleared MTA service caches');
          }
        }
      } catch (mtaError) {
        console.warn('[CacheUtility] Could not clear MTA service caches:', mtaError);
      }
      
      console.log('[CacheUtility] All caches cleared successfully');
      return {
        success: true,
        message: 'All caches cleared successfully! The app will refresh with the latest data.'
      };
      
    } catch (error) {
      console.error('[CacheUtility] Failed to clear caches:', error);
      return {
        success: false,
        message: 'Failed to clear some caches. You may need to refresh the app manually.'
      };
    }
  }
  
  /**
   * Get cache information for debugging
   */
  static async getCacheInfo(): Promise<{
    serviceWorkerCaches: string[];
    storageSize: number;
    hasServiceWorker: boolean;
  }> {
    const info = {
      serviceWorkerCaches: [] as string[],
      storageSize: 0,
      hasServiceWorker: false
    };
    
    try {
      // Check service worker caches
      if (typeof caches !== 'undefined') {
        info.serviceWorkerCaches = await caches.keys();
      }
      if (typeof navigator !== 'undefined') {
        info.hasServiceWorker = 'serviceWorker' in navigator;
      }
      
      // Estimate storage size
      if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        info.storageSize = estimate.usage || 0;
      }
      
    } catch (error) {
      console.warn('[CacheUtility] Failed to get cache info:', error);
    }
    
    return info;
  }
}