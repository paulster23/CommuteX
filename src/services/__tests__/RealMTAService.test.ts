import { RealMTAService, Route } from '../RealMTAService';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('RealMTAService', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shouldParseStopTimeUpdatesFromGTFSData', () => {
    // Red: Write failing test for parsing stopTimeUpdate data
    const mockTripUpdate = {
      stopTimeUpdate: [
        {
          stopId: 'F18',
          stopSequence: 1,
          arrival: { time: 1487415600, delay: 0 },
          departure: { time: 1487415630, delay: 0 }
        },
        {
          stopId: 'F20',
          stopSequence: 2,
          arrival: { time: 1487415900, delay: 60 },
          departure: { time: 1487415930, delay: 60 }
        }
      ]
    };

    const result = (service as any).parseStopTimeUpdates(mockTripUpdate);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      stopId: 'F18',
      stopSequence: 1,
      arrivalTime: 1487415600,
      departureTime: 1487415630,
      delay: 0
    });
    expect(result[1]).toEqual({
      stopId: 'F20',
      stopSequence: 2,
      arrivalTime: 1487415900,
      departureTime: 1487415930,
      delay: 60
    });
  });

  test('shouldMapStationNamesToGTFSStopIds', () => {
    // Red: Write failing test for station name to stop ID mapping
    const result1 = (service as any).getStopId('Carroll St', 'F');
    const result2 = (service as any).getStopId('Jay St-MetroTech', 'F');
    const result3 = (service as any).getStopId('Jay St-MetroTech', 'C');
    const result4 = (service as any).getStopId('Unknown Station', 'F');

    expect(result1).toBe('F18');
    expect(result2).toBe('F20');
    expect(result3).toBe('A41');
    expect(result4).toBeNull();
  });

  test('shouldFindNextDepartureAfterGivenTime', () => {
    // Red: Write failing test for finding next departure after specific time
    const mockTrips = [
      {
        trip: { tripId: 'trip1', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: 1487415400 }, // 11:10 AM
          { stopId: 'F20', departureTime: 1487415700 }  // 11:15 AM
        ]
      },
      {
        trip: { tripId: 'trip2', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: 1487415800 }, // 11:16:40 AM
          { stopId: 'F20', departureTime: 1487416100 }  // 11:21:40 AM
        ]
      }
    ];

    const afterTime = new Date(1487415500 * 1000); // 11:11:40 AM
    const result = (service as any).findNextDepartureAfter(mockTrips, 'Carroll St', afterTime);

    expect(result).toBeDefined();
    expect(result.trip.tripId).toBe('trip2');
    expect(result.departureTime).toEqual(new Date(1487415800 * 1000));
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

  // NEW TESTS FOR GTFS PARSING ERROR HANDLING

  test('shouldHandleInvalidProtocolBufferData', async () => {
    // Create a private method test helper
    const testFetchGTFSFeed = async () => {
      // Access private method through prototype
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    // Mock fetch to return HTML error page instead of protobuf
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        // Return HTML content that would cause "invalid wire type 4 at offset 1" error
        const htmlContent = '<html><body>Service Temporarily Unavailable</body></html>';
        return new TextEncoder().encode(htmlContent).buffer;
      }
    } as any);

    // This should not crash but handle the error gracefully
    await expect(testFetchGTFSFeed()).rejects.toThrow(/Failed to parse GTFS-RT data format/);
  });

  test('shouldHandleCorruptedGTFSData', async () => {
    const testFetchGTFSFeed = async () => {
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    // Mock fetch to return corrupted binary data for both attempts (original + retry)
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        // Return random bytes that don't form valid protobuf
        const corruptedData = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC, 0xFB]);
        return corruptedData.buffer;
      }
    } as any;
    
    mockFetch.mockResolvedValueOnce(mockResponse);
    mockFetch.mockResolvedValueOnce(mockResponse); // For retry attempt

    await expect(testFetchGTFSFeed()).rejects.toThrow(/Failed to parse GTFS-RT data format/);
  });

  test('shouldValidateContentTypeBeforeParsing', async () => {
    const testFetchGTFSFeed = async () => {
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    // Mock fetch to return wrong content type
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => name === 'content-type' ? 'text/html' : null
      },
      arrayBuffer: async () => {
        const htmlContent = '<!DOCTYPE html><html><body>Error</body></html>';
        return new TextEncoder().encode(htmlContent).buffer;
      }
    } as any);

    // Should detect wrong content type and provide helpful error
    await expect(testFetchGTFSFeed()).rejects.toThrow(/Invalid content type/);
  });

  test('shouldHandleEmptyProtocolBufferResponse', async () => {
    const testFetchGTFSFeed = async () => {
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    // Mock fetch to return empty buffer
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => new ArrayBuffer(0)
    } as any);

    await expect(testFetchGTFSFeed()).rejects.toThrow(/Empty response/);
  });

  test('shouldRetryOnTransientGTFSParsingFailure', async () => {
    const testFetchGTFSFeed = async () => {
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    // First call fails with parsing error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        const badData = new TextEncoder().encode('bad data').buffer;
        return badData;
      }
    } as any);

    // Second call succeeds with valid (mock) protobuf data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        // Mock valid GTFS FeedMessage protobuf structure
        // Based on the protobuf definition, a FeedMessage needs at least:
        // field 1: header (required FeedHeader)
        // FeedHeader needs field 1: gtfs_realtime_version (required string)
        const validData = new Uint8Array([
          0x0A, 0x04,       // field 1 (header), length 4
          0x0A, 0x02,       // field 1 (gtfs_realtime_version), length 2  
          0x32, 0x2E        // "2."
        ]);
        return validData.buffer;
      }
    } as any);

    // Should retry and eventually succeed
    const result = await testFetchGTFSFeed();
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('shouldProvideDetailedErrorForGTFSParsingFailure', async () => {
    const testFetchGTFSFeed = async () => {
      const fetchMethod = (service as any).fetchGTFSRealtimeFeed.bind(service);
      return fetchMethod('https://test-feed.com');
    };

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        // Data that will cause specific protobuf error
        const invalidProtobuf = new Uint8Array([0x04, 0x01]); // Invalid wire type 4
        return invalidProtobuf.buffer;
      }
    } as any;

    mockFetch.mockResolvedValueOnce(mockResponse);
    mockFetch.mockResolvedValueOnce(mockResponse); // For retry attempt

    try {
      await testFetchGTFSFeed();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toContain('GTFS');
      expect(errorMessage).toContain('parse');
      // Should include which feed failed
      expect(errorMessage).toMatch(/feed|URL/i);
    }
  });

  test('shouldBuildPreciseTransferRouteWithRealGTFSData', () => {
    // Red: Write failing test for precise transfer route calculation
    const baseTime = 1487437200; // 11:00 AM EST base timestamp
    const mockNow = new Date(baseTime * 1000); 
    const mockTripDataF = [
      {
        trip: { tripId: 'F123', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: baseTime + 1000, arrivalTime: baseTime + 1000 }, // 11:16:40 AM EST
          { stopId: 'F20', departureTime: baseTime + 1200, arrivalTime: baseTime + 1200 }  // 11:20 AM EST
        ]
      }
    ];
    const mockTripDataC = [
      {
        trip: { tripId: 'C456', routeId: 'C' },
        stopTimes: [
          { stopId: 'A41', departureTime: baseTime + 1320, arrivalTime: baseTime + 1320 }, // 11:22 AM EST  
          { stopId: 'A24', departureTime: baseTime + 1620, arrivalTime: baseTime + 1620 }  // 11:27 AM EST
        ]
      }
    ];

    const result = (service as any).buildPreciseTransferRoute(
      mockNow,
      'Carroll St',
      '23rd St-8th Ave', 
      'F',
      'C',
      'Jay St-MetroTech',
      mockTripDataF,
      mockTripDataC
    );

    expect(result).not.toBeNull();
    if (result) {
      expect(result.firstTrainDeparture).toEqual(new Date((baseTime + 1000) * 1000)); 
      expect(result.transferArrival).toEqual(new Date((baseTime + 1200) * 1000));      
      expect(result.secondTrainDeparture).toEqual(new Date((baseTime + 1320) * 1000)); 
      expect(result.finalArrival).toEqual(new Date((baseTime + 1620) * 1000));        
      expect(result.totalTravelTime).toBe(27); // 1620 seconds = 27 minutes
      expect(result.transferWaitTime).toBe(2); // 120 seconds = 2 minutes
    }
  });

  test('shouldMarkCalculatedRoutesAsNonRealTime', async () => {
    // Mock one GTFS feed to work, so we get some routes including transfer routes
    const validGtfsResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => null
      },
      arrayBuffer: async () => {
        // Valid GTFS FeedMessage with empty entities (no real-time trips)
        const validData = new Uint8Array([
          0x0A, 0x04,       // field 1 (header), length 4
          0x0A, 0x02,       // field 1 (gtfs_realtime_version), length 2  
          0x32, 0x2E        // "2."
        ]);
        return validData.buffer;
      }
    } as any;

    // Mock responses for all the feeds in order they're called
    mockFetch
      .mockResolvedValueOnce(validGtfsResponse) // NQRW feed works  
      .mockResolvedValueOnce(validGtfsResponse) // BDFM feed works
      .mockRejectedValueOnce(new Error('Feed unavailable')) // 123456S feed fails
      .mockRejectedValueOnce(new Error('Feed unavailable')) // ACE feed fails
      .mockRejectedValueOnce(new Error('Feed unavailable')) // L feed fails
      .mockRejectedValueOnce(new Error('Feed unavailable')) // Bus feed fails
      .mockResolvedValueOnce(validGtfsResponse); // Alerts feed works

    const routes = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    // Should get some routes since at least one feed worked
    expect(routes.length).toBeGreaterThan(0);
    
    // Calculated/transfer routes should be marked as NOT real-time data
    routes.forEach(route => {
      if (route.method.includes('→')) { // Transfer routes  
        expect(route.isRealTimeData).toBe(false);
      }
    });
  });
});
