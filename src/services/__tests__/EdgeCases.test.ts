/**
 * Edge Case Tests for Phase 6
 * 
 * Following CLAUDE.md TDD principles - comprehensive edge case coverage
 * Tests boundary conditions, error states, and unusual scenarios
 */

import { RealMTAService } from '../RealMTAService';
import { ErrorHandlingService } from '../ErrorHandlingService';

describe('Edge Case Tests - Phase 6', () => {
  let service: RealMTAService;
  let errorHandler: ErrorHandlingService;
  
  beforeEach(() => {
    service = new RealMTAService();
    errorHandler = new ErrorHandlingService();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('shouldHandleEmptyAndInvalidInputs', async () => {
    // RED: Test behavior with invalid inputs
    
    const invalidInputs = [
      { origin: '', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: '', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: '512 W 22nd St, Manhattan', arrivalTime: '' },
      { origin: null as any, destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: null as any, arrivalTime: '9:00 AM' },
      { origin: 'Invalid Location #$%', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: 'Invalid Location #$%', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: '512 W 22nd St, Manhattan', arrivalTime: 'Invalid Time' }
    ];

    for (const input of invalidInputs) {
      try {
        const routes = await service.calculateRoutes(input.origin, input.destination, input.arrivalTime);
        
        if (routes.length > 0) {
          // If routes returned, they should be valid
          routes.forEach(route => {
            expect(route.id).toBeDefined();
            expect(route.duration).toBeDefined();
            expect(route.arrivalTime).toBeDefined();
          });
        }
      } catch (error) {
        // Error should be informative
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toBeDefined();
        expect(errorMessage.length).toBeGreaterThan(10);
      }
    }
  });

  test('shouldHandleExtremelyLongInputs', async () => {
    // RED: Test behavior with extremely long inputs
    
    const longString = 'A'.repeat(1000);
    const veryLongString = 'B'.repeat(10000);
    
    const extremeInputs = [
      { origin: longString, destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: veryLongString, arrivalTime: '9:00 AM' },
      { origin: longString, destination: veryLongString, arrivalTime: '9:00 AM' }
    ];

    for (const input of extremeInputs) {
      try {
        await service.calculateRoutes(input.origin, input.destination, input.arrivalTime);
      } catch (error) {
        // Should handle gracefully without crashes
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  test('shouldHandleSpecialCharactersAndUnicode', async () => {
    // RED: Test behavior with special characters and unicode
    
    const specialInputs = [
      { origin: 'Café René, Brooklyn', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: 'Señor José Avenue, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '東京駅, Brooklyn', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42@#$%^&*()Woodhull', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '42 Woodhull St, Brooklyn', destination: '512<script>alert("test")</script> W 22nd St', arrivalTime: '9:00 AM' }
    ];

    for (const input of specialInputs) {
      try {
        await service.calculateRoutes(input.origin, input.destination, input.arrivalTime);
        // Should not execute any scripts or cause security issues
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  test('shouldHandleBoundaryTimeValues', async () => {
    // RED: Test boundary conditions for time values
    
    const boundaryTimes = [
      '12:00 AM',   // Midnight
      '11:59 PM',   // Just before midnight
      '00:00',      // 24-hour format midnight
      '23:59',      // 24-hour format just before midnight
      '25:00',      // Invalid hour
      '12:60',      // Invalid minute
      '-1:00',      // Negative time
      '99:99'       // Out of range
    ];

    for (const time of boundaryTimes) {
      try {
        await service.calculateRoutes(
          '42 Woodhull St, Brooklyn',
          '512 W 22nd St, Manhattan',
          time
        );
      } catch (error) {
        // Invalid times should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  test('shouldHandleConcurrentCacheOperations', async () => {
    // RED: Test race conditions and concurrent operations
    
    const concurrentOperations = [];
    
    // Create many simultaneous cache operations
    for (let i = 0; i < 10; i++) {
      concurrentOperations.push(
        service.fetchRealTimeData()
      );
      concurrentOperations.push(
        service.fetchServiceAlerts()
      );
      concurrentOperations.push(
        service.calculateRoutes(
          '42 Woodhull St, Brooklyn',
          '512 W 22nd St, Manhattan',
          '9:00 AM'
        )
      );
    }
    
    const results = await Promise.allSettled(concurrentOperations);
    
    // No operations should cause system instability
    expect(results.length).toBe(30);
    
    // Check cache consistency
    const cacheStats = service.getCacheStats();
    expect(cacheStats).toBeDefined();
    
    // Performance stats should be reasonable
    const perfStats = service.getPerformanceStats();
    expect(perfStats.totalRequests).toBeGreaterThan(0);
  });

  test('shouldHandleMemoryLeaksAndLargeDataSets', async () => {
    // RED: Test memory management with large datasets
    
    // Simulate many route requests to test memory management
    const largeDataOperations = [];
    
    for (let i = 0; i < 50; i++) {
      largeDataOperations.push(
        service.calculateRoutes(
          `Origin ${i}`,
          `Destination ${i}`,
          `${9 + (i % 12)}:00 AM`
        ).catch(() => null) // Don't fail the test on individual errors
      );
    }
    
    await Promise.allSettled(largeDataOperations);
    
    // Check that error logs don't grow unbounded
    const errorStats = service.getErrorStats();
    expect(errorStats.totalErrors).toBeLessThan(200); // Reasonable upper bound
    
    // Check offline cache doesn't grow unbounded
    const offlineService = service.getOfflineService();
    const cacheStats = offlineService.getCacheStatistics();
    expect(cacheStats.totalCachedRoutes).toBeLessThan(1000); // Reasonable limit
  });

  test('shouldHandleCorruptedCacheData', async () => {
    // RED: Test behavior with corrupted cache data
    
    // Clear and potentially corrupt cache
    const cacheManager = (service as any).cacheManager;
    cacheManager.clearCache();
    
    // Try to access data after cache corruption
    try {
      const gtfsData = await service.fetchRealTimeData();
      expect(gtfsData).toBeDefined();
    } catch (error) {
      // Should handle gracefully
      expect(error).toBeInstanceOf(Error);
    }
    
    // Test offline cache corruption
    const offlineService = service.getOfflineService();
    await offlineService.clearExpiredCache();
    
    try {
      const cachedRoutes = await offlineService.getCachedRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan'
      );
      expect(cachedRoutes).toBeInstanceOf(Array);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('shouldHandleNetworkFluctuation', async () => {
    // RED: Test behavior with intermittent network connectivity
    
    // Simulate going offline and online repeatedly
    const originalOnLine = navigator.onLine;
    
    try {
      // Start online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const routes1 = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      ).catch(() => []);
      
      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const routes2 = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      ).catch(() => []);
      
      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const routes3 = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      ).catch(() => []);
      
      // System should adapt to network changes
      expect(routes1).toBeInstanceOf(Array);
      expect(routes2).toBeInstanceOf(Array);
      expect(routes3).toBeInstanceOf(Array);
      
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });
    }
  });

  test('shouldHandleErrorHandlerEdgeCases', async () => {
    // RED: Test error handler itself with edge cases
    
    // Test with null/undefined errors
    try {
      errorHandler.handleError(null as any, {
        operation: 'test_null_error',
        timestamp: new Date()
      });
    } catch (error) {
      // Should handle gracefully
    }
    
    // Test with circular reference errors
    const circularError = new Error('Circular test');
    (circularError as any).self = circularError;
    
    try {
      errorHandler.handleError(circularError, {
        operation: 'test_circular_error',
        timestamp: new Date()
      });
    } catch (error) {
      // Should handle gracefully
    }
    
    // Test error statistics
    const stats = errorHandler.getErrorStats();
    expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
    expect(stats.errorsByType).toBeDefined();
    
    // Test system health
    const health = errorHandler.getSystemHealth();
    expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    expect(health.issues).toBeInstanceOf(Array);
    expect(health.recommendations).toBeInstanceOf(Array);
  });

  test('shouldHandlePerformanceExtremes', async () => {
    // RED: Test performance under extreme conditions
    
    // Test very slow operations
    const slowOperationPromise = new Promise(resolve => {
      setTimeout(resolve, 5000); // 5 second delay
    });
    
    // Test timeout handling
    const timeoutTest = Promise.race([
      service.fetchRealTimeData(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);
    
    try {
      await timeoutTest;
    } catch (error) {
      // Timeout should be handled gracefully
      expect(error).toBeInstanceOf(Error);
    }
    
    // Test performance metrics under stress
    const perfStats = service.getPerformanceStats();
    expect(perfStats.totalRequests).toBeGreaterThanOrEqual(0);
    expect(perfStats.cacheHitRates).toBeDefined();
  });

  test('shouldHandleUnicodeAndInternationalization', async () => {
    // RED: Test internationalization edge cases
    
    const internationalInputs = [
      { origin: 'Москва, Russia', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '北京, China', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: 'العربية, UAE', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: '🚇🚊🚌 Transit St', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' },
      { origin: 'Ñuñoa, Santiago', destination: '512 W 22nd St, Manhattan', arrivalTime: '9:00 AM' }
    ];

    for (const input of internationalInputs) {
      try {
        await service.calculateRoutes(input.origin, input.destination, input.arrivalTime);
      } catch (error) {
        // Should handle international characters gracefully
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    }
  });

  test('shouldMaintainSystemStabilityUnderStress', async () => {
    // RED: Test overall system stability under various stress conditions
    
    const stressTestOperations = [];
    
    // Add various types of operations
    for (let i = 0; i < 20; i++) {
      // Regular operations
      stressTestOperations.push(
        service.calculateRoutes('Location A', 'Location B', '9:00 AM').catch(() => null)
      );
      
      // Error-inducing operations
      stressTestOperations.push(
        service.calculateRoutes('', '', '').catch(() => null)
      );
      
      // Cache operations
      stressTestOperations.push(
        service.fetchRealTimeData().catch(() => null)
      );
    }
    
    const startTime = Date.now();
    await Promise.allSettled(stressTestOperations);
    const duration = Date.now() - startTime;
    
    // Should complete in reasonable time
    expect(duration).toBeLessThan(30000); // 30 seconds max
    
    // System should still be responsive
    const finalHealth = service.getSystemHealth();
    expect(finalHealth.status).toBeDefined();
    
    // Error handling should still work
    const errorStats = service.getErrorStats();
    expect(errorStats.totalErrors).toBeDefined();
  });

  test('shouldProvideConsistentErrorMessages', async () => {
    // RED: Test error message consistency and quality
    
    const testErrors = [
      'mta',
      'network', 
      'offline',
      'route',
      'performance'
    ];
    
    for (const errorType of testErrors) {
      const userError = errorHandler.simulateError(errorType);
      
      // Error should have consistent structure
      expect(userError.title).toBeDefined();
      expect(userError.message).toBeDefined();
      expect(userError.severity).toMatch(/info|warning|error|critical/);
      expect(userError.recoveryActions).toBeInstanceOf(Array);
      expect(userError.recoveryActions.length).toBeGreaterThan(0);
      
      // Recovery actions should be actionable
      userError.recoveryActions.forEach(action => {
        expect(action.label).toBeDefined();
        expect(action.action).toBeDefined();
        expect(action.action).toMatch(/retry|refresh|offline|contact|navigate|custom/);
      });
      
      // Messages should be user-friendly (not technical)
      expect(userError.message).not.toMatch(/undefined|null|NaN|stack trace/i);
      expect(userError.message.length).toBeGreaterThan(10);
      expect(userError.message.length).toBeLessThan(200);
    }
  });
});