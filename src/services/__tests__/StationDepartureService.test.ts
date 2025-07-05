import { StationDepartureService, TrainDeparture, DeparturesByLine } from '../StationDepartureService';
import { SubwayStation } from '../StationDatabase';

describe('StationDepartureService', () => {
  const mockStation: SubwayStation = {
    id: 'F24',
    name: 'Bergen St',
    lines: ['F', 'G'],
    lat: 40.686145,
    lng: -73.990064
  };

  test('shouldFetchDeparturesForStation', async () => {
    // Red: Test that we can fetch real-time departures for any station
    const departures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'northbound'
    );
    
    expect(departures).toBeDefined();
    expect(Object.keys(departures)).toContain('F');
    expect(Object.keys(departures)).toContain('G');
  });

  test('shouldFormatRelativeTime', () => {
    // Red: Test that times are formatted as relative (e.g., "7m" instead of "7:30pm")
    const now = new Date();
    const sevenMinutesFromNow = new Date(now.getTime() + 7 * 60000);
    
    const relativeTime = StationDepartureService.formatRelativeTime(sevenMinutesFromNow);
    expect(relativeTime).toBe('7m');
  });

  test('shouldFilterByDirection', async () => {
    // Red: Test that departures are filtered by direction (northbound/southbound)
    const northboundDepartures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'northbound'
    );
    const southboundDepartures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'southbound'
    );
    
    // Should be different results for different directions
    expect(northboundDepartures).toBeDefined();
    expect(southboundDepartures).toBeDefined();
  });

  test('shouldGroupByTrainLine', async () => {
    // Red: Test that multiple lines at same station are separated
    const departures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'northbound'
    );
    
    // Should have separate entries for F and G lines
    expect(departures.F).toBeDefined();
    expect(departures.G).toBeDefined();
    expect(Array.isArray(departures.F)).toBe(true);
    expect(Array.isArray(departures.G)).toBe(true);
  });

  test('shouldReturnNext5TrainsPerLine', async () => {
    // Red: Test that we get next 5 trains per line (not just 3)
    const departures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'northbound'
    );
    
    // Each line should have up to 5 departures
    expect(departures.F.length).toBeLessThanOrEqual(5);
    expect(departures.G.length).toBeLessThanOrEqual(5);
    expect(departures.F.length).toBeGreaterThan(0);
    expect(departures.G.length).toBeGreaterThan(0);
  });

  test('shouldReturnDepartureObjects', async () => {
    // Red: Test that departures have correct structure
    const departures = await StationDepartureService.getDeparturesForStation(
      mockStation, 
      'northbound'
    );
    
    const fTrainDeparture = departures.F[0];
    expect(fTrainDeparture).toHaveProperty('line');
    expect(fTrainDeparture).toHaveProperty('departureTime');
    expect(fTrainDeparture).toHaveProperty('relativeTime');
    expect(fTrainDeparture.line).toBe('F');
  });

  test('shouldHandleStationWithSingleLine', async () => {
    // Red: Test stations with only one line work correctly
    const singleLineStation: SubwayStation = {
      id: 'F18',
      name: '23rd St',
      lines: ['F'],
      lat: 40.742878,
      lng: -73.992821
    };
    
    const departures = await StationDepartureService.getDeparturesForStation(
      singleLineStation, 
      'northbound'
    );
    
    expect(Object.keys(departures)).toEqual(['F']);
    expect(departures.F.length).toBeGreaterThan(0);
  });

  test('shouldFormatZeroMinutesAsDeparting', () => {
    // Red: Test that trains departing now show as "Now"
    const now = new Date();
    const relativeTime = StationDepartureService.formatRelativeTime(now);
    expect(relativeTime).toBe('Now');
  });

  test('shouldFormatLongTimesCorrectly', () => {
    // Red: Test that times over an hour are formatted correctly
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 65 * 60000); // 65 minutes
    
    const relativeTime = StationDepartureService.formatRelativeTime(oneHourFromNow);
    expect(relativeTime).toBe('65m');
  });
});