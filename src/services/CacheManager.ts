/**
 * Cache Manager for Performance Optimization
 * 
 * Following CLAUDE.md principles - clean, focused caching implementation
 * with short TTLs as requested: 10 minutes for GTFS data, 2 minutes for alerts, 5 minutes for health
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  backgroundRefreshes: number;
}

export interface PerformanceStats {
  apiResponseTimes: { [key: string]: number[] };
  cacheHitRates: { [key: string]: number };
  totalRequests: number;
  requestDeduplication: {
    duplicatesAvoided: number;
    activeRequests: number;
  };
  failedFeedAttempts: Array<{
    feedName: string;
    timestamp: number;
    backoffTime: number;
  }>;
  backgroundRefreshes: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = new Map<string, CacheStats>();
  private performanceStats: PerformanceStats;
  private pendingRequests = new Map<string, Promise<any>>();
  private backgroundRefreshPromises = new Map<string, Promise<void>>();
  
  // TTL configuration with short times as requested
  private readonly TTL_CONFIG = {
    GTFS_DATA: 10 * 60 * 1000,      // 10 minutes
    SERVICE_ALERTS: 2 * 60 * 1000,   // 2 minutes  
    FEED_HEALTH: 5 * 60 * 1000,      // 5 minutes
    ROUTE_CACHE: 1 * 60 * 1000       // 1 minute for route requests
  };
  
  // Background refresh threshold (refresh when 80% of TTL has passed)
  private readonly REFRESH_THRESHOLD = 0.8;

  constructor() {
    this.performanceStats = {
      apiResponseTimes: {},
      cacheHitRates: {},
      totalRequests: 0,
      requestDeduplication: {
        duplicatesAvoided: 0,
        activeRequests: 0
      },
      failedFeedAttempts: [],
      backgroundRefreshes: 0
    };
    
    // Initialize stats for different cache types (match the cache type strings)
    this.initializeCacheStats('gtfs');
    this.initializeCacheStats('alerts');
    this.initializeCacheStats('health');
    this.initializeCacheStats('routes');
  }

  private initializeCacheStats(cacheType: string): void {
    this.stats.set(cacheType, {
      hits: 0,
      misses: 0,
      evictions: 0,
      backgroundRefreshes: 0
    });
  }

  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    cacheType: 'gtfs' | 'alerts' | 'health' | 'routes' = 'gtfs'
  ): Promise<T> {
    const ttl = this.getTTLForType(cacheType);
    const cacheKey = `${cacheType}:${key}`;
    
    // Check for existing request to avoid duplication
    if (this.pendingRequests.has(cacheKey)) {
      this.performanceStats.requestDeduplication.duplicatesAvoided++;
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValid(cached)) {
      this.recordCacheHit(cacheType);
      cached.accessCount++;
      
      // Check if background refresh is needed
      if (this.shouldBackgroundRefresh(cached)) {
        this.triggerBackgroundRefresh(cacheKey, fetcher, cacheType);
      }
      
      return cached.data;
    }
    
    // Cache miss - fetch data
    this.recordCacheMiss(cacheType);
    
    const fetchPromise = this.fetchWithTiming(key, fetcher, cacheType);
    this.pendingRequests.set(cacheKey, fetchPromise);
    this.performanceStats.requestDeduplication.activeRequests++;
    
    try {
      const data = await fetchPromise;
      
      // Store in cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1
      });
      
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
      this.performanceStats.requestDeduplication.activeRequests--;
    }
  }

  private getTTLForType(cacheType: string): number {
    switch (cacheType) {
      case 'gtfs': return this.TTL_CONFIG.GTFS_DATA;
      case 'alerts': return this.TTL_CONFIG.SERVICE_ALERTS;
      case 'health': return this.TTL_CONFIG.FEED_HEALTH;
      case 'routes': return this.TTL_CONFIG.ROUTE_CACHE;
      default: return this.TTL_CONFIG.GTFS_DATA;
    }
  }

  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private shouldBackgroundRefresh(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > (entry.ttl * this.REFRESH_THRESHOLD);
  }

  private async triggerBackgroundRefresh<T>(
    cacheKey: string, 
    fetcher: () => Promise<T>, 
    cacheType: string
  ): Promise<void> {
    // Avoid multiple background refreshes for the same key
    if (this.backgroundRefreshPromises.has(cacheKey)) {
      return;
    }

    const refreshPromise = this.performBackgroundRefresh(cacheKey, fetcher, cacheType);
    this.backgroundRefreshPromises.set(cacheKey, refreshPromise);
    
    try {
      await refreshPromise;
    } finally {
      this.backgroundRefreshPromises.delete(cacheKey);
    }
  }

  private async performBackgroundRefresh<T>(
    cacheKey: string, 
    fetcher: () => Promise<T>, 
    cacheType: string
  ): Promise<void> {
    try {
      const data = await fetcher();
      const ttl = this.getTTLForType(cacheType);
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1
      });
      
      const stats = this.stats.get(cacheType);
      if (stats) {
        stats.backgroundRefreshes++;
      }
      this.performanceStats.backgroundRefreshes++;
      
    } catch (error) {
      console.warn(`[CACHE] Background refresh failed for ${cacheKey}:`, error);
    }
  }

  private async fetchWithTiming<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    cacheType: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fetcher();
      const duration = Date.now() - startTime;
      
      // Record timing
      if (!this.performanceStats.apiResponseTimes[cacheType]) {
        this.performanceStats.apiResponseTimes[cacheType] = [];
      }
      this.performanceStats.apiResponseTimes[cacheType].push(duration);
      
      // Keep only last 100 timings to prevent memory growth
      if (this.performanceStats.apiResponseTimes[cacheType].length > 100) {
        this.performanceStats.apiResponseTimes[cacheType].shift();
      }
      
      this.performanceStats.totalRequests++;
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailedAttempt(key, duration);
      throw error;
    }
  }

  private recordCacheHit(cacheType: string): void {
    const stats = this.stats.get(cacheType);
    if (stats) {
      stats.hits++;
    }
  }

  private recordCacheMiss(cacheType: string): void {
    const stats = this.stats.get(cacheType);
    if (stats) {
      stats.misses++;
    }
  }

  private recordFailedAttempt(feedName: string, backoffTime: number): void {
    this.performanceStats.failedFeedAttempts.push({
      feedName,
      timestamp: Date.now(),
      backoffTime
    });
    
    // Keep only last 50 failed attempts
    if (this.performanceStats.failedFeedAttempts.length > 50) {
      this.performanceStats.failedFeedAttempts.shift();
    }
  }

  getCacheStats(): { [key: string]: CacheStats } {
    const result: { [key: string]: CacheStats } = {};
    for (const [key, stats] of this.stats.entries()) {
      result[key] = { ...stats };
    }
    
    // Add legacy mappings for test compatibility
    if (result.gtfs) {
      result.gtfsData = result.gtfs;
    }
    if (result.alerts) {
      result.serviceAlerts = result.alerts;
    }
    
    return result;
  }

  getPerformanceStats(): PerformanceStats {
    // Calculate cache hit rates
    const cacheHitRates: { [key: string]: number } = {};
    for (const [cacheType, stats] of this.stats.entries()) {
      const total = stats.hits + stats.misses;
      cacheHitRates[cacheType] = total > 0 ? (stats.hits / total) * 100 : 0;
    }

    return {
      ...this.performanceStats,
      cacheHitRates,
      // Ensure we have the expected structure for tests
      apiResponseTimes: {
        ...this.performanceStats.apiResponseTimes,
        gtfsData: this.performanceStats.apiResponseTimes.gtfs || []
      }
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.backgroundRefreshPromises.clear();
    
    // Reset stats
    for (const [key] of this.stats.entries()) {
      this.initializeCacheStats(key);
    }
  }

  // Cleanup expired entries to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.cache.delete(key);
      const cacheType = key.split(':')[0];
      const stats = this.stats.get(cacheType);
      if (stats) {
        stats.evictions++;
      }
    }
  }
}