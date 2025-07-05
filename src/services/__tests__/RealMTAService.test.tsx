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
});