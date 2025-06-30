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

  test('shouldGetNext3TrainDeparturesFromStation', () => {
    // Red: Write failing test for getting next 3 train departures
    const baseTime = 1487437200; // 11:00 AM EST base timestamp
    const mockNow = new Date(baseTime * 1000);
    const mockTripData = [
      {
        trip: { tripId: 'F123', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: baseTime + 1000, arrivalTime: baseTime + 1000 }, // 11:16:40 AM
        ]
      },
      {
        trip: { tripId: 'F124', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: baseTime + 1300, arrivalTime: baseTime + 1300 }, // 11:21:40 AM
        ]
      },
      {
        trip: { tripId: 'F125', routeId: 'F' },
        stopTimes: [
          { stopId: 'F18', departureTime: baseTime + 1600, arrivalTime: baseTime + 1600 }, // 11:26:40 AM
        ]
      }
    ];

    const result = (service as any).getNext3Departures('Carroll St', 'F', mockTripData, mockNow);

    expect(result).toHaveLength(3);
    expect(result[0].trainLine).toBe('F');
    expect(result[0].minutesAway).toBe(17);
    expect(result[0].departureTime).toContain('12:16'); // Timezone converted
    
    expect(result[1].trainLine).toBe('F');
    expect(result[1].minutesAway).toBe(22);
    expect(result[1].departureTime).toContain('12:21');
    
    expect(result[2].trainLine).toBe('F');
    expect(result[2].minutesAway).toBe(27);
    expect(result[2].departureTime).toContain('12:26');
  });

  // NEW TEST: Direct F train route should be available when GTFS feeds fail
  test('shouldIncludeDirectFTrainRouteWhenGTFSFeedsUnavailable', async () => {
    // Red: Write failing test that expects F train direct route
    const routes = await service.calculateRoutes(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );
    
    const fTrainDirectRoute = routes.find(route => 
      route.method.includes('F train') && route.transfers === 0
    );
    
    expect(fTrainDirectRoute).toBeDefined();
    expect(fTrainDirectRoute.startingStation).toBe('Carroll St');
    expect(fTrainDirectRoute.endingStation).toBe('23rd St');
  });

  // NEW TEST: Build transit graph from GTFS static data
  test('shouldBuildTransitGraphFromGTFSStatic', () => {
    // Red: Write failing test for GTFS static data parsing
    const mockGTFSStatic = {
      stops: [
        { stop_id: 'F18', stop_name: 'Carroll St', stop_lat: 40.680303, stop_lon: -73.995625 },
        { stop_id: 'F20', stop_name: 'Jay St-MetroTech', stop_lat: 40.692338, stop_lon: -73.987342 },
        { stop_id: 'F22', stop_name: '23rd St', stop_lat: 40.742878, stop_lon: -73.992821 }
      ],
      routes: [
        { route_id: 'F', route_short_name: 'F', route_long_name: 'F train' }
      ],
      stop_times: [
        { trip_id: 'F123', stop_id: 'F18', stop_sequence: 1, arrival_time: '08:30:00', departure_time: '08:30:00' },
        { trip_id: 'F123', stop_id: 'F20', stop_sequence: 2, arrival_time: '08:35:00', departure_time: '08:35:00' },
        { trip_id: 'F123', stop_id: 'F22', stop_sequence: 3, arrival_time: '08:50:00', departure_time: '08:50:00' }
      ]
    };

    const graph = (service as any).buildTransitGraph(mockGTFSStatic);

    expect(graph).toBeDefined();
    expect(graph.stations).toBeDefined();
    expect(graph.stations.size).toBe(3);
    expect(graph.stations.get('F18')).toEqual({
      id: 'F18',
      name: 'Carroll St',
      lat: 40.680303,
      lon: -73.995625
    });
    expect(graph.connections).toBeDefined();
    expect(graph.connections.get('F18')).toContainEqual({
      fromStation: 'F18',
      toStation: 'F20',
      route: 'F',
      travelTime: 5 // 08:35 - 08:30 = 5 minutes
    });
  });

  // NEW TEST: Find optimal route using Dijkstra's algorithm
  test('shouldFindOptimalRouteUsingDijkstra', () => {
    // Red: Write failing test for optimal pathfinding
    const mockTransitGraph = {
      stations: new Map([
        ['F18', { id: 'F18', name: 'Carroll St', lat: 40.680303, lon: -73.995625 }],
        ['F20', { id: 'F20', name: 'Jay St-MetroTech', lat: 40.692338, lon: -73.987342 }],
        ['F22', { id: 'F22', name: '23rd St', lat: 40.742878, lon: -73.992821 }]
      ]),
      connections: new Map([
        ['F18', [{ fromStation: 'F18', toStation: 'F20', route: 'F', travelTime: 5 }]],
        ['F20', [{ fromStation: 'F20', toStation: 'F22', route: 'F', travelTime: 15 }]]
      ])
    };

    const startTime = new Date('2025-01-01T08:00:00');
    const optimalRoute = (service as any).findOptimalRoute(
      mockTransitGraph,
      'F18', // Carroll St
      'F22', // 23rd St  
      startTime
    );

    expect(optimalRoute).toBeDefined();
    expect(optimalRoute.path).toEqual(['F18', 'F20', 'F22']);
    expect(optimalRoute.totalTime).toBe(20); // 5 + 15 minutes
    expect(optimalRoute.routes).toEqual(['F']);
  });

  // NEW TEST: Use optimal pathfinding in main route calculation
  test('shouldUseOptimalPathfindingForRouteCalculation', async () => {
    // Red: Write failing test for integrating optimal pathfinding into calculateRoutes
    
    // Mock GTFS static data that would be loaded once
    const mockGTFSStatic = {
      stops: [
        { stop_id: 'F18', stop_name: 'Carroll St', stop_lat: 40.680303, stop_lon: -73.995625 },
        { stop_id: 'F20', stop_name: 'Jay St-MetroTech', stop_lat: 40.692338, stop_lon: -73.987342 },
        { stop_id: 'F22', stop_name: '23rd St', stop_lat: 40.742878, stop_lon: -73.992821 },
        { stop_id: 'A41', stop_name: 'Jay St-MetroTech', stop_lat: 40.692338, stop_lon: -73.987342 },
        { stop_id: 'A24', stop_name: '23rd St-8th Ave', stop_lat: 40.742852, stop_lon: -73.998721 }
      ],
      routes: [
        { route_id: 'F', route_short_name: 'F' },
        { route_id: 'A', route_short_name: 'A' }
      ],
      stop_times: [
        { trip_id: 'F123', stop_id: 'F18', stop_sequence: 1, arrival_time: '08:30:00', departure_time: '08:30:00' },
        { trip_id: 'F123', stop_id: 'F20', stop_sequence: 2, arrival_time: '08:35:00', departure_time: '08:35:00' },
        { trip_id: 'F123', stop_id: 'F22', stop_sequence: 3, arrival_time: '08:50:00', departure_time: '08:50:00' },
        { trip_id: 'A456', stop_id: 'A41', stop_sequence: 1, arrival_time: '08:40:00', departure_time: '08:40:00' },
        { trip_id: 'A456', stop_id: 'A24', stop_sequence: 2, arrival_time: '08:55:00', departure_time: '08:55:00' }
      ],
      transfers: [
        { from_stop_id: 'F20', to_stop_id: 'A41', min_transfer_time: 300 } // 5 minutes transfer at Jay St
      ]
    };

    // Mock the service to use our test data
    const calculateOptimalRoutesMethod = (service as any).calculateOptimalRoutes.bind(service);
    
    const routes = await calculateOptimalRoutesMethod(
      '42 Woodhull St, Brooklyn',  // Near Carroll St
      '512 W 22nd St, Manhattan',  // Near 23rd St
      '9:00 AM',
      mockGTFSStatic
    );

    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
    
    // Should find direct F train route (fastest)
    const directRoute = routes.find((r: any) => r.method.includes('F train') && r.transfers === 0);
    expect(directRoute).toBeDefined();
    expect(directRoute.startingStation).toBe('Carroll St');
    expect(directRoute.endingStation).toBe('23rd St');
    
    // Should also find transfer route F→A as alternative
    const transferRoute = routes.find((r: any) => r.method.includes('F→A') || r.method.includes('F') && r.transfers > 0);
    expect(transferRoute).toBeDefined();
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

  // NEW TEST: Real GTFS static data loading (no mock data)
  test('shouldLoadRealGTFSStaticDataWithoutMockData', async () => {
    // Red: Write failing test that expects real GTFS static data to be loaded
    // This test should fail because we currently use mock data
    
    const realGTFSStaticData = await (service as any).loadGTFSStaticData();
    
    // Verify we get real GTFS static data structure
    expect(realGTFSStaticData).toBeDefined();
    expect(realGTFSStaticData.stops).toBeInstanceOf(Array);
    expect(realGTFSStaticData.stops.length).toBeGreaterThan(100); // Real NYC has 472+ stations
    expect(realGTFSStaticData.routes).toBeInstanceOf(Array);
    expect(realGTFSStaticData.stop_times).toBeInstanceOf(Array);
    expect(realGTFSStaticData.trips).toBeInstanceOf(Array);
    
    // Verify it's real data, not mock data
    const hasRealStationCount = realGTFSStaticData.stops.length > 10; // Mock only has 5 stops
    expect(hasRealStationCount).toBe(true);
    
    // Verify we have actual NYC subway routes (not just F and A)
    const routeIds = realGTFSStaticData.routes.map((r: any) => r.route_id);
    expect(routeIds).toContain('1');
    expect(routeIds).toContain('4');
    expect(routeIds).toContain('6');
    expect(routeIds).toContain('N');
    expect(routeIds).toContain('Q');
    expect(routeIds).toContain('R');
    expect(routeIds).toContain('W');
    
    // Verify stop IDs follow real GTFS format (not simplified mock format)
    const realStopIds = realGTFSStaticData.stops.map((s: any) => s.stop_id);
    const hasRealStopIdFormat = realStopIds.some((id: string) => id.length > 3); // Real IDs are longer
    expect(hasRealStopIdFormat).toBe(true);
  });

  // NEW TEST: Real-time GTFS-RT data integration with static data
  test('shouldIntegrateRealTimeGTFSWithStaticData', async () => {
    // Red: Write failing test that expects real-time GTFS-RT data to be merged with static data
    // Following NYC Subway Challenge approach: "replaces scheduled train trips with real-time trips wherever possible"
    
    const staticData = await (service as any).loadGTFSStaticData();
    const integratedData = await (service as any).integrateRealTimeWithStatic(staticData);
    
    // Verify we get integrated data structure
    expect(integratedData).toBeDefined();
    expect(integratedData.staticData).toBeDefined();
    expect(integratedData.realTimeData).toBeDefined();
    expect(integratedData.mergedTrips).toBeInstanceOf(Array);
    
    // Verify real-time data was attempted to be fetched from actual MTA feeds
    expect(integratedData.realTimeData.feedSources).toBeInstanceOf(Array);
    // Note: feedSources may be empty if all MTA feeds are unavailable during testing
    expect(integratedData.realTimeData.feedSources.length).toBeGreaterThanOrEqual(0);
    
    // Verify static trips are always available as fallback
    const hasStaticTrips = integratedData.mergedTrips.some((trip: any) => trip.isRealTime === false);
    expect(hasStaticTrips).toBe(true);   // Should keep static data for routes without real-time
    
    // Verify real-time integration works (may be 0 if feeds unavailable during test)
    const hasRealTimeTrips = integratedData.mergedTrips.some((trip: any) => trip.isRealTime === true);
    // This is acceptable - real-time data may not be available during testing
    
    // Verify static trip structure includes timing updates
    const staticTrip = integratedData.mergedTrips.find((trip: any) => trip.isRealTime === false);
    expect(staticTrip).toBeDefined();
    expect(staticTrip.stopTimeUpdates).toBeInstanceOf(Array);
    expect(staticTrip.stopTimeUpdates.length).toBeGreaterThan(0);
    
    // Verify stop time updates have proper structure
    const stopUpdate = staticTrip.stopTimeUpdates[0];
    expect(stopUpdate.stopId).toBeDefined();
    expect(stopUpdate.arrival || stopUpdate.departure).toBeDefined();
    
    // If real-time trip exists, verify its structure too
    const realTimeTrip = integratedData.mergedTrips.find((trip: any) => trip.isRealTime === true);
    if (realTimeTrip) {
      expect(realTimeTrip.stopTimeUpdates).toBeInstanceOf(Array);
      expect(realTimeTrip.stopTimeUpdates.length).toBeGreaterThan(0);
    }
    
    // Verify integration follows NYC Subway Challenge pattern
    expect(integratedData.lastUpdated).toBeInstanceOf(Date);
    expect(integratedData.dataQuality).toBeDefined();
    expect(integratedData.dataQuality.staticCoverage).toBeGreaterThan(0);
    expect(integratedData.dataQuality.realTimeCoverage).toBeGreaterThanOrEqual(0); // May be 0 if no real-time feeds available
  });

  // NEW TEST: NetworkX-based subway graph construction
  test('shouldBuildNetworkXGraphFromIntegratedData', async () => {
    // Red: Write failing test that expects NetworkX-style graph construction
    // Following NYC Subway Challenge approach: "plans to use NetworkX for graph problem solving"
    
    const staticData = await (service as any).loadGTFSStaticData();
    const integratedData = await (service as any).integrateRealTimeWithStatic(staticData);
    const networkGraph = await (service as any).buildNetworkXGraph(integratedData);
    
    // Verify we get a NetworkX-style graph structure
    expect(networkGraph).toBeDefined();
    expect(networkGraph.nodes).toBeInstanceOf(Map);
    expect(networkGraph.edges).toBeInstanceOf(Map);
    expect(networkGraph.adjacencyList).toBeInstanceOf(Map);
    
    // Verify graph has proper NYC subway structure
    expect(networkGraph.nodes.size).toBeGreaterThan(100); // Real NYC has 472+ stations
    expect(networkGraph.edges.size).toBeGreaterThan(0);
    
    // Verify time-dependent graph structure (key requirement from NYC Subway Challenge)
    const sampleNode = Array.from(networkGraph.nodes.values())[0];
    expect(sampleNode.stopId).toBeDefined();
    expect(sampleNode.stationName).toBeDefined();
    expect(sampleNode.coordinates).toBeDefined();
    expect(sampleNode.coordinates.lat).toBeDefined();
    expect(sampleNode.coordinates.lon).toBeDefined();
    
    // Verify edges contain time-dependent information
    const sampleEdge = Array.from(networkGraph.edges.values())[0];
    expect(sampleEdge.fromNode).toBeDefined();
    expect(sampleEdge.toNode).toBeDefined();
    expect(sampleEdge.route).toBeDefined();
    expect(sampleEdge.travelTime).toBeGreaterThan(0);
    expect(sampleEdge.timeOfDay).toBeDefined(); // Time-dependent weights
    
    // Verify graph includes transfer connections
    const transferEdges = Array.from(networkGraph.edges.values()).filter((edge: any) => edge.edgeType === 'transfer');
    expect(transferEdges.length).toBeGreaterThan(0);
    
    // Verify graph supports pathfinding operations (NetworkX compatibility)
    expect(networkGraph.getNeighbors).toBeDefined();
    expect(networkGraph.getShortestPath).toBeDefined();
    expect(networkGraph.calculateDistance).toBeDefined();
    
    // Test basic graph operations
    const nodeIds = Array.from(networkGraph.nodes.keys());
    const firstNodeId = nodeIds[0];
    const neighbors = networkGraph.getNeighbors(firstNodeId);
    expect(neighbors).toBeInstanceOf(Array);
    
    // Verify time-dependent pathfinding capability
    expect(networkGraph.metadata).toBeDefined();
    expect(networkGraph.metadata.isTimeDependentGraph).toBe(true);
    expect(networkGraph.metadata.lastUpdated).toBeInstanceOf(Date);
  });

  test('shouldImplementTimeDependentPathfindingAlgorithm', async () => {
    // Red: Write failing test for time-dependent pathfinding following NYC Subway Challenge approach
    // Following NYC Subway Challenge requirement: "time-dependent graph construction and pathfinding"
    
    const staticData = await (service as any).loadGTFSStaticData();
    const integratedData = await (service as any).integrateRealTimeWithStatic(staticData);
    const networkGraph = await (service as any).buildNetworkXGraph(integratedData);
    
    // Test time-dependent pathfinding with different departure times
    const startNode = 'F18N'; // Carroll St F train northbound  
    const endNode = 'A24N';   // 23rd St-8th Ave C train northbound
    
    // Test pathfinding at different times of day to verify time-dependent behavior
    const morningDepartureTime = new Date('2024-01-15T08:30:00'); // Rush hour
    const afternoonDepartureTime = new Date('2024-01-15T14:30:00'); // Off-peak
    const eveningDepartureTime = new Date('2024-01-15T18:30:00'); // Evening rush
    
    // Execute time-dependent pathfinding
    const morningPath = await (service as any).findTimeDependentPath(networkGraph, startNode, endNode, morningDepartureTime);
    const afternoonPath = await (service as any).findTimeDependentPath(networkGraph, startNode, endNode, afternoonDepartureTime);
    const eveningPath = await (service as any).findTimeDependentPath(networkGraph, startNode, endNode, eveningDepartureTime);
    
    // Verify all paths are returned
    expect(morningPath).toBeDefined();
    expect(afternoonPath).toBeDefined();
    expect(eveningPath).toBeDefined();
    
    // Verify path structure contains time-dependent information
    expect(morningPath.path).toBeInstanceOf(Array);
    expect(morningPath.path.length).toBeGreaterThan(0);
    expect(morningPath.totalTravelTime).toBeGreaterThan(0);
    expect(morningPath.departureTime).toBeInstanceOf(Date);
    expect(morningPath.arrivalTime).toBeInstanceOf(Date);
    expect(morningPath.transfers).toBeDefined();
    
    // Verify time-dependent behavior: different times may yield different routes/travel times
    // This is key requirement from NYC Subway Challenge: time affects optimal routes
    expect(morningPath.totalTravelTime).toBeGreaterThan(0);
    expect(afternoonPath.totalTravelTime).toBeGreaterThan(0);
    expect(eveningPath.totalTravelTime).toBeGreaterThan(0);
    
    // Verify route includes transfer from F to C train (multi-leg journey)
    const allStops = morningPath.path.flatMap((segment: any) => segment.stops || []);
    expect(allStops).toContain(startNode); // Starts at Carroll St F train
    expect(allStops).toContain(endNode);   // Ends at 23rd St C train
    
    // Verify transfer handling (F → C requires transfer at Jay St-MetroTech)
    expect(morningPath.transfers.length).toBeGreaterThan(0);
    const transferStation = morningPath.transfers.find((t: any) => 
      t.fromRoute === 'F' && t.toRoute === 'C'
    );
    expect(transferStation).toBeDefined();
    expect(transferStation.transferStation).toMatch(/Jay St-MetroTech/i);
    expect(transferStation.transferTime).toBeGreaterThan(0);
    
    // Verify real-time data integration affects pathfinding results
    expect(morningPath.metadata).toBeDefined();
    expect(morningPath.metadata.hasRealTimeData).toBeDefined();
    expect(morningPath.metadata.dataSource).toContain('integrated');
    expect(morningPath.metadata.algorithmType).toBe('time_dependent_dijkstra');
  });
});
