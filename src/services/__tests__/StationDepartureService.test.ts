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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    });
  });

  test('shouldReturnDifferentTimesForDifferentDirections', async () => {
    // Red: Test that northbound and southbound return different departure times
    
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
  });

  test('shouldReturn5TrainsPerLine', async () => {
    // Red: Test that each line returns up to 5 trains
    const departures = await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    
    // Should limit to 5 trains per line
    expect(departures.F).toHaveLength(5);
    expect(departures.G).toHaveLength(5);
    
    // All departures should be in the future
    const now = new Date();
    departures.F.forEach(departure => {
      expect(departure.departureTime.getTime()).toBeGreaterThan(now.getTime());
    });
    
    departures.G.forEach(departure => {
      expect(departure.departureTime.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  test('shouldFormatRelativeTimesCorrectly', async () => {
    // Red: Test that relative times are formatted as expected
    const departures = await StationDepartureService.getDeparturesForStation(mockStation, 'northbound');
    
    // All relative times should end with 'm' (for minutes)
    departures.F.forEach(departure => {
      expect(departure.relativeTime).toMatch(/^\d+m$/);
    });
    
    departures.G.forEach(departure => {
      expect(departure.relativeTime).toMatch(/^\d+m$/);
    });
  });
});