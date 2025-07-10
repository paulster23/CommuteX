import { RouteServiceAdapter } from '../RouteServiceAdapter';

describe('RouteServiceAdapter', () => {
  beforeEach(() => {
    // Reset adapter state for each test
    (RouteServiceAdapter as any).initialized = false;
  });

  test('shouldConvertSubwayRouteToUIRoute', async () => {
    // Red: Test converting RouteFinderService output to UI Route format
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan'
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    
    // Should have UI Route interface properties
    expect(route.id).toBeDefined();
    expect(route.arrivalTime).toBeDefined();
    expect(route.duration).toBeDefined();
    expect(route.method).toBeDefined();
    expect(route.startingStation).toBeDefined();
    expect(route.endingStation).toBeDefined();
    expect(route.steps).toBeDefined();
    expect(Array.isArray(route.steps)).toBe(true);
  });

  test('shouldFindNearestStationsFromAddresses', () => {
    // Red: Test address resolution to nearest stations
    const homeStation = RouteServiceAdapter.findNearestStation('42 Woodhull St, Brooklyn');
    const workStation = RouteServiceAdapter.findNearestStation('512 W 22nd St, Manhattan');

    expect(homeStation).toBeDefined();
    expect(homeStation?.name).toContain('Carroll');
    
    expect(workStation).toBeDefined();
    expect(workStation?.name).toContain('23');
  });

  test('shouldGenerateDirectRoutes', async () => {
    // Red: Test generating direct routes (no transfers)
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan',
      preferDirect: true
    });

    const directRoutes = routes.filter(route => route.transferCount === 0);
    expect(directRoutes.length).toBeGreaterThan(0);
    
    const directRoute = directRoutes[0];
    expect(directRoute.method).toContain('Direct');
    expect(directRoute.lines).toContain('F');
  });

  test('shouldGenerateTransferRoutes', async () => {
    // Red: Test generating routes with transfers
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan',
      maxTransfers: 1
    });

    const transferRoutes = routes.filter(route => route.transferCount === 1);
    expect(transferRoutes.length).toBeGreaterThan(0);
    
    const transferRoute = transferRoutes[0];
    expect(transferRoute.method).toContain('transfer');
    expect(transferRoute.transferStation).toBeDefined();
  });

  test('shouldPreserveRealTimeDataFlags', async () => {
    // Red: Test that real-time data indicators are preserved
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan',
      useRealTimeData: true
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    expect(route.isRealTimeData).toBe(true);
    
    // Should have calculated arrival times
    expect(route.arrivalTime).toMatch(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
  });

  test('shouldCalculateRouteDurationCorrectly', async () => {
    // Red: Test that route duration calculation matches UI expectations
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan'
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    expect(route.duration).toMatch(/\d+\s?min/);
    expect(route.totalTimeMinutes).toBeGreaterThan(5);
    expect(route.totalTimeMinutes).toBeLessThan(60);
  });

  test('shouldSortRoutesByEfficiency', async () => {
    // Red: Test that routes are sorted by arrival time (earliest first)
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan'
    });

    expect(routes.length).toBeGreaterThan(1);
    
    // Routes should be sorted by total time (fastest first)
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].totalTimeMinutes).toBeGreaterThanOrEqual(routes[i-1].totalTimeMinutes);
    }
  });

  test('shouldHandleInvalidAddresses', async () => {
    // Red: Test graceful handling of invalid addresses
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: 'Invalid Address 123',
      toAddress: 'Another Invalid Address 456'
    });

    expect(routes).toEqual([]);
  });

  test('shouldCreateRouteStepsForUI', async () => {
    // Red: Test that route steps are formatted for UI consumption
    const routes = await RouteServiceAdapter.getRoutesForTrip({
      fromAddress: '42 Woodhull St, Brooklyn',
      toAddress: '512 W 22nd St, Manhattan'
    });

    expect(routes.length).toBeGreaterThan(0);
    
    const route = routes[0];
    expect(route.steps.length).toBeGreaterThan(0);
    
    const step = route.steps[0];
    expect(step.instruction).toBeDefined();
    expect(step.type).toMatch(/walk|board|transfer|arrive/);
    
    if (step.type === 'board' || step.type === 'transfer') {
      expect(step.line).toBeDefined();
      expect(step.waitTime).toBeDefined();
    }
  });
});