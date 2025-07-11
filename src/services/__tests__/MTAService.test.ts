import { MTAService } from '../MTAService';

describe('MTAService', () => {
  test('shouldFetchRealTimeGTFSData', async () => {
    const service = new MTAService();
    const data = await service.fetchRealTimeData();
    
    expect(data).toBeDefined();
    expect(data.routes).toBeInstanceOf(Array);
  });

  test('shouldCalculateRouteFromBrooklynToManhattan', async () => {
    const service = new MTAService();
    const routes = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    expect(routes).toBeInstanceOf(Array);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]).toHaveProperty('arrivalTime');
    expect(routes[0]).toHaveProperty('duration');
    expect(routes[0]).toHaveProperty('method');
  });

  test('shouldSortRoutesByArrivalTime', async () => {
    const service = new MTAService();
    const routes = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    // Routes should be sorted by arrival time
    for (let i = 1; i < routes.length; i++) {
      const prevTime = new Date(`1970-01-01 ${routes[i-1].arrivalTime}`);
      const currTime = new Date(`1970-01-01 ${routes[i].arrivalTime}`);
      expect(prevTime.getTime()).toBeLessThanOrEqual(currTime.getTime());
    }
  });

  test('shouldIncludeWalkingTimeInRouteCalculations', async () => {
    const service = new MTAService();
    const routes = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    // Find B61 route (should be fastest due to 2-minute walk - calculated dynamically)
    const b61Route = routes.find(route => route.method.includes('Bus'));
    expect(b61Route).toBeDefined();
    expect(b61Route!.walkingToTransit).toBe(2);
    
    // Find F train route (12-minute walk to Carroll St - calculated dynamically with Brooklyn 3.75 mph speed)
    const fRoute = routes.find(route => route.details.includes('F train'));
    expect(fRoute).toBeDefined();
    expect(fRoute!.walkingToTransit).toBe(12);
  });
});
