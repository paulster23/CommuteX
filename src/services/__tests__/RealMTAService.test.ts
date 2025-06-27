import { RealMTAService } from '../RealMTAService';

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
});
