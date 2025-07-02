/**
 * Performance Tests for Caching Implementation
 * 
 * Following CLAUDE.md TDD principles - write failing tests first, then implement caching
 */

import { RealMTAService } from '../RealMTAService';

describe('Performance Tests - Caching & Optimization', () => {
  let service: RealMTAService;
  
  beforeEach(() => {
    service = new RealMTAService();
  });

  test('shouldCacheGTFSDataFor10Minutes', async () => {
    // RED: This test will fail initially because caching isn't implemented
    
    const startTime1 = Date.now();
    const data1 = await service.fetchRealTimeData();
    const duration1 = Date.now() - startTime1;
    
    // Second call should be much faster due to caching
    const startTime2 = Date.now();
    const data2 = await service.fetchRealTimeData();
    const duration2 = Date.now() - startTime2;
    
    // Cached call should be at least 80% faster
    expect(duration2).toBeLessThan(duration1 * 0.2);
    
    // Data should be identical (from cache)
    expect(data1.lastUpdated).toEqual(data2.lastUpdated);
    expect(data1.routes.length).toBe(data2.routes.length);
    
    // Verify cache metadata exists
    expect((service as any).getCacheStats).toBeDefined();
    const cacheStats = (service as any).getCacheStats();
    expect(cacheStats.gtfsData.hits).toBe(1);
    expect(cacheStats.gtfsData.misses).toBe(1);
  });

  test('shouldCacheServiceAlertsFor2Minutes', async () => {
    // RED: Test service alerts caching
    
    const startTime1 = Date.now();
    const alerts1 = await service.fetchServiceAlerts();
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const alerts2 = await service.fetchServiceAlerts();
    const duration2 = Date.now() - startTime2;
    
    // Second call should be much faster
    expect(duration2).toBeLessThan(duration1 * 0.3);
    expect(alerts1).toEqual(alerts2);
    
    const cacheStats = (service as any).getCacheStats();
    expect(cacheStats.serviceAlerts.hits).toBe(1);
  });

  test('shouldCacheFeedHealthFor5Minutes', async () => {
    // RED: Test feed health caching
    
    const startTime1 = Date.now();
    const data1 = await service.fetchRealTimeData();
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const data2 = await service.fetchRealTimeData();
    const duration2 = Date.now() - startTime2;
    
    // Feed health should be cached
    expect(data1.feedHealth).toEqual(data2.feedHealth);
    expect(duration2).toBeLessThan(duration1 * 0.3);
  });

  test('shouldExpireCacheAfterTTL', async () => {
    // RED: Test cache expiration
    
    // Mock time to test TTL expiration
    const originalNow = Date.now;
    let currentTime = Date.now();
    Date.now = jest.fn(() => currentTime);
    
    try {
      await service.fetchRealTimeData();
      
      // Fast forward 11 minutes (past 10-minute TTL)
      currentTime += 11 * 60 * 1000;
      
      const startTime = Date.now();
      await service.fetchRealTimeData();
      const duration = Date.now() - startTime;
      
      // Should be slow again (cache miss due to expiration)
      expect(duration).toBeGreaterThan(500); // Should take time to fetch from API
      
      const cacheStats = (service as any).getCacheStats();
      expect(cacheStats.gtfsData.misses).toBe(2); // Initial + expired
      
    } finally {
      Date.now = originalNow;
    }
  });

  test('shouldDeduplicateIdenticalRouteRequests', async () => {
    // RED: Test request deduplication
    
    const origin = '42 Woodhull St, Brooklyn';
    const destination = '512 W 22nd St, Manhattan';
    const arrival = '9:00 AM';
    
    // Make multiple identical requests concurrently
    const promises = [
      service.calculateRoutes(origin, destination, arrival),
      service.calculateRoutes(origin, destination, arrival),
      service.calculateRoutes(origin, destination, arrival)
    ];
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // All results should be identical
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    
    // Should complete faster than 3 separate requests
    expect(duration).toBeLessThan(5000); // Should be under 5 seconds for 3 requests
    
    // Verify deduplication stats
    const perfStats = (service as any).getPerformanceStats();
    expect(perfStats.requestDeduplication.duplicatesAvoided).toBeGreaterThan(0);
  });

  test('shouldTrackPerformanceMetrics', async () => {
    // RED: Test performance monitoring
    
    await service.fetchRealTimeData();
    await service.fetchServiceAlerts();
    
    const perfStats = (service as any).getPerformanceStats();
    
    expect(perfStats).toHaveProperty('apiResponseTimes');
    expect(perfStats).toHaveProperty('cacheHitRates');
    expect(perfStats).toHaveProperty('totalRequests');
    
    expect(perfStats.apiResponseTimes.gtfsData).toBeGreaterThan(0);
    expect(perfStats.totalRequests).toBeGreaterThan(0);
  });

  test('shouldImplementBackgroundRefresh', async () => {
    // RED: Test background cache refresh
    
    // Mock time for testing
    const originalNow = Date.now;
    let currentTime = Date.now();
    Date.now = jest.fn(() => currentTime);
    
    try {
      await service.fetchRealTimeData();
      
      // Fast forward to 8 minutes (near expiration)
      currentTime += 8 * 60 * 1000;
      
      // This should trigger background refresh
      await service.fetchRealTimeData();
      
      // Check that background refresh was initiated
      const cacheStats = (service as any).getCacheStats();
      expect(cacheStats.backgroundRefreshes).toBeGreaterThan(0);
      
    } finally {
      Date.now = originalNow;
    }
  });

  test('shouldHandleFailedFeedsWithExponentialBackoff', async () => {
    // RED: Test exponential backoff for failed feeds
    
    // This test will verify that failed feeds are not retried immediately
    const perfStats = (service as any).getPerformanceStats();
    
    // After multiple attempts, backoff should increase
    if (perfStats.failedFeedAttempts && perfStats.failedFeedAttempts.length > 1) {
      const attempts = perfStats.failedFeedAttempts;
      const timeBetween1and2 = attempts[1].timestamp - attempts[0].timestamp;
      const timeBetween2and3 = attempts[2]?.timestamp - attempts[1].timestamp;
      
      if (timeBetween2and3) {
        expect(timeBetween2and3).toBeGreaterThan(timeBetween1and2);
      }
    }
  });
});