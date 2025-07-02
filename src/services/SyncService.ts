/**
 * Sync Service for background data synchronization
 * 
 * Following CLAUDE.md principles - clean, focused sync management
 * Handles background sync when network connection is restored
 */

export interface SyncQueueItem {
  id: string;
  type: 'gtfs-realtime' | 'service-alerts' | 'route-cache' | 'feed-health';
  priority: 'high' | 'medium' | 'low';
  data?: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  updatedFeeds: string[];
  errors: string[];
  syncedAt: Date;
  duration: number;
}

export class SyncService {
  private syncQueue: SyncQueueItem[] = [];
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private issyncing = false;
  private readonly MAX_RETRY_DELAY = 30000; // 30 seconds
  private readonly SYNC_TIMEOUT = 120000; // 2 minutes

  constructor() {
    this.initializeServiceWorker();
    this.loadQueueFromStorage();
    this.setupSyncListeners();
  }

  async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        console.log('[SyncService] Service worker ready for background sync');
      } catch (error) {
        console.error('[SyncService] Service worker initialization failed:', error);
      }
    }
  }

  private loadQueueFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.syncQueue = [];
      return;
    }

    try {
      const saved = localStorage.getItem('commutex-sync-queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.syncQueue = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        console.log('[SyncService] Loaded sync queue from storage:', this.syncQueue.length);
      }
    } catch (error) {
      console.error('[SyncService] Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveQueueToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('commutex-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('[SyncService] Error saving sync queue:', error);
    }
  }

  private setupSyncListeners(): void {
    // Only set up listeners in browser environment with functioning event listeners
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      // Listen for network status changes
      window.addEventListener('online', () => {
        console.log('[SyncService] Network online, triggering sync');
        this.triggerBackgroundSync();
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      // Listen for visibility changes (app comes to foreground)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine && this.syncQueue.length > 0) {
          console.log('[SyncService] App visible and online, checking sync queue');
          this.executePendingSync();
        }
      });
    }
  }

  async queueDataUpdate(type: SyncQueueItem['type'], data?: any, priority: SyncQueueItem['priority'] = 'medium'): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `${type}-${Date.now()}`,
      type,
      priority,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.getMaxRetriesForType(type)
    };

    // Remove any existing items of the same type to avoid duplicates
    this.syncQueue = this.syncQueue.filter(item => item.type !== type);
    
    // Insert based on priority
    if (priority === 'high') {
      this.syncQueue.unshift(queueItem);
    } else {
      this.syncQueue.push(queueItem);
    }

    this.saveQueueToStorage();
    console.log('[SyncService] Queued data update:', type, priority);

    // Try immediate sync if online
    if (navigator.onLine) {
      this.executePendingSync();
    } else {
      // Register for background sync when network returns
      this.registerBackgroundSync(type);
    }
  }

  private getMaxRetriesForType(type: SyncQueueItem['type']): number {
    switch (type) {
      case 'gtfs-realtime':
        return 3;
      case 'service-alerts':
        return 5; // More retries for critical alerts
      case 'route-cache':
        return 2;
      case 'feed-health':
        return 2;
      default:
        return 3;
    }
  }

  async registerBackgroundSync(type: string): Promise<void> {
    if (!this.serviceWorkerRegistration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.log('[SyncService] Background sync not supported');
      return;
    }

    try {
      await this.serviceWorkerRegistration.sync.register(`${type}-sync`);
      console.log('[SyncService] Registered background sync:', type);
    } catch (error) {
      console.error('[SyncService] Failed to register background sync:', error);
    }
  }

  async triggerBackgroundSync(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    const uniqueTypes = [...new Set(this.syncQueue.map(item => item.type))];
    
    for (const type of uniqueTypes) {
      await this.registerBackgroundSync(type);
    }
  }

  async executePendingSync(): Promise<SyncResult> {
    if (this.issyncing || this.syncQueue.length === 0) {
      return {
        success: true,
        updatedFeeds: [],
        errors: [],
        syncedAt: new Date(),
        duration: 0
      };
    }

    this.issyncing = true;
    const startTime = Date.now();
    const updatedFeeds: string[] = [];
    const errors: string[] = [];

    console.log('[SyncService] Starting sync execution, queue length:', this.syncQueue.length);

    try {
      // Process high priority items first
      const sortedQueue = this.syncQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const item of sortedQueue) {
        try {
          const success = await this.syncDataItem(item);
          
          if (success) {
            updatedFeeds.push(item.type);
            this.removeFromQueue(item.id);
          } else {
            item.retryCount++;
            if (item.retryCount >= item.maxRetries) {
              errors.push(`${item.type}: Max retries exceeded`);
              this.removeFromQueue(item.id);
            } else {
              // Schedule for retry with exponential backoff
              const delay = Math.min(1000 * Math.pow(2, item.retryCount), this.MAX_RETRY_DELAY);
              setTimeout(() => {
                if (navigator.onLine) {
                  this.executePendingSync();
                }
              }, delay);
            }
          }
        } catch (error) {
          errors.push(`${item.type}: ${(error as Error).message}`);
          item.retryCount++;
          
          if (item.retryCount >= item.maxRetries) {
            this.removeFromQueue(item.id);
          }
        }
      }

      this.saveQueueToStorage();

    } finally {
      this.issyncing = false;
    }

    const duration = Date.now() - startTime;
    const result: SyncResult = {
      success: errors.length === 0,
      updatedFeeds,
      errors,
      syncedAt: new Date(),
      duration
    };

    console.log('[SyncService] Sync execution completed:', result);
    
    // Notify UI about sync completion
    window.dispatchEvent(new CustomEvent('syncCompleted', {
      detail: result
    }));

    return result;
  }

  private async syncDataItem(item: SyncQueueItem): Promise<boolean> {
    switch (item.type) {
      case 'gtfs-realtime':
        return await this.syncGTFSData();
      case 'service-alerts':
        return await this.syncServiceAlerts();
      case 'route-cache':
        return await this.syncRouteCache(item.data);
      case 'feed-health':
        return await this.syncFeedHealth();
      default:
        console.warn('[SyncService] Unknown sync type:', item.type);
        return false;
    }
  }

  private async syncGTFSData(): Promise<boolean> {
    try {
      console.log('[SyncService] Syncing GTFS realtime data');
      
      const response = await fetch('/api/gtfs/realtime', {
        signal: AbortSignal.timeout(this.SYNC_TIMEOUT)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update any cached data
        if ('caches' in window) {
          const cache = await caches.open('commutex-runtime-v1');
          await cache.put('/api/gtfs/realtime', response.clone());
        }
        
        console.log('[SyncService] GTFS data sync successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SyncService] GTFS data sync failed:', error);
      return false;
    }
  }

  private async syncServiceAlerts(): Promise<boolean> {
    try {
      console.log('[SyncService] Syncing service alerts');
      
      const response = await fetch('/api/alerts', {
        signal: AbortSignal.timeout(this.SYNC_TIMEOUT)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update cached alerts
        if ('caches' in window) {
          const cache = await caches.open('commutex-runtime-v1');
          await cache.put('/api/alerts', response.clone());
        }
        
        console.log('[SyncService] Service alerts sync successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SyncService] Service alerts sync failed:', error);
      return false;
    }
  }

  private async syncRouteCache(routeData?: any): Promise<boolean> {
    try {
      console.log('[SyncService] Syncing route cache');
      
      // This would sync any pending route calculations or updates
      // Implementation depends on specific route caching strategy
      
      return true;
    } catch (error) {
      console.error('[SyncService] Route cache sync failed:', error);
      return false;
    }
  }

  private async syncFeedHealth(): Promise<boolean> {
    try {
      console.log('[SyncService] Syncing feed health data');
      
      const response = await fetch('/api/feed-health', {
        signal: AbortSignal.timeout(this.SYNC_TIMEOUT)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update cached feed health
        if ('caches' in window) {
          const cache = await caches.open('commutex-runtime-v1');
          await cache.put('/api/feed-health', response.clone());
        }
        
        console.log('[SyncService] Feed health sync successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SyncService] Feed health sync failed:', error);
      return false;
    }
  }

  private removeFromQueue(id: string): void {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
  }

  getQueuedUpdates(): string[] {
    return this.syncQueue.map(item => item.type);
  }

  getQueueStatus(): {
    queueLength: number;
    issyncing: boolean;
    pendingTypes: string[];
    nextSync: Date | null;
  } {
    const nextSync = this.syncQueue.length > 0 
      ? new Date(Math.min(...this.syncQueue.map(item => item.timestamp.getTime())))
      : null;

    return {
      queueLength: this.syncQueue.length,
      issyncing: this.issyncing,
      pendingTypes: [...new Set(this.syncQueue.map(item => item.type))],
      nextSync
    };
  }

  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueueToStorage();
    console.log('[SyncService] Sync queue cleared');
  }

  // Force immediate sync (for testing or manual triggers)
  async forceSyncNow(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error('Cannot force sync while offline');
    }

    console.log('[SyncService] Forcing immediate sync');
    return await this.executePendingSync();
  }
}