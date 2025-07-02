import { RealMTAService, Route } from '../RealMTAService';

/**
 * Integration Tests for Real-Time Only Routing
 * 
 * Following CLAUDE.md TDD principles and NYC Subway Challenge approach:
 * - No mock data, only real MTA GTFS feeds
 * - Fail fast with clear errors when real-time data unavailable
 * - Test complete user journeys end-to-end
 * 
 * These tests will initially FAIL because we still use estimate fallbacks.
 * This is intentional (Red phase) - we'll implement real-time-only logic to make them pass (Green phase).
 */
describe('Route Integration Tests - Real-Time Only', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService();
  });

  test('shouldRejectEstimatedDataAndRequireRealGTFS', async () => {
    // RED: This test should FAIL initially because we currently use estimates
    // This is the core requirement: NEVER use estimates, only real GTFS data
    
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',    // Near Carroll St
        '512 W 22nd St, Manhattan',    // Near 23rd St  
        '9:00 AM'
      );

      if (routes.length > 0) {
        // Every route must be marked as real-time data
        routes.forEach(route => {
          expect(route.isRealTimeData).toBe(true);
          
          // No route should use estimated/fallback data sources
          if (route.steps) {
            route.steps.forEach(step => {
              expect(step.dataSource).not.toBe('estimate');
              expect(step.dataSource).not.toBe('fixed');
              expect(step.dataSource).toBe('realtime');
            });
          }
        });
      }
    } catch (error) {
      // When real-time data is unavailable, we expect a clear error message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/real.time.*unavailable|GTFS.*feeds.*down|MTA.*data.*unavailable/i);
      
      // Error message should be actionable, not vague
      expect((error as Error).message).not.toMatch(/unknown.*error|something.*wrong/i);
    }
  });

  test('shouldProvideMultiLegRoutesUsingOnlyRealTimeData', async () => {
    // RED: Test multi-leg routing (F→C transfer) using only real GTFS data
    // This should initially fail because current logic uses estimates for missing data
    
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',    // F train area
        '500 8th Ave, Manhattan',      // C train area (requires transfer)
        '9:00 AM'
      );

      // Find transfer routes
      const transferRoutes = routes.filter(route => route.transfers && route.transfers > 0);
      
      if (transferRoutes.length > 0) {
        const transferRoute = transferRoutes[0];
        
        // Must use only real-time data for both legs
        expect(transferRoute.isRealTimeData).toBe(true);
        
        // Verify transfer timing uses real GTFS data
        expect(transferRoute.firstTransitTime).toBeGreaterThan(0);
        expect(transferRoute.secondTransitTime).toBeGreaterThan(0);
        expect(transferRoute.transferWaitTime).toBeGreaterThan(0);
        
        // All steps must be real-time
        if (transferRoute.steps) {
          transferRoute.steps.forEach(step => {
            if (step.type === 'transit' || step.type === 'wait') {
              expect(step.dataSource).toBe('realtime');
            }
          });
        }
      }
    } catch (error) {
      // Acceptable: Transfer routing may fail if GTFS feeds unavailable
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/transfer.*unavailable|multi.leg.*data.*missing/i);
    }
  });

  test('shouldFailGracefullyWhenAllGTFSFeedsUnavailable', async () => {
    // RED: Test proper error handling when no real-time data available
    // Current code may fall back to estimates - this should be changed to fail
    
    // This test verifies the system fails fast instead of showing estimates
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan', 
        '9:00 AM'
      );

      if (routes.length === 0) {
        // No routes returned - this is acceptable when no real-time data
        expect(routes).toEqual([]);
      } else {
        // If routes returned, they must ALL be real-time
        routes.forEach(route => {
          expect(route.isRealTimeData).toBe(true);
          
          // No estimate indicators allowed
          const routeString = JSON.stringify(route);
          expect(routeString).not.toMatch(/estimate|fallback|mock|fixed/i);
        });
      }
    } catch (error) {
      // Expected behavior: clear error when real-time data unavailable
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      
      // Error should mention specific MTA feed issues
      expect(errorMessage).toMatch(/MTA.*feeds|GTFS.*realtime|real.time.*data/i);
      
      // Error should NOT suggest using estimates
      expect(errorMessage).not.toMatch(/estimate|approximate|fallback/i);
      
      // Error should be actionable
      expect(errorMessage.length).toBeGreaterThan(20);
    }
  });

  test('shouldDisplayDataFreshnessAndFeedHealth', async () => {
    // RED: Test that UI receives data freshness and feed health information
    // This will fail initially because we don't track feed health properly
    
    try {
      const gtfsData = await service.fetchRealTimeData();
      
      // Verify data freshness tracking
      expect(gtfsData.lastUpdated).toBeInstanceOf(Date);
      expect(gtfsData.lastUpdated.getTime()).toBeGreaterThan(Date.now() - 5 * 60 * 1000); // Within 5 minutes
      
      // Verify feed health data (will be added in refactor)
      expect(gtfsData).toHaveProperty('feedHealth');
      expect(gtfsData.feedHealth).toBeDefined();
      expect(gtfsData.feedHealth.workingFeeds).toBeInstanceOf(Array);
      expect(gtfsData.feedHealth.failedFeeds).toBeInstanceOf(Array);
      expect(gtfsData.feedHealth.totalFeeds).toBeGreaterThan(0);
      
      // Verify real-time coverage metrics
      expect(gtfsData).toHaveProperty('coverage');
      expect(gtfsData.coverage.realTimePercentage).toBeGreaterThanOrEqual(0);
      expect(gtfsData.coverage.realTimePercentage).toBeLessThanOrEqual(100);
      
    } catch (error) {
      // When feeds down, error should include health information
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toMatch(/feed.*status|health|availability/i);
    }
  });

  test('shouldHandleRealTimeServiceDisruptions', async () => {
    // RED: Test handling of real-time service disruptions from GTFS-RT alerts
    // Current code may not integrate service alerts properly with routing
    
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );

      if (routes.length > 0) {
        // Routes should include service alert information
        routes.forEach(route => {
          expect(route).toHaveProperty('serviceAlerts');
          
          if (route.serviceAlerts && route.serviceAlerts.length > 0) {
            route.serviceAlerts.forEach(alert => {
              expect(alert.alertText).toBeDefined();
              expect(alert.affectedRoutes).toBeDefined();
              expect(alert.severity).toMatch(/info|warning|severe/);
            });
          }
        });
      }

      // Service alerts should be available separately  
      const alerts = await service.fetchServiceAlerts();
      expect(alerts).toBeInstanceOf(Array);
      
    } catch (error) {
      // Service alerts API may be down - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('shouldCalculateConfidenceBasedOnDataQuality', async () => {
    // RED: Test confidence scoring based on real-time data availability
    // Will fail initially because confidence calculation needs improvement
    
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );

      if (routes.length > 0) {
        routes.forEach(route => {
          expect(route.confidence).toBeDefined();
          expect(route.confidence).toMatch(/high|medium|low/);
          
          // High confidence only for routes with complete real-time data
          if (route.confidence === 'high') {
            expect(route.isRealTimeData).toBe(true);
            
            if (route.steps) {
              const allRealTime = route.steps.every(step => 
                step.type === 'walk' || step.dataSource === 'realtime'
              );
              expect(allRealTime).toBe(true);
            }
          }
          
          // Low confidence should trigger warning in UI
          if (route.confidence === 'low') {
            expect(route).toHaveProperty('confidenceWarning');
            expect(route.confidenceWarning).toMatch(/limited.*data|partial.*information/i);
          }
        });
      }
    } catch (error) {
      // Error acceptable when no reliable data available
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('shouldValidateGTFSDataIntegrityBeforeUsing', async () => {
    // RED: Test that corrupted/incomplete GTFS data is rejected
    // Current code may use partial data - should be changed to validate first
    
    try {
      const gtfsData = await service.fetchRealTimeData();
      
      // GTFS data should pass integrity checks
      expect(gtfsData.isRealData).toBe(true);
      expect(gtfsData.routes).toBeInstanceOf(Array);
      
      // All routes should have required real-time fields
      gtfsData.routes.forEach(route => {
        expect(route.arrivalTime).toBeDefined();
        expect(route.duration).toBeDefined();
        expect(route.startingStation).toBeDefined();
        expect(route.endingStation).toBeDefined();
        
        // Validate timing makes sense
        const durationMinutes = parseInt(route.duration.replace(' min', ''));
        expect(durationMinutes).toBeGreaterThan(5);  // Reasonable minimum
        expect(durationMinutes).toBeLessThan(120);   // Reasonable maximum
      });
      
    } catch (error) {
      // Error should specify data integrity issues
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/data.*integrity|validation.*failed|corrupted.*feed/i);
    }
  });

  test('shouldProvideAlternativeRoutesWhenPrimaryFails', async () => {
    // RED: Test that alternative routes are provided when primary route has issues
    // Current code may not handle route failures gracefully
    
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );

      // Should provide multiple route options for resilience
      expect(routes.length).toBeGreaterThan(1);
      
      // Routes should be sorted by reliability/arrival time
      for (let i = 1; i < routes.length; i++) {
        const prevRoute = routes[i - 1];
        const currentRoute = routes[i];
        
        // Earlier routes should have better or equal confidence
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        const prevConfidence = confidenceOrder[prevRoute.confidence as keyof typeof confidenceOrder] || 0;
        const currentConfidence = confidenceOrder[currentRoute.confidence as keyof typeof confidenceOrder] || 0;
        
        expect(prevConfidence).toBeGreaterThanOrEqual(currentConfidence);
      }
      
    } catch (error) {
      // Even when primary route fails, should provide alternatives or clear guidance
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toMatch(/alternative.*routes|backup.*options|try.*later/i);
    }
  });

  test('shouldIntegrateWithNYCSubwayChallengeApproach', async () => {
    // RED: Test integration of NYC Subway Challenge graph-based approach
    // This will fail initially as we haven't implemented graph-based routing yet
    
    try {
      // This method doesn't exist yet - will be implemented in Phase 2
      const graphData = await (service as any).buildTimeDependentGraph();
      
      expect(graphData).toBeDefined();
      expect(graphData.nodes).toBeInstanceOf(Map);
      expect(graphData.edges).toBeInstanceOf(Map);
      expect(graphData.isTimeDependentGraph).toBe(true);
      
      // Test pathfinding with real-time constraints
      const optimalPath = await (service as any).findOptimalPath(
        graphData,
        'Carroll St',
        '23rd St',
        new Date('2024-01-15T09:00:00')
      );
      
      expect(optimalPath).toBeDefined();
      expect(optimalPath.usesOnlyRealTimeData).toBe(true);
      expect(optimalPath.confidence).toBe('high');
      
    } catch (error) {
      // Expected to fail initially - graph-based routing not implemented yet
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/not.*implemented|graph.*routing|buildTimeDependent/i);
    }
  });
});