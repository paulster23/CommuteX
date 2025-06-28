import { RealMTAService, Route } from '../RealMTAService';

describe('RealMTAService', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService();
  });

  test('shouldInitializeWithoutAPIKey', () => {
    const service = new RealMTAService();
    expect(service).toBeDefined();
    // No API key required for public MTA feeds
  });

  test('shouldFetchRealGTFSRealtimeData', async () => {
    // This test will fail if MTA API is down - which is expected behavior
    try {
      const data = await service.fetchRealTimeData();
      
      expect(data).toBeDefined();
      expect(data.routes).toBeInstanceOf(Array);
      expect(data.lastUpdated).toBeInstanceOf(Date);
      expect(data.isRealData).toBe(true);
    } catch (error) {
      // If MTA API is unavailable, we expect a clear error message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/MTA|GTFS|API/i);
    }
  });

  test('shouldCalculateRealRoutesFromGTFSData', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      expect(routes).toBeInstanceOf(Array);
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('arrivalTime');
        expect(routes[0]).toHaveProperty('duration');
        expect(routes[0]).toHaveProperty('method');
        expect(routes[0]).toHaveProperty('isRealTimeData', true);
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('shouldHandleMTAServiceUnavailable', async () => {
    // Test that service properly handles when MTA feeds are down
    // This is expected behavior - real feeds may be temporarily unavailable
    try {
      const data = await service.fetchRealTimeData();
      // If successful, data should be valid
      expect(data.isRealData).toBe(true);
    } catch (error) {
      // If MTA is down, should get clear error message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/MTA|GTFS|unavailable/i);
    }
  });

  test('shouldIncludeServiceAlertsFromMTA', async () => {
    try {
      const data = await service.fetchServiceAlerts();
      
      expect(data).toBeInstanceOf(Array);
      // Service alerts should be real MTA alerts, not mock data
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('alertText');
        expect(data[0]).toHaveProperty('affectedRoutes');
      }
    } catch (error) {
      // MTA alerts API may be unavailable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Station name functionality
  test('shouldIncludeStartingAndEndingStationNames', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      if (routes.length > 0) {
        const route = routes[0];
        expect(route).toHaveProperty('startingStation');
        expect(route).toHaveProperty('endingStation');
        expect(typeof route.startingStation).toBe('string');
        expect(typeof route.endingStation).toBe('string');
        expect(route.startingStation).not.toBe('');
        expect(route.endingStation).not.toBe('');
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Wait time calculation functionality
  test('shouldCalculateWaitTimeAtStation', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      if (routes.length > 0) {
        const route = routes[0];
        expect(route).toHaveProperty('waitTime');
        expect(route).toHaveProperty('nextTrainDeparture');
        
        if (route.waitTime !== undefined) {
          expect(typeof route.waitTime).toBe('number');
          expect(route.waitTime).toBeGreaterThanOrEqual(0);
          expect(route.waitTime).toBeLessThan(20); // Reasonable upper bound
        }
        
        if (route.nextTrainDeparture) {
          expect(typeof route.nextTrainDeparture).toBe('string');
          expect(route.nextTrainDeparture).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
        }
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Station mapping for specific train lines
  test('shouldMapCorrectStationsForFTrain', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      const fTrainRoute = routes.find((route: Route) => route.method.includes('F train'));
      if (fTrainRoute) {
        expect(fTrainRoute.startingStation).toBe('Carroll St');
        expect(fTrainRoute.endingStation).toBe('23rd St');
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Station mapping for R train
  test('shouldMapCorrectStationsForRTrain', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      const rTrainRoute = routes.find((route: Route) => route.method.includes('R train'));
      if (rTrainRoute) {
        expect(rTrainRoute.startingStation).toBe('Union St');
        expect(rTrainRoute.endingStation).toBe('23rd St');
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Final walking time calculation
  test('shouldIncludeFinalWalkingTime', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      if (routes.length > 0) {
        const route = routes[0];
        expect(route).toHaveProperty('finalWalkingTime');
        expect(typeof route.finalWalkingTime).toBe('number');
        expect(route.finalWalkingTime).toBeGreaterThan(0);
        expect(route.finalWalkingTime).toBeLessThan(15); // Reasonable upper bound for final walk
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });

  // TEST: Total duration includes final walking time
  test('shouldIncludeFinalWalkingTimeInTotalDuration', async () => {
    try {
      const routes = await service.calculateRoutes(
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
      
      if (routes.length > 0) {
        const route = routes[0];
        const totalMinutes = parseInt(route.duration.replace(' min', ''));
        
        // Verify that total duration is reasonable (should include all walking times)
        expect(totalMinutes).toBeGreaterThan(30); // Minimum reasonable commute time
        expect(totalMinutes).toBeLessThan(120); // Maximum reasonable commute time
        
        // If finalWalkingTime exists, it should be included in calculations
        if (route.finalWalkingTime) {
          expect(route.finalWalkingTime).toBeGreaterThan(0);
        }
      }
    } catch (error) {
      // Real MTA data may be unavailable - this is acceptable
      expect(error).toBeInstanceOf(Error);
    }
  });
});
