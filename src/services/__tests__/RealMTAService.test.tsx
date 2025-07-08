import { RealMTAService } from '../RealMTAService';

describe('RealMTAService', () => {
  test('shouldCalculateAfternoonRoutes', async () => {
    // Red: Test calculation of afternoon/reverse routes (23rd St to Carroll St)
    const mtaService = new RealMTAService();
    
    const routes = await mtaService.calculateAfternoonRoutes(
      '512 W 22nd St, Manhattan',
      '42 Woodhull St, Brooklyn',
      '6:00 PM'
    );
    
    // Should return routes for afternoon commute
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
    
    // Each route should have the correct structure for afternoon commute
    routes.forEach(route => {
      expect(route.startingStation).toBe('23rd St');
      expect(route.endingStation).toBe('Carroll St');
      expect(route.method).toContain('F train');
      expect(route.walkingToTransit).toBeGreaterThan(0); // Walking from work to 23rd St
      expect(route.finalWalkingTime).toBe(12); // Walking from Carroll St to home (with Brooklyn 3.75 mph speed)
    });
  });

  test('shouldFetchServiceAlertsFromMTA', async () => {
    // Red: Test that service alerts are fetched from MTA GTFS-RT alerts feed
    const mtaService = new RealMTAService();
    
    const alerts = await mtaService.getServiceAlerts();
    
    // Should return array of service alerts
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    
    // If there are alerts, they should have proper structure
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        expect(alert.id).toBeDefined();
        expect(alert.headerText).toBeDefined();
        expect(alert.descriptionText).toBeDefined();
        expect(alert.affectedRoutes).toBeDefined();
        expect(Array.isArray(alert.affectedRoutes)).toBe(true);
        expect(alert.severity).toMatch(/^(info|warning|severe)$/);
      });
    }
  });

  test('shouldParseServiceAlertsFromGtfsBuffer', async () => {
    // Red: Test that service alerts are parsed from GTFS-RT protobuf data
    const mtaService = new RealMTAService();
    
    // Mock a valid protobuf buffer response
    const mockProtobufBuffer = new ArrayBuffer(100); // Mock non-empty buffer
    
    // This will fail initially because parseAlertsBuffer doesn't exist yet
    const alerts = await mtaService.parseAlertsBuffer(mockProtobufBuffer);
    
    // Should return array of parsed alerts
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    
    // If there are alerts, they should have proper structure from protobuf parsing
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        expect(alert.id).toBeDefined();
        expect(alert.headerText).toBeDefined();
        expect(alert.descriptionText).toBeDefined();
        expect(alert.affectedRoutes).toBeDefined();
        expect(Array.isArray(alert.affectedRoutes)).toBe(true);
        expect(alert.severity).toMatch(/^(info|warning|severe)$/);
      });
    }
  });

  test('shouldFilterServiceAlertsForSpecificRoutes', async () => {
    // Red: Test that service alerts are filtered for specific subway lines
    const mtaService = new RealMTAService();
    
    const relevantLines = ['F', 'C', 'A'];
    const alerts = await mtaService.getServiceAlertsForLines(relevantLines);
    
    // Should return array of filtered alerts
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    
    // All returned alerts should affect at least one of the specified lines
    alerts.forEach(alert => {
      const hasRelevantRoute = alert.affectedRoutes.some(route => 
        relevantLines.includes(route)
      );
      expect(hasRelevantRoute).toBe(true);
    });
  });

  test('shouldFilterServiceAlertsByDirection', async () => {
    // Red: Test that service alerts can be filtered by direction (0=outbound, 1=inbound)
    const mtaService = new RealMTAService();
    
    const lines = ['F'];
    const direction = 0; // outbound/southbound
    const alerts = await mtaService.getServiceAlertsForDirection(lines, direction);
    
    // Should return array of direction-filtered alerts
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    
    // All returned alerts should affect F line and either have no direction filter or match our direction
    alerts.forEach(alert => {
      expect(alert.affectedRoutes).toContain('F');
      
      const hasMatchingDirection = alert.informedEntities.some(entity => 
        entity.routeId === 'F' && (entity.directionId === undefined || entity.directionId === direction)
      );
      expect(hasMatchingDirection).toBe(true);
    });
  });

  test('shouldFilterServiceAlertsByStations', async () => {
    // Red: Test that service alerts can be filtered by specific stations
    const mtaService = new RealMTAService();
    
    const stationIds = ['F20', 'F18']; // Carroll St, 23rd St
    const alerts = await mtaService.getServiceAlertsForStations(stationIds);
    
    // Should return array of station-filtered alerts
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    
    // All returned alerts should affect at least one of our stations
    alerts.forEach(alert => {
      const affectsOurStations = alert.informedEntities.some(entity => 
        entity.stopId && stationIds.some(stationId => 
          entity.stopId === stationId || 
          entity.stopId === `${stationId}N` || 
          entity.stopId === `${stationId}S`
        )
      );
      expect(affectsOurStations).toBe(true);
    });
  });

  test('shouldEnrichRoutesWithAlertInformation', async () => {
    // Red: Test that routes are enriched with service alert information
    const mtaService = new RealMTAService();
    
    // Create a mock route
    const mockRoutes = [{
      id: 1,
      arrivalTime: '8:30 AM',
      duration: '45 min',
      method: 'F train',
      details: 'Direct train',
      transfers: 0,
      walkingToTransit: 12,
      isRealTimeData: true,
      confidence: 'high' as const,
      startingStation: 'Carroll St',
      endingStation: '23rd St',
      waitTime: 5,
      nextTrainDeparture: '8:25 AM',
      finalWalkingTime: 8,
      transitTime: 25,
      steps: [
        {
          type: 'walk' as const,
          description: 'Walk to Carroll St',
          duration: 12,
          dataSource: 'estimate' as const
        },
        {
          type: 'transit' as const,
          description: 'F train to 23rd St',
          duration: 25,
          dataSource: 'realtime' as const,
          line: 'F',
          fromStation: 'Carroll St',
          toStation: '23rd St'
        }
      ]
    }];
    
    const enrichedRoutes = await mtaService.enrichRoutesWithAlerts(mockRoutes, 0);
    
    // Should return enriched routes with alert information
    expect(enrichedRoutes).toBeDefined();
    expect(Array.isArray(enrichedRoutes)).toBe(true);
    expect(enrichedRoutes.length).toBe(1);
    
    const enrichedRoute = enrichedRoutes[0];
    expect(enrichedRoute.hasServiceAlerts).toBeDefined();
    expect(typeof enrichedRoute.hasServiceAlerts).toBe('boolean');
    
    if (enrichedRoute.hasServiceAlerts) {
      expect(enrichedRoute.alertSeverity).toMatch(/^(info|warning|severe)$/);
    }
  });
});