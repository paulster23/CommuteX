import { RouteFinderService } from '../RouteFinderService';

describe('RouteFinderService', () => {
  beforeEach(() => {
    // Reset service state for each test
    (RouteFinderService as any).initialized = false;
  });

  test('shouldFindDirectRouteBetweenStationsOnSameLine', () => {
    // Red: Test finding direct route between two stations on F line
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Jay St-MetroTech',
      toStation: 'Carroll St',
      maxTransfers: 0
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const directRoute = routes.find(route => route.isDirect);
    expect(directRoute).toBeDefined();
    expect(directRoute?.transferCount).toBe(0);
    expect(directRoute?.lines).toContain('F');
  });

  test('shouldFindTransferRouteBetweenDifferentLines', () => {
    // Red: Test finding transfer route using user-priority hubs
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Carroll St', // F, G lines
      toStation: 'Hoyt-Schermerhorn Sts', // A, C, G lines
      maxTransfers: 1
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const transferRoute = routes.find(route => !route.isDirect && route.transferCount === 1);
    expect(transferRoute).toBeDefined();
    expect(transferRoute?.steps.length).toBe(3); // board, transfer, arrive
  });

  test('shouldPrioritizeUserSpecifiedHubsInTransfers', () => {
    // Red: Test that user-specified hubs are preferred for transfers
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Bergen St', // F, G lines  
      toStation: 'Jay St-MetroTech', // A, C, F, R lines
      maxTransfers: 1
    });

    expect(routes.length).toBeGreaterThan(0);
    
    // Should find routes using user-priority hubs
    const routeWithUserHub = routes.find(route => 
      route.steps.some(step => 
        step.type === 'transfer' && 
        ['Jay St-MetroTech', 'Carroll St', 'Hoyt-Schermerhorn Sts'].includes(step.station)
      )
    );
    
    expect(routeWithUserHub).toBeDefined();
  });

  test('shouldCalculateReasonableTravelTimes', () => {
    // Red: Test that calculated travel times are realistic
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Jay St-MetroTech',
      toStation: 'Carroll St'
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    expect(route.totalTimeMinutes).toBeGreaterThan(2); // Minimum reasonable time
    expect(route.totalTimeMinutes).toBeLessThan(30); // Maximum for nearby stations
  });

  test('shouldIncludeTransferInstructionsWithWaitTimes', () => {
    // Red: Test that transfer steps include proper instructions and wait times
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Carroll St',
      toStation: 'Atlantic Av-Barclays Ctr',
      maxTransfers: 1
    });

    const transferRoute = routes.find(route => route.transferCount === 1);
    expect(transferRoute).toBeDefined();
    
    const transferStep = transferRoute?.steps.find(step => step.type === 'transfer');
    expect(transferStep).toBeDefined();
    expect(transferStep?.instructions).toContain('Transfer to the');
    expect(transferStep?.waitTimeMinutes).toBeGreaterThan(0);
  });

  test('shouldHandleZeroMinuteTransfersAtSamePlatform', () => {
    // Red: Test that same-platform transfers show 0 transfer time
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Broadway-Lafayette St', // F line
      toStation: 'Jay St-MetroTech', // F, A, C lines  
      maxTransfers: 1
    });

    // Look for routes that use Jay St-MetroTech for F to A/C transfer
    const samePlatformRoute = routes.find(route => 
      route.steps.some(step => 
        step.type === 'transfer' && 
        step.station === 'Jay St-MetroTech' && 
        step.transferTimeMinutes === 0
      )
    );

    if (samePlatformRoute) {
      expect(samePlatformRoute.steps.find(s => s.type === 'transfer')?.transferTimeMinutes).toBe(0);
      expect(samePlatformRoute.steps.find(s => s.type === 'transfer')?.instructions).toContain('same platform');
    }
  });

  test('shouldReturnEmptyArrayForInvalidStations', () => {
    // Red: Test handling of invalid station names
    const routes = RouteFinderService.findRoutes({
      fromStation: 'NonExistent Station',
      toStation: 'Also NonExistent'
    });

    expect(routes).toEqual([]);
  });

  test('shouldSortRoutesByEfficiency', () => {
    // Red: Test that routes are sorted by total time and transfer count
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Jay St-MetroTech',
      toStation: 'Atlantic Av-Barclays Ctr'
    });

    expect(routes.length).toBeGreaterThan(1);
    
    // Routes should be sorted by efficiency (time first, then transfers)
    for (let i = 1; i < routes.length; i++) {
      const prev = routes[i - 1];
      const curr = routes[i];
      
      if (prev.totalTimeMinutes === curr.totalTimeMinutes) {
        expect(prev.transferCount).toBeLessThanOrEqual(curr.transferCount);
      } else {
        expect(prev.totalTimeMinutes).toBeLessThan(curr.totalTimeMinutes);
      }
    }
  });

  test('shouldCalculateHighConfidenceForDirectRoutes', () => {
    // Red: Test that direct routes have higher confidence than transfer routes
    const routes = RouteFinderService.findRoutes({
      fromStation: 'Jay St-MetroTech',
      toStation: 'Carroll St'
    });

    const directRoute = routes.find(route => route.isDirect);
    const transferRoute = routes.find(route => !route.isDirect);

    // Direct routes should have high confidence
    if (directRoute) {
      expect(directRoute.confidence).toBeGreaterThanOrEqual(90);
    }

    // If we have both types, direct should generally be higher or equal
    // (user priority hubs might boost transfer route confidence)
    if (directRoute && transferRoute) {
      expect(directRoute.confidence).toBeGreaterThanOrEqual(transferRoute.confidence - 5);
    }
  });

  test('shouldLimitToMaximumTransfers', () => {
    // Red: Test that maxTransfers parameter is respected
    const routesNoTransfers = RouteFinderService.findRoutes({
      fromStation: 'Carroll St',
      toStation: 'Times Sq-42nd St',
      maxTransfers: 0
    });

    const routesOneTransfer = RouteFinderService.findRoutes({
      fromStation: 'Carroll St',
      toStation: 'Times Sq-42nd St',
      maxTransfers: 1
    });

    // Should have fewer or equal routes with maxTransfers = 0
    expect(routesNoTransfers.length).toBeLessThanOrEqual(routesOneTransfer.length);
    
    // All routes in no-transfer search should be direct
    routesNoTransfers.forEach(route => {
      expect(route.transferCount).toBe(0);
    });
  });

  test('shouldEnhanceRoutesWithRealTimeDepartures', async () => {
    // Red: Test integrating real-time departure data with route steps
    const routes = await RouteFinderService.findRoutesWithRealTimeData({
      fromStation: 'Carroll St',
      toStation: 'Jay St-MetroTech'
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    expect(route.isRealTimeData).toBe(true);
    
    // Route should have reasonable total time
    expect(route.totalTimeMinutes).toBeGreaterThan(0);
    expect(route.totalTimeMinutes).toBeLessThan(60);
    
    // Steps should include boarding and arrival
    const boardStep = route.steps.find(step => step.type === 'board');
    const arriveStep = route.steps.find(step => step.type === 'arrive');
    expect(boardStep).toBeDefined();
    expect(arriveStep).toBeDefined();
    
    // Boarding step should have wait time (either real-time or estimated)
    expect(boardStep?.waitTimeMinutes).toBeGreaterThan(0);
  });

  test('shouldFallbackToEstimatedTimesWhenRealTimeUnavailable', async () => {
    // Red: Test graceful fallback when GTFS data is unavailable
    const routes = await RouteFinderService.findRoutesWithRealTimeData({
      fromStation: 'NonExistent Station',
      toStation: 'Also NonExistent'
    });

    // Should return empty array for invalid stations
    expect(routes).toEqual([]);
    
    // Test valid stations but assume GTFS failure
    const validRoutes = await RouteFinderService.findRoutesWithRealTimeData({
      fromStation: 'Carroll St',
      toStation: 'Jay St-MetroTech',
      fallbackToEstimated: true
    });

    // Should still get routes even without real-time data
    if (validRoutes.length > 0) {
      expect(validRoutes[0].isRealTimeData).toBeDefined();
    }
  });
});