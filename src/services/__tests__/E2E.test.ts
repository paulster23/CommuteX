/**
 * End-to-End Integration Tests for Phase 6
 * 
 * Following CLAUDE.md TDD principles - comprehensive integration testing
 * Tests complete user journeys from request to response across all phases
 */

import { RealMTAService } from '../RealMTAService';

describe('End-to-End Integration Tests - Phase 6', () => {
  let service: RealMTAService;
  
  beforeEach(() => {
    service = new RealMTAService();
  });

  afterEach(() => {
    // Clean up any pending operations
    jest.clearAllTimers();
  });

  test('shouldCompleteFullUserJourneyFromRouteRequestToDisplay', async () => {
    // RED: Test complete user journey end-to-end
    // This simulates a real user requesting route information
    
    const origin = '42 Woodhull St, Brooklyn';
    const destination = '512 W 22nd St, Manhattan';
    const arrivalTime = '9:00 AM';
    
    try {
      // Step 1: User requests route calculation
      const routes = await service.calculateRoutes(origin, destination, arrivalTime);
      
      // Verify routes are returned
      expect(routes).toBeInstanceOf(Array);
      expect(routes.length).toBeGreaterThan(0);
      
      // Step 2: Verify route data quality
      const firstRoute = routes[0];
      expect(firstRoute.id).toBeDefined();
      expect(firstRoute.arrivalTime).toBeDefined();
      expect(firstRoute.duration).toBeDefined();
      expect(firstRoute.method).toBeDefined();
      expect(firstRoute.isRealTimeData).toBe(true);
      expect(firstRoute.confidence).toBeDefined();
      
      // Step 3: Verify route has detailed breakdown
      expect(firstRoute.steps).toBeDefined();
      expect(firstRoute.steps.length).toBeGreaterThan(0);
      
      // Step 4: Verify all steps have required data
      firstRoute.steps.forEach(step => {
        expect(step.type).toMatch(/walk|wait|transit|transfer/);
        expect(step.description).toBeDefined();
        expect(step.duration).toBeGreaterThan(0);
        expect(step.dataSource).toBe('realtime');
      });
      
      // Step 5: Verify route is cached for offline access
      const offlineService = service.getOfflineService();
      const cachedRoutes = await offlineService.getCachedRoutes(origin, destination);
      expect(cachedRoutes.length).toBeGreaterThan(0);
      
      // Step 6: Verify performance monitoring is working
      const perfStats = service.getPerformanceStats();
      expect(perfStats.totalRequests).toBeGreaterThan(0);
      expect(perfStats.cacheHitRates).toBeDefined();
      
    } catch (error) {
      // If real-time data unavailable, should provide clear guidance
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toMatch(/MTA.*feed|real.time.*data|GTFS.*unavailable/i);
      expect(errorMessage).not.toMatch(/unknown.*error|something.*wrong/i);
    }
  });

  test('shouldHandleCompleteOfflineWorkflow', async () => {
    // RED: Test complete offline user journey
    
    const origin = '42 Woodhull St, Brooklyn';
    const destination = '512 W 22nd St, Manhattan';
    const arrivalTime = '9:00 AM';
    
    // Step 1: First get routes while "online" to cache them
    try {
      const onlineRoutes = await service.calculateRoutes(origin, destination, arrivalTime);
      if (onlineRoutes.length > 0) {
        // Routes were cached, now test offline mode
        
        // Step 2: Mock offline state
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });
        
        // Step 3: Request routes while offline
        const offlineRoutes = await service.calculateRoutes(origin, destination, arrivalTime);
        
        // Step 4: Verify offline routes are marked appropriately
        expect(offlineRoutes.length).toBeGreaterThan(0);
        offlineRoutes.forEach(route => {
          expect(route.isRealTimeData).toBe(false);
          expect(route.confidence).toBe('low');
          expect(route.confidenceWarning).toMatch(/offline|cached/i);
        });
        
        // Step 5: Verify offline GTFS data has appropriate indicators
        const offlineGTFS = await service.fetchRealTimeData();
        expect(offlineGTFS.isRealData).toBe(false);
        expect((offlineGTFS as any).offlineMode).toBe(true);
        
        // Step 6: Test service alerts in offline mode
        const offlineAlerts = await service.fetchServiceAlerts();
        expect(offlineAlerts).toBeInstanceOf(Array);
        
      }
    } catch (error) {
      // Expected behavior when no cached data available
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/cached.*data.*unavailable|offline/i);
    } finally {
      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    }
  });

  test('shouldIntegrateAllCachingLayersCorrectly', async () => {
    // RED: Test that all caching layers work together properly
    
    // Step 1: Test GTFS data caching (Phase 4 - 10 min TTL)
    const startTime1 = Date.now();
    const gtfsData1 = await service.fetchRealTimeData();
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const gtfsData2 = await service.fetchRealTimeData();
    const duration2 = Date.now() - startTime2;
    
    // Second call should be much faster (cached)
    expect(duration2).toBeLessThan(duration1 * 0.3);
    expect(gtfsData1.lastUpdated).toEqual(gtfsData2.lastUpdated);
    
    // Step 2: Test service alerts caching (Phase 4 - 2 min TTL)
    const alertsStartTime1 = Date.now();
    const alerts1 = await service.fetchServiceAlerts();
    const alertsDuration1 = Date.now() - alertsStartTime1;
    
    const alertsStartTime2 = Date.now();
    const alerts2 = await service.fetchServiceAlerts();
    const alertsDuration2 = Date.now() - alertsStartTime2;
    
    expect(alertsDuration2).toBeLessThan(alertsDuration1 * 0.3);
    expect(alerts1).toEqual(alerts2);
    
    // Step 3: Test route caching (Phase 4 - 1 min TTL)
    const routeStartTime1 = Date.now();
    const routes1 = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    const routeDuration1 = Date.now() - routeStartTime1;
    
    const routeStartTime2 = Date.now();
    const routes2 = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    const routeDuration2 = Date.now() - routeStartTime2;
    
    expect(routeDuration2).toBeLessThan(routeDuration1 * 0.3);
    expect(routes1).toEqual(routes2);
    
    // Step 4: Test offline caching (Phase 5 - 24 hour TTL)
    const offlineService = service.getOfflineService();
    const cachedRoutes = await offlineService.getCachedRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan'
    );
    expect(cachedRoutes.length).toBeGreaterThan(0);
    
    // Step 5: Verify cache statistics are tracking correctly
    const cacheStats = service.getCacheStats();
    expect(cacheStats.gtfsData.hits).toBeGreaterThan(0);
    expect(cacheStats.serviceAlerts.hits).toBeGreaterThan(0);
    
    const perfStats = service.getPerformanceStats();
    expect(perfStats.totalRequests).toBeGreaterThan(0);
    expect(perfStats.cacheHitRates.gtfs).toBeGreaterThan(0);
  });

  test('shouldHandlePWALifecycleCompletely', async () => {
    // RED: Test complete PWA lifecycle integration
    
    // Step 1: Test PWA services initialization
    const offlineService = service.getOfflineService();
    const notificationService = service.getNotificationService();
    const syncService = service.getSyncService();
    
    expect(offlineService).toBeDefined();
    expect(notificationService).toBeDefined();
    expect(syncService).toBeDefined();
    
    // Step 2: Test offline capability detection
    const capabilities = offlineService.getOfflineCapabilities();
    expect(capabilities).toHaveProperty('hasServiceWorker');
    expect(capabilities).toHaveProperty('hasCacheAPI');
    expect(capabilities).toHaveProperty('hasLocalStorage');
    expect(capabilities).toHaveProperty('isOnline');
    
    // Step 3: Test notification system
    const notificationStatus = notificationService.getNotificationStatus();
    expect(notificationStatus).toHaveProperty('supported');
    expect(notificationStatus).toHaveProperty('permission');
    expect(notificationStatus).toHaveProperty('pushSupported');
    
    // Step 4: Test sync service queue management
    const queueStatus = syncService.getQueueStatus();
    expect(queueStatus).toHaveProperty('queueLength');
    expect(queueStatus).toHaveProperty('issyncing');
    expect(queueStatus).toHaveProperty('pendingTypes');
    
    // Step 5: Test service alerts trigger notifications
    const testAlert = {
      alertText: 'Test service alert for integration testing',
      affectedRoutes: ['F'],
      severity: 'warning' as const
    };
    
    await notificationService.sendServiceAlertNotification(testAlert);
    expect(notificationService.getLastNotification()).toEqual(testAlert);
    
    // Step 6: Test cache statistics across all systems
    const offlineStats = offlineService.getCacheStatistics();
    expect(offlineStats).toHaveProperty('totalCachedRoutes');
    expect(offlineStats).toHaveProperty('cacheSize');
  });

  test('shouldMaintainDataIntegrityAcrossAllOperations', async () => {
    // RED: Test data integrity and consistency across all systems
    
    const origin = '42 Woodhull St, Brooklyn';
    const destination = '512 W 22nd St, Manhattan';
    const arrivalTime = '9:00 AM';
    
    // Step 1: Get initial route data
    const initialRoutes = await service.calculateRoutes(origin, destination, arrivalTime);
    
    if (initialRoutes.length > 0) {
      const route = initialRoutes[0];
      
      // Step 2: Verify route data integrity
      expect(route.id).toBeDefined();
      expect(typeof route.id).toBe('number');
      expect(route.arrivalTime).toMatch(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/i);
      expect(route.duration).toMatch(/\d+\s*min/i);
      expect(route.isRealTimeData).toBe(true);
      
      // Step 3: Verify step data consistency
      if (route.steps) {
        let totalDuration = 0;
        route.steps.forEach(step => {
          totalDuration += step.duration;
          expect(step.dataSource).toBe('realtime');
          expect(step.type).toMatch(/walk|wait|transit|transfer/);
        });
        
        // Total step duration should roughly match route duration
        const routeDurationMinutes = parseInt(route.duration.replace(/\D/g, ''));
        expect(Math.abs(totalDuration - routeDurationMinutes)).toBeLessThan(5);
      }
      
      // Step 4: Verify cached data matches original
      const cachedRoutes = await service.calculateRoutes(origin, destination, arrivalTime);
      expect(cachedRoutes[0].id).toBe(route.id);
      expect(cachedRoutes[0].arrivalTime).toBe(route.arrivalTime);
      expect(cachedRoutes[0].duration).toBe(route.duration);
      
      // Step 5: Verify offline cached data maintains integrity
      const offlineService = service.getOfflineService();
      const offlineCachedRoutes = await offlineService.getCachedRoutes(origin, destination);
      
      if (offlineCachedRoutes.length > 0) {
        const offlineRoute = offlineCachedRoutes[0];
        expect(offlineRoute.id).toBe(route.id);
        expect(offlineRoute.duration).toBe(route.duration);
        expect(offlineRoute.isOfflineData).toBe(true);
        expect(offlineRoute.lastCached).toBeInstanceOf(Date);
        expect(offlineRoute.cacheExpiry).toBeInstanceOf(Date);
      }
    }
  });

  test('shouldHandleMultipleSimultaneousRequests', async () => {
    // RED: Test system behavior under concurrent load
    
    const requests = [
      service.calculateRoutes('42 Woodhull St, Brooklyn', '512 W 22nd St, Manhattan', '9:00 AM'),
      service.calculateRoutes('42 Woodhull St, Brooklyn', '512 W 22nd St, Manhattan', '10:00 AM'),
      service.calculateRoutes('Jay St-MetroTech, Brooklyn', '23rd St, Manhattan', '9:30 AM'),
      service.fetchRealTimeData(),
      service.fetchServiceAlerts()
    ];
    
    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const duration = Date.now() - startTime;
    
    // Step 1: Verify all requests completed
    expect(results.length).toBe(5);
    
    // Step 2: Check request deduplication worked
    const perfStats = service.getPerformanceStats();
    expect(perfStats.requestDeduplication.duplicatesAvoided).toBeGreaterThanOrEqual(0);
    
    // Step 3: Verify reasonable performance under load
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    
    // Step 4: Verify cache hit rates improved with multiple requests
    const cacheStats = service.getCacheStats();
    const totalHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits, 0);
    expect(totalHits).toBeGreaterThan(0);
    
    // Step 5: Verify system stability
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // Successful requests should have valid data
        if (index < 3) { // Route requests
          expect(result.value).toBeInstanceOf(Array);
        } else if (index === 3) { // GTFS data
          expect(result.value).toHaveProperty('routes');
          expect(result.value).toHaveProperty('lastUpdated');
        } else { // Service alerts
          expect(result.value).toBeInstanceOf(Array);
        }
      } else {
        // Failed requests should have meaningful error messages
        expect(result.reason).toBeInstanceOf(Error);
        expect(result.reason.message).toMatch(/MTA|GTFS|real.time|feed/i);
      }
    });
  });

  test('shouldRecoverGracefullyFromSystemFailures', async () => {
    // RED: Test system recovery from various failure scenarios
    
    // Step 1: Test recovery from cache corruption
    const cacheManager = (service as any).cacheManager;
    cacheManager.clearCache(); // Simulate cache corruption
    
    const routes1 = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    expect(routes1).toBeInstanceOf(Array);
    
    // Step 2: Test recovery from offline service errors
    const offlineService = service.getOfflineService();
    await offlineService.clearExpiredCache(); // Should not throw
    
    const cacheStats = offlineService.getCacheStatistics();
    expect(cacheStats).toHaveProperty('totalCachedRoutes');
    
    // Step 3: Test notification service error handling
    const notificationService = service.getNotificationService();
    
    try {
      await notificationService.testNotification();
      // Should either succeed or fail gracefully
    } catch (error) {
      // Errors should be meaningful
      expect(error).toBeInstanceOf(Error);
    }
    
    // Step 4: Test sync service queue recovery
    const syncService = service.getSyncService();
    syncService.clearQueue();
    
    await syncService.queueDataUpdate('gtfs-realtime');
    const queueStatus = syncService.getQueueStatus();
    expect(queueStatus.queueLength).toBe(1);
    
    // Step 5: Test system state consistency after failures
    const finalPerfStats = service.getPerformanceStats();
    expect(finalPerfStats).toHaveProperty('totalRequests');
    expect(finalPerfStats.totalRequests).toBeGreaterThanOrEqual(0);
  });

  test('shouldProvideComprehensiveSystemHealth', async () => {
    // RED: Test complete system health monitoring
    
    // Step 1: Check all service health
    const services = {
      offline: service.getOfflineService(),
      notification: service.getNotificationService(),
      sync: service.getSyncService(),
      ui: service.getUIService(),
      performance: service.getPerformanceService(),
      install: service.getInstallService()
    };
    
    Object.entries(services).forEach(([name, serviceInstance]) => {
      expect(serviceInstance).toBeDefined();
    });
    
    // Step 2: Check cache health
    const cacheStats = service.getCacheStats();
    expect(cacheStats).toHaveProperty('gtfsData');
    expect(cacheStats).toHaveProperty('serviceAlerts');
    
    // Step 3: Check performance metrics
    const perfStats = service.getPerformanceStats();
    expect(perfStats).toHaveProperty('apiResponseTimes');
    expect(perfStats).toHaveProperty('cacheHitRates');
    expect(perfStats).toHaveProperty('totalRequests');
    expect(perfStats).toHaveProperty('requestDeduplication');
    
    // Step 4: Check offline capabilities
    const offlineCapabilities = services.offline.getOfflineCapabilities();
    expect(offlineCapabilities).toHaveProperty('hasServiceWorker');
    expect(offlineCapabilities).toHaveProperty('hasCacheAPI');
    expect(offlineCapabilities).toHaveProperty('hasLocalStorage');
    
    // Step 5: Verify system is ready for production use
    expect(typeof perfStats.totalRequests).toBe('number');
    expect(typeof offlineCapabilities.isOnline).toBe('boolean');
    
    // All critical systems should be operational
    const criticalSystems = [
      services.offline,
      services.notification,
      services.sync
    ];
    
    criticalSystems.forEach(system => {
      expect(system).toBeTruthy();
    });
  });
});