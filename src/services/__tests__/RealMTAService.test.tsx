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
      expect(route.finalWalkingTime).toBe(12); // Walking from Carroll St to home
    });
  });
});