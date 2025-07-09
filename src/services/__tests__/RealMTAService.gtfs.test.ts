import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('RealMTAService - GTFS Transit Time Calculation', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    jest.clearAllMocks();
  });

  test('shouldCalculateTransitTimeFromGTFSStaticData', async () => {
    // Red: Test that transit times are calculated from GTFS static data, not hardcoded values
    
    // Mock GTFS static data for F train Carroll St to 23rd St
    const mockGTFSStatic = {
      stops: [
        { stop_id: 'F20', stop_name: 'Carroll St', stop_lat: 40.679371, stop_lon: -73.995148 },
        { stop_id: 'F18', stop_name: '23rd St', stop_lat: 40.742878, stop_lon: -73.992821 }
      ],
      stop_times: [
        // Sample trip showing actual travel time
        { trip_id: 'F_TRIP_1', stop_id: 'F20', stop_sequence: 1, arrival_time: '09:00:00', departure_time: '09:00:00' },
        { trip_id: 'F_TRIP_1', stop_id: 'F24', stop_sequence: 2, arrival_time: '09:02:00', departure_time: '09:02:00' }, // Bergen St
        { trip_id: 'F_TRIP_1', stop_id: 'F25', stop_sequence: 3, arrival_time: '09:07:00', departure_time: '09:07:00' }, // Jay St
        { trip_id: 'F_TRIP_1', stop_id: 'F21', stop_sequence: 4, arrival_time: '09:10:00', departure_time: '09:10:00' }, // 4th Ave
        { trip_id: 'F_TRIP_1', stop_id: 'F19', stop_sequence: 5, arrival_time: '09:16:00', departure_time: '09:16:00' }, // 14th St-Union Sq
        { trip_id: 'F_TRIP_1', stop_id: 'F18', stop_sequence: 6, arrival_time: '09:34:00', departure_time: '09:34:00' }  // 23rd St
      ]
    };

    // Mock GTFS static data fetching
    jest.spyOn(service as any, 'fetchGTFSStaticData').mockResolvedValue(mockGTFSStatic);

    // Calculate transit time from Carroll St to 23rd St using GTFS data
    const transitTime = await service.calculateGTFSTransitTime('F20', 'F18', 'F');

    // Should return actual GTFS time (34 minutes) not hardcoded time (18 minutes)
    expect(transitTime).toBe(34);
    
    // Should have fetched GTFS static data
    expect(service.fetchGTFSStaticData).toHaveBeenCalledWith('F');
  });

  test('shouldUseGTFSTransitTimeInDirectRoutes', async () => {
    // Red: Test that direct F train routes use GTFS-calculated transit time instead of hardcoded 18 minutes
    
    // Mock navigator.onLine to avoid internet connection check
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock GTFS static data to return 34-minute travel time
    jest.spyOn(service as any, 'calculateGTFSTransitTime').mockResolvedValue(34);
    
    // Mock real-time arrivals data
    jest.spyOn(service as any, 'fetchTrainArrivalsFromFeed').mockResolvedValue([
      {
        stopId: 'F20N',
        stopSequence: 1,
        departureTime: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
        arrivalTime: Math.floor(Date.now() / 1000) + 900
      }
    ]);

    // Calculate direct routes
    const routes = await service.calculateRoutes('Carroll St', '23rd St', '9:30 AM');

    // Should have at least one route
    expect(routes.length).toBeGreaterThan(0);
    
    // The route should use GTFS-calculated transit time (34 min), not hardcoded (18 min)
    const directRoute = routes[0];
    expect(directRoute.transitTime).toBe(34);
    
    // Should have called GTFS transit time calculation
    expect(service.calculateGTFSTransitTime).toHaveBeenCalledWith('F20', 'F18', 'F');
  });

  test('shouldCalculateAccurateRouteComparison', async () => {
    // Red: Test that direct F routes now use accurate GTFS timing instead of hardcoded 18 minutes
    
    // Mock navigator.onLine to avoid internet connection check
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock GTFS transit time for direct F route (34 minutes - realistic)
    jest.spyOn(service as any, 'calculateGTFSTransitTime').mockResolvedValue(34);
    
    // Mock walking times
    jest.spyOn(service.locationProvider, 'getWalkingTimeToTransit').mockResolvedValue(12);
    jest.spyOn(service.locationProvider, 'getWalkingTimeFromTwentyThirdSt').mockReturnValue(8);
    
    // Mock service alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([]);
    
    // Mock real-time arrivals 
    jest.spyOn(service as any, 'fetchTrainArrivalsFromFeed').mockResolvedValue([
      {
        stopId: 'F20N',
        stopSequence: 1,
        departureTime: Math.floor(Date.now() / 1000) + 900,
        arrivalTime: Math.floor(Date.now() / 1000) + 900
      }
    ]);

    // Calculate direct routes only for this test
    const directRoutes = await service.calculateRoutes('Carroll St', '23rd St', '9:30 AM');

    // Should have generated at least one direct route
    expect(directRoutes.length).toBeGreaterThan(0);
    
    // The route should use GTFS-calculated transit time (34 min), not hardcoded (18 min)
    const directRoute = directRoutes[0];
    expect(directRoute.transitTime).toBe(34);
    
    // Verify GTFS calculation was called
    expect(service.calculateGTFSTransitTime).toHaveBeenCalledWith('F20', 'F18', 'F');
    
    // With the new 34-minute transit time, total journey is more realistic:
    // 12 walk + 34 transit + 8 walk = 54 minutes (vs previous 38 minutes with hardcoded 18)
    // This makes transfer routes more competitive when they have better timing
  });

  test('shouldHandleGTFSDataErrors', async () => {
    // Red: Test that GTFS data fetch errors fall back gracefully
    
    // Mock GTFS data fetch failure
    jest.spyOn(service as any, 'fetchGTFSStaticData').mockRejectedValue(new Error('GTFS data unavailable'));
    
    // Should fall back to reasonable default
    const transitTime = await service.calculateGTFSTransitTime('F20', 'F18', 'F');
    
    // Should return a reasonable fallback time (not the old hardcoded 18 minutes)
    expect(transitTime).toBeGreaterThan(18);
    expect(transitTime).toBeLessThan(60);
  });
});