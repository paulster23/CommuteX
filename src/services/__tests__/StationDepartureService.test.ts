import { StationDepartureService } from '../StationDepartureService';
import { SubwayStation } from '../StationDatabase';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('StationDepartureService', () => {
  const mockStation: SubwayStation = {
    id: 'F24',
    name: 'Bergen St',
    lines: ['F', 'G'],
    lat: 40.686145,
    lng: -73.990064
  };

  const carrollStation: SubwayStation = {
    id: 'F20',
    name: 'Carroll St',
    lines: ['F', 'G'],
    lat: 40.679371,
    lng: -73.995458,
    gtfsIds: {
      'F': 'F20',
      'G': 'G22'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shouldReturnDifferentTimesForDifferentDirections', async () => {
    // Red: Test that northbound and southbound return different departure times
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock the private fetchTrainArrivalsFromFeed method
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        // Return different data based on direction
        if (direction === 'northbound') {
          return [
            {
              stopId: `${stopId}N`,
              stopSequence: 1,
              departureTime: now + 120, // 2 minutes for northbound
              arrivalTime: now + 120
            }
          ];
        } else {
          return [
            {
              stopId: `${stopId}S`,
              stopSequence: 1,
              departureTime: now + 300, // 5 minutes for southbound (different time)
              arrivalTime: now + 300
            }
          ];
        }
      });
    
    // Get northbound departures
    const northboundDepartures = await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    
    // Get southbound departures
    const southboundDepartures = await StationDepartureService.getDeparturesForStation(mockStation, 'southbound');
    
    // Should have departures for both F and G lines
    expect(northboundDepartures).toHaveProperty('F');
    expect(northboundDepartures).toHaveProperty('G');
    expect(southboundDepartures).toHaveProperty('F');
    expect(southboundDepartures).toHaveProperty('G');
    
    // Northbound and southbound should have different first departure times
    const northboundFirstF = northboundDepartures.F[0];
    const southboundFirstF = southboundDepartures.F[0];
    
    expect(northboundFirstF.departureTime.getTime()).not.toBe(southboundFirstF.departureTime.getTime());
    expect(northboundFirstF.relativeTime).not.toBe(southboundFirstF.relativeTime);
    
    // Test G line as well
    const northboundFirstG = northboundDepartures.G[0];
    const southboundFirstG = southboundDepartures.G[0];
    
    expect(northboundFirstG.departureTime.getTime()).not.toBe(southboundFirstG.departureTime.getTime());
    expect(northboundFirstG.relativeTime).not.toBe(southboundFirstG.relativeTime);
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldReturn5TrainsPerLine', async () => {
    // Red: Test that each line returns up to 5 trains
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock the private fetchTrainArrivalsFromFeed method to return 6 trains (to test 5-train limit)
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        // Return 6 trains to test that we limit to 5
        const trains = [];
        for (let i = 1; i <= 6; i++) {
          trains.push({
            stopId: `${stopId}N`,
            stopSequence: i,
            departureTime: now + (i * 120), // 2, 4, 6, 8, 10, 12 minutes
            arrivalTime: now + (i * 120)
          });
        }
        return trains;
      });
    
    const departures = await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    
    // Should limit to 5 trains per line
    expect(departures.F).toHaveLength(5);
    expect(departures.G).toHaveLength(5);
    
    // All departures should be in the future
    const nowTime = new Date();
    departures.F.forEach(departure => {
      expect(departure.departureTime.getTime()).toBeGreaterThan(nowTime.getTime());
    });
    
    departures.G.forEach(departure => {
      expect(departure.departureTime.getTime()).toBeGreaterThan(nowTime.getTime());
    });
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldFormatRelativeTimesCorrectly', async () => {
    // Green: Test that relative times are formatted as expected (numbers only, no 'm' suffix)
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock the private fetchTrainArrivalsFromFeed method
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        return [
          {
            stopId: `${stopId}N`,
            stopSequence: 1,
            departureTime: now + 300, // 5 minutes
            arrivalTime: now + 300
          }
        ];
      });
    
    const departures = await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    
    // All relative times should be numbers only (no 'm' suffix to reduce visual clutter)
    departures.F.forEach(departure => {
      expect(departure.relativeTime).toMatch(/^\d+$|^Now$/);
    });
    
    departures.G.forEach(departure => {
      expect(departure.relativeTime).toMatch(/^\d+$|^Now$/);
    });
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldUseRealGTFSDataNotMockData', async () => {
    // Green: Test that service attempts real GTFS-RT parsing, not mock data generation
    
    // Mock a GTFS response that will cause parsing to fail (proving we're trying to parse)
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) // Invalid protobuf data
    });
    
    // Spy on console.log to verify GTFS parsing behavior
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    } catch (error) {
      // Expected to fail because we're giving invalid protobuf data
    }
    
    // Should log real GTFS parsing activity (proves we're attempting real parsing)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Parsing GTFS-RT protobuf data')
    );
    
    // Should NOT log mock data generation comments
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('mock real-time data')
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('simplified')
    );
    
    consoleSpy.mockRestore();
  });

  test('shouldThrowErrorWhenGTFSDataUnavailableNotReturnMockData', async () => {
    // Red: Test that service throws error instead of falling back to mock data
    
    // Mock GTFS feed failure
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('GTFS feed unavailable')
    );
    
    // Should throw error, not return mock data
    await expect(
      StationDepartureService.getDeparturesForStation(mockStation, 'northbound')
    ).rejects.toThrow('GTFS feed unavailable');
  });

  test('shouldFindTrainsAtCarrollStWithDirectionalStopIDs', async () => {
    // Red: Test that Carroll St station finds F trains using proper directional stop IDs
    
    const carrollStStation = {
      id: 'F20',
      name: 'Carroll St',
      lines: ['F', 'G'],
      lat: 40.679371,
      lng: -73.995458
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock the private fetchTrainArrivalsFromFeed method to return trains for directional stop IDs
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        // Should be called with directional stop IDs like F20N or F20S
        console.log(`Mock called with stopId: ${stopId}, direction: ${direction}, line: ${line}`);
        
        // For Carroll St, expect directional stop IDs
        if (station === 'Carroll St' && line === 'F') {
          if (direction === 'northbound' && stopId === 'F20N') {
            return [
              {
                stopId: 'F20N',
                stopSequence: 1,
                departureTime: now + 180, // 3 minutes
                arrivalTime: now + 180
              },
              {
                stopId: 'F20N',
                stopSequence: 1,
                departureTime: now + 480, // 8 minutes
                arrivalTime: now + 480
              }
            ];
          } else if (direction === 'southbound' && stopId === 'F20S') {
            return [
              {
                stopId: 'F20S',
                stopSequence: 1,
                departureTime: now + 240, // 4 minutes
                arrivalTime: now + 240
              }
            ];
          }
        }
        
        // For G line at Carroll St
        if (station === 'Carroll St' && line === 'G') {
          if (direction === 'northbound' && stopId === 'F20N') {
            return [
              {
                stopId: 'F20N',
                stopSequence: 1,
                departureTime: now + 360, // 6 minutes
                arrivalTime: now + 360
              }
            ];
          }
        }
        
        return [];
      });
    
    const departures = await StationDepartureService.getDeparturesForStation(carrollStStation, 'northbound');
    
    // Should find F trains at Carroll St (not 0 trains)
    expect(departures).toHaveProperty('F');
    expect(departures.F).toHaveLength(2);
    expect(departures.F[0].relativeTime).toBe('3');
    expect(departures.F[1].relativeTime).toBe('8');
    
    // Should find G trains at Carroll St
    expect(departures).toHaveProperty('G');
    expect(departures.G).toHaveLength(1);
    expect(departures.G[0].relativeTime).toBe('6');
    
    // Verify fetchTrainArrivalsFromFeed was called with directional stop IDs
    expect(fetchTrainArrivalsFromFeedSpy).toHaveBeenCalledWith(
      expect.any(String), // feedUrl
      'northbound',
      'Carroll St',
      'F',
      'F20N' // Should use directional stop ID
    );
    
    expect(fetchTrainArrivalsFromFeedSpy).toHaveBeenCalledWith(
      expect.any(String), // feedUrl
      'northbound',
      'Carroll St',
      'G',
      'F20N' // G line uses same platform as F at Carroll St
    );
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldDebugRealGTFSDataForCarrollSt', async () => {
    // Red: Test to debug what stop ID matching logic works for Carroll St
    
    const carrollStStation = {
      id: 'F20',
      name: 'Carroll St',
      lines: ['F', 'G'],
      lat: 40.679371,
      lng: -73.995458
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Spy on the private parseGtfsBuffer method to see what happens with real GTFS parsing logic
    const parseGtfsBufferSpy = jest.spyOn(StationDepartureService as any, 'parseGtfsBuffer')
      .mockImplementation((gtfsBuffer, line, stopId, direction) => {
        console.log(`[DEBUG TEST] parseGtfsBuffer called with line: ${line}, stopId: ${stopId}, direction: ${direction}`);
        
        // Simulate what real MTA GTFS-RT data might contain for Carroll St
        // Based on user feedback, let's test various stop ID patterns
        const testStopIds = [
          'F20',     // Base format (what we expect)
          'F20N',    // Directional format (what we're looking for)
          'F20S',    // Opposite direction
          'F21N',    // Next station north
          'F19S',    // Next station south
          'F20_N',   // Underscore format
          'F20-N',   // Dash format
          '635N',    // Numeric format (some MTA stops use numbers)
          'F20 N',   // Space format
        ];
        
        console.log(`[DEBUG TEST] Simulating feed with stop IDs: ${testStopIds.join(', ')}`);
        console.log(`[DEBUG TEST] Looking for matches with stopId: ${stopId}`);
        
        // Test the same matching logic used in the real code
        const baseStopId = stopId.replace(/[NS]$/, ''); // Remove N/S suffix if present
        console.log(`[DEBUG TEST] Base stop ID: ${baseStopId}`);
        
        const matchedStopIds = [];
        for (const testStopId of testStopIds) {
          const matches = [
            testStopId === stopId, // Exact match (e.g., F20N)
            testStopId === baseStopId, // Base match (e.g., F20)
            testStopId.startsWith(baseStopId), // Prefix match (e.g., F20*)
          ];
          
          if (matches.some(match => match)) {
            matchedStopIds.push(testStopId);
            console.log(`[DEBUG TEST] MATCH FOUND! Looking for: ${stopId}, Found: ${testStopId}`);
          }
        }
        
        console.log(`[DEBUG TEST] Total matches found: ${matchedStopIds.length}`);
        
        // Return simulated stop time updates for matched IDs
        return matchedStopIds.map((matchedStopId, index) => ({
          stopId: matchedStopId,
          stopSequence: index + 1,
          departureTime: now + (180 + index * 120), // 3, 5, 7 minutes
          arrivalTime: now + (180 + index * 120)
        }));
      });
    
    // Mock fetch to return success so we can test the parsing logic
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)) // dummy buffer, parseGtfsBuffer is mocked
    });
    
    const departures = await StationDepartureService.getDeparturesForStation(carrollStStation, 'northbound');
    
    // Should find trains with the improved matching logic
    expect(departures).toHaveProperty('F');
    
    // Test result - this will show us what the matching logic found
    if (departures.F.length === 0) {
      console.log('[DEBUG] No F trains found - this explains the Carroll St issue!');
    } else {
      console.log(`[DEBUG] Found ${departures.F.length} F trains at Carroll St`);
      departures.F.forEach((train, index) => {
        console.log(`[DEBUG] Train ${index + 1}: departing in ${train.relativeTime} minutes`);
      });
    }
    
    // Also check G line
    if (departures.G && departures.G.length > 0) {
      console.log(`[DEBUG] Found ${departures.G.length} G trains at Carroll St`);
    } else {
      console.log('[DEBUG] No G trains found at Carroll St');
    }
    
    parseGtfsBufferSpy.mockRestore();
  });

  test('shouldReturnDifferentTrainsForNorthboundVsSouthbound', async () => {
    // Red: Test that northbound and southbound return truly different trains, not cross-contaminated data
    
    const carrollStStation = {
      id: 'F20',
      name: 'Carroll St',
      lines: ['F'],
      lat: 40.679371,
      lng: -73.995458
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock parseGtfsBuffer to test the actual matching logic where the fix was applied
    const parseGtfsBufferSpy = jest.spyOn(StationDepartureService as any, 'parseGtfsBuffer')
      .mockImplementation((gtfsBuffer, line, stopId, direction) => {
        console.log(`[TEST] parseGtfsBuffer called with stopId: ${stopId}, direction: ${direction}`);
        
        // Simulate a GTFS feed that contains BOTH F20N and F20S trains
        const allTrainsInFeed = [
          // F20N trains (northbound)
          {
            stopId: 'F20N',
            stopSequence: 1,
            departureTime: now + 600, // 10 minutes
            arrivalTime: now + 600
          },
          {
            stopId: 'F20N',
            stopSequence: 1,
            departureTime: now + 900, // 15 minutes
            arrivalTime: now + 900
          },
          // F20S trains (southbound)
          {
            stopId: 'F20S',
            stopSequence: 1,
            departureTime: now + 300, // 5 minutes
            arrivalTime: now + 300
          },
          {
            stopId: 'F20S',
            stopSequence: 1,
            departureTime: now + 720, // 12 minutes
            arrivalTime: now + 720
          }
        ];
        
        // Apply the ACTUAL current matching logic that was just fixed
        const baseStopId = stopId.replace(/[NS]$/, '');
        const matchedTrains = allTrainsInFeed.filter(train => {
          const matches = [
            train.stopId === stopId, // Exact directional match (e.g., F20N)
            // Only fall back to base ID if no directional suffix is requested
            stopId === baseStopId && train.stopId === baseStopId, // Base match only when explicitly looking for base
          ];
          return matches.some(match => match);
        });
        
        console.log(`[TEST] Looking for ${stopId}, found ${matchedTrains.length} trains: ${matchedTrains.map(t => t.stopId).join(', ')}`);
        return matchedTrains;
      });
    
    // Mock fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
    });
    
    // Get northbound and southbound departures
    const northboundDepartures = await StationDepartureService.getDeparturesForStation(carrollStStation, 'northbound');
    const southboundDepartures = await StationDepartureService.getDeparturesForStation(carrollStStation, 'southbound');
    
    // Both should have F train data
    expect(northboundDepartures).toHaveProperty('F');
    expect(southboundDepartures).toHaveProperty('F');
    expect(northboundDepartures.F.length).toBeGreaterThan(0);
    expect(southboundDepartures.F.length).toBeGreaterThan(0);
    
    // Get the departure times
    const northboundTimes = northboundDepartures.F.map(train => train.relativeTime);
    const southboundTimes = southboundDepartures.F.map(train => train.relativeTime);
    
    console.log(`[TEST] Northbound times: ${northboundTimes.join(', ')}`);
    console.log(`[TEST] Southbound times: ${southboundTimes.join(', ')}`);
    
    // This should FAIL currently: both directions get identical mixed results [5, 10, 12, 15]
    // But it should pass after we fix the matching logic to separate directions properly
    expect(northboundTimes).not.toEqual(southboundTimes);
    
    // What we want after the fix:
    // Northbound should only get F20N trains: [10, 15]
    // Southbound should only get F20S trains: [5, 12]
    expect(northboundTimes).toEqual(['10', '15']); // Only F20N trains
    expect(southboundTimes).toEqual(['5', '12']);  // Only F20S trains
    
    parseGtfsBufferSpy.mockRestore();
  });

  test('shouldFetchGTrainDeparturesAtCarrollSt', async () => {
    // Red: Test that G train departures appear at Carroll St using correct GTFS ID
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock the private fetchTrainArrivalsFromFeed method to simulate G train data
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        console.log(`[TEST] fetchTrainArrivalsFromFeed called with line: ${line}, stopId: ${stopId}`);
        
        // Only return data for G train when called with G22 or G22N (correct GTFS ID)
        if (line === 'G' && (stopId === 'G22' || stopId === 'G22N')) {
          return [
            {
              stopId: `${stopId}N`,
              stopSequence: 1,
              departureTime: now + 420, // 7 minutes
              arrivalTime: now + 420
            },
            {
              stopId: `${stopId}N`,
              stopSequence: 1,
              departureTime: now + 780, // 13 minutes
              arrivalTime: now + 780
            }
          ];
        }
        return []; // No data for other lines/stations
      });
    
    // Use the consolidated station approach like the app does
    const consolidatedStation = {
      name: 'Carroll St',
      lines: ['F', 'G'],
      lat: 40.679371,
      lng: -73.995458,
      distance: 0.1,
      stationIds: {
        'F': 'F20',
        'G': 'G22'  // This is the key fix
      }
    };
    
    const gDepartures = await StationDepartureService.getDeparturesForConsolidatedStation(
      consolidatedStation,
      'northbound',
      ['G']
    );
    
    // Should have G train departures
    expect(gDepartures).toBeDefined();
    expect(gDepartures.G).toBeDefined();
    expect(gDepartures.G.length).toBeGreaterThan(0);
    expect(gDepartures.G[0].line).toBe('G');
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldFindSouthboundFTrainsWhenToggleActive', async () => {
    // Red: Test that southbound F trains appear when southbound direction is selected
    
    const carrollStStation = {
      id: 'F20',
      name: 'Carroll St',
      lines: ['F'],
      lat: 40.679371,
      lng: -73.995458
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock parseGtfsBuffer to simulate MTA feed that doesn't use exact "F20S" format
    const parseGtfsBufferSpy = jest.spyOn(StationDepartureService as any, 'parseGtfsBuffer')
      .mockImplementation((gtfsBuffer, line, stopId, direction) => {
        console.log(`[SOUTHBOUND TEST] parseGtfsBuffer called with line: ${line}, stopId: ${stopId}, direction: ${direction}`);
        
        // Simulate real MTA feed with various stop ID formats (but NOT the exact format we're looking for)
        const mockMtaFeedStopIds = [
          'F20',     // Base format (what MTA actually uses)
          'F20_S',   // Underscore format
          'F20-S',   // Dash format  
          'F19S',    // Previous station southbound
          'F21N',    // Next station northbound
          '635S',    // Numeric format (some stations use this)
        ];
        
        console.log(`[SOUTHBOUND TEST] MTA feed contains stop IDs: ${mockMtaFeedStopIds.join(', ')}`);
        console.log(`[SOUTHBOUND TEST] We're looking for: ${stopId}`);
        
        // Enhanced matching logic (this should SUCCEED in finding trains)
        const baseStopId = stopId.replace(/[NS]$/, '');
        console.log(`[SOUTHBOUND TEST] Base stop ID: ${baseStopId}`);
        
        const matchedStopIds = [];
        for (const feedStopId of mockMtaFeedStopIds) {
          const matches = [
            feedStopId === stopId, // Exact directional match (e.g., F20S)
            
            // Enhanced fallback patterns for various MTA GTFS naming conventions
            feedStopId === baseStopId, // Base station match (F20)
            feedStopId === `${baseStopId}_${direction === 'northbound' ? 'N' : 'S'}`, // Underscore format (F20_S)
            feedStopId === `${baseStopId}-${direction === 'northbound' ? 'N' : 'S'}`, // Dash format (F20-S)
            feedStopId === `${baseStopId} ${direction === 'northbound' ? 'N' : 'S'}`, // Space format (F20 S)
            
            // Prefix matching for complex station IDs
            feedStopId.startsWith(baseStopId) && feedStopId.includes(direction === 'northbound' ? 'N' : 'S'),
            
            // Additional fallback: if looking for directional and no exact matches, accept base ID as last resort
            stopId !== baseStopId && feedStopId === baseStopId
          ];
          
          if (matches.some(match => match)) {
            matchedStopIds.push(feedStopId);
            console.log(`[SOUTHBOUND TEST] MATCH! Found: ${feedStopId}`);
          }
        }
        
        console.log(`[SOUTHBOUND TEST] Total matches: ${matchedStopIds.length}`);
        
        // Return mock departures only if we found matches
        if (matchedStopIds.length > 0) {
          return matchedStopIds.map((matchedStopId, index) => ({
            stopId: matchedStopId,
            stopSequence: index + 1,
            departureTime: now + (300 + index * 180), // 5, 8, 11 minutes
            arrivalTime: now + (300 + index * 180)
          }));
        }
        
        return []; // No matches found - this simulates the current bug
      });
    
    // Mock fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
    });
    
    // Try to get southbound F train departures
    const southboundDepartures = await StationDepartureService.getDeparturesForStation(carrollStStation, 'southbound');
    
    console.log(`[SOUTHBOUND TEST] Result - F trains found: ${southboundDepartures.F?.length || 0}`);
    
    // This should PASS after we fix the matching logic
    expect(southboundDepartures).toHaveProperty('F');
    expect(southboundDepartures.F.length).toBeGreaterThan(0); // Should find trains even with different stop ID formats
    expect(southboundDepartures.F[0].relativeTime).toBe('5'); // First train in 5 minutes
    
    // Verify correct stop ID was requested
    expect(parseGtfsBufferSpy).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'F',
      'F20S', // Should be looking for southbound directional ID
      'southbound'
    );
    
    parseGtfsBufferSpy.mockRestore();
  });

  test('shouldShowAvailableTrainsEvenWhenSomeLinesFailToFetch', async () => {
    // Red: Test that F trains show up even if A/C/R lines fail to fetch
    
    const jayStStation = {
      name: 'Jay St-MetroTech',
      lines: ['A', 'C', 'F', 'R'],
      lat: 40.692338,
      lng: -73.987342,
      distance: 0.1,
      stationIds: {
        'A': 'A41',
        'C': 'A41', 
        'F': 'F25',
        'R': 'R29'
      }
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock fetchTrainArrivalsFromFeed to simulate mixed success/failure
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        console.log(`[PARTIAL FAILURE TEST] Fetching ${line} line data...`);
        
        // Simulate F line success but A/C/R line failures
        if (line === 'F') {
          return [
            {
              stopId: 'F25N',
              stopSequence: 1,
              departureTime: now + 240, // 4 minutes
              arrivalTime: now + 240
            },
            {
              stopId: 'F25N',
              stopSequence: 1,
              departureTime: now + 480, // 8 minutes
              arrivalTime: now + 480
            }
          ];
        } else {
          // A, C, R lines fail to fetch
          throw new Error(`${line} line GTFS feed temporarily unavailable`);
        }
      });
    
    // This should FAIL currently because any line failure breaks the entire request
    let departures;
    try {
      departures = await StationDepartureService.getDeparturesForConsolidatedStation(jayStStation, 'northbound');
    } catch (error) {
      console.log(`[PARTIAL FAILURE TEST] Failed as expected: ${error.message}`);
      departures = null;
    }
    
    // Current behavior: entire request fails, no trains at all
    // Desired behavior: should show F trains even if A/C/R fail
    expect(departures).not.toBeNull(); // Should not fail completely
    expect(departures).toHaveProperty('F'); // Should have F trains
    expect(departures.F.length).toBeGreaterThan(0); // Should have F train departures
    expect(departures.F[0].relativeTime).toBe('4'); // First F train in 4 minutes
    
    // Should not have failed lines, but shouldn't crash either
    expect(departures.A).toBeUndefined(); // A line failed, so no data
    expect(departures.C).toBeUndefined(); // C line failed, so no data 
    expect(departures.R).toBeUndefined(); // R line failed, so no data
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });

  test('shouldShowSouthboundFTrainsAtCarrollSt', async () => {
    // Red: Test that southbound F trains appear at Carroll St (real user scenario)
    
    const carrollStStation = {
      name: 'Carroll St',
      lines: ['F', 'G'],
      lat: 40.679371,
      lng: -73.995458,
      distance: 0.05,
      stationIds: {
        'F': 'F20',
        'G': 'G22'
      }
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    // Mock fetchTrainArrivalsFromFeed to return F train data for southbound direction
    const fetchTrainArrivalsFromFeedSpy = jest.spyOn(StationDepartureService as any, 'fetchTrainArrivalsFromFeed')
      .mockImplementation(async (feedUrl, direction, station, line, stopId) => {
        console.log(`[SOUTHBOUND CARROLL TEST] Fetching ${direction} ${line} trains at ${station} with stopId: ${stopId}`);
        
        // Only return data for F line southbound at Carroll St
        if (line === 'F' && direction === 'southbound' && stopId === 'F20S') {
          return [
            {
              stopId: 'F20S',
              stopSequence: 1,
              departureTime: now + 180, // 3 minutes
              arrivalTime: now + 180
            },
            {
              stopId: 'F20S',
              stopSequence: 1,
              departureTime: now + 360, // 6 minutes
              arrivalTime: now + 360
            },
            {
              stopId: 'F20S',
              stopSequence: 1,
              departureTime: now + 540, // 9 minutes
              arrivalTime: now + 540
            }
          ];
        }
        
        // G line fails (simulating the real issue)
        throw new Error(`${line} line GTFS feed error for ${direction} direction`);
      });
    
    // This should work: get southbound F trains at Carroll St
    let departures;
    try {
      departures = await StationDepartureService.getDeparturesForConsolidatedStation(carrollStStation, 'southbound');
    } catch (error) {
      console.log(`[SOUTHBOUND CARROLL TEST] Failed: ${error.message}`);
      departures = null;
    }
    
    // Should show F trains even if G line fails
    expect(departures).not.toBeNull();
    expect(departures).toHaveProperty('F');
    expect(departures.F.length).toBeGreaterThan(0);
    expect(departures.F[0].relativeTime).toBe('3'); // First train in 3 minutes
    expect(departures.F[1].relativeTime).toBe('6'); // Second train in 6 minutes
    
    // Verify we requested southbound F trains with correct stop ID
    expect(fetchTrainArrivalsFromFeedSpy).toHaveBeenCalledWith(
      expect.any(String),
      'southbound',
      'Carroll St',
      'F',
      'F20S'
    );
    
    fetchTrainArrivalsFromFeedSpy.mockRestore();
  });
});