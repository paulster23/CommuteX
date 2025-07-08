import { StationDatabase, SubwayStation } from '../StationDatabase';

describe('StationDatabase', () => {
  test('shouldReturnCarrollStationCoordinates', () => {
    // Red: Test that Carroll St station has correct coordinates
    const station = StationDatabase.getStationById('F20');
    
    expect(station).toBeDefined();
    expect(station?.name).toBe('Carroll St');
    expect(station?.lines).toContain('F');
    expect(station?.lat).toBeCloseTo(40.679371, 5);
    expect(station?.lng).toBeCloseTo(-73.995458, 5);
  });

  test('shouldReturnTwentyThirdStationCoordinates', () => {
    // Red: Test that 23rd St station has correct coordinates
    const station = StationDatabase.getStationById('F18');
    
    expect(station).toBeDefined();
    expect(station?.name).toBe('23rd St');
    expect(station?.lines).toContain('F');
    expect(station?.lat).toBeCloseTo(40.742878, 5);
    expect(station?.lng).toBeCloseTo(-73.992821, 5);
  });

  test('shouldReturnJayStMetroTechStationCoordinates', () => {
    // Red: Test that Jay St-MetroTech station has correct coordinates with all train lines consolidated
    const station = StationDatabase.getStationById('JAY_ST_METROTECH');
    
    expect(station).toBeDefined();
    expect(station?.name).toBe('Jay St-MetroTech');
    expect(station?.lines).toContain('F');
    expect(station?.lines).toContain('A');
    expect(station?.lines).toContain('C');
    expect(station?.lines).toContain('R');
    expect(station?.lat).toBeCloseTo(40.692338, 5);
    expect(station?.lng).toBeCloseTo(-73.987342, 5);
  });

  test('shouldReturnAllStationsForLine', () => {
    // Red: Test that we can get all stations for a specific line
    const fStations = StationDatabase.getStationsForLine('F');
    
    expect(fStations.length).toBeGreaterThan(0);
    expect(fStations.some(station => station.name === 'Carroll St')).toBe(true);
    expect(fStations.some(station => station.name === '23rd St')).toBe(true);
    expect(fStations.some(station => station.name === 'Jay St-MetroTech')).toBe(true);
  });

  test('shouldReturnAllSubwayStations', () => {
    // Red: Test that we have a reasonable list of key subway stations
    const allStations = StationDatabase.getAllStations();
    
    expect(allStations.length).toBeGreaterThan(15); // Should have key NYC subway stations
    
    // Should include stations from multiple lines
    const lines = new Set(allStations.flatMap(station => station.lines));
    expect(lines.has('F')).toBe(true);
    expect(lines.has('A')).toBe(true);
    expect(lines.has('C')).toBe(true);
    expect(lines.has('E')).toBe(true);
  });

  test('shouldReturnNullForInvalidStationId', () => {
    // Red: Test error handling for invalid station IDs
    const station = StationDatabase.getStationById('INVALID');
    
    expect(station).toBeNull();
  });

  test('shouldReturnEmptyArrayForInvalidLine', () => {
    // Red: Test error handling for invalid line
    const stations = StationDatabase.getStationsForLine('INVALID');
    
    expect(stations).toEqual([]);
  });

  test('shouldReturnCorrectGtfsIdForLine', () => {
    // Red: Test GTFS ID mapping for different train lines at Jay St-MetroTech
    const station = StationDatabase.getStationById('JAY_ST_METROTECH');
    
    expect(station).toBeDefined();
    
    // Test GTFS ID mapping for different lines
    expect(StationDatabase.getGtfsIdForLine(station!, 'F')).toBe('F25');
    expect(StationDatabase.getGtfsIdForLine(station!, 'A')).toBe('A41');
    expect(StationDatabase.getGtfsIdForLine(station!, 'C')).toBe('A41');
    expect(StationDatabase.getGtfsIdForLine(station!, 'R')).toBe('R29');
  });

  test('shouldReturnDefaultStationIdWhenNoGtfsMapping', () => {
    // Red: Test fallback to default station ID when no GTFS mapping exists
    const carrollStation = StationDatabase.getStationById('F20');
    
    expect(carrollStation).toBeDefined();
    
    // Carroll St now has GTFS mapping, so test with another station that doesn't
    const twentyThirdStation = StationDatabase.getStationById('F18');
    expect(twentyThirdStation).toBeDefined();
    
    // Should return default station ID when no GTFS mapping exists
    expect(StationDatabase.getGtfsIdForLine(twentyThirdStation!, 'F')).toBe('F18');
    expect(StationDatabase.getGtfsIdForLine(twentyThirdStation!, 'M')).toBe('F18'); // M line has no specific mapping
  });

  test('shouldIncludeGLineAtCarrollSt', () => {
    // Red: Test that Carroll St station includes G line support
    const carrollStation = StationDatabase.getStationById('F20');
    
    expect(carrollStation).toBeDefined();
    expect(carrollStation?.lines).toContain('F');
    expect(carrollStation?.lines).toContain('G');
  });

  test('shouldReturnCorrectGtfsIdForGTrainAtCarrollSt', () => {
    // Red: Test that G train has proper GTFS ID mapping at Carroll St
    const carrollStation = StationDatabase.getStationById('F20');
    
    expect(carrollStation).toBeDefined();
    
    // F train should use F20, G train should use different GTFS ID
    expect(StationDatabase.getGtfsIdForLine(carrollStation!, 'F')).toBe('F20');
    expect(StationDatabase.getGtfsIdForLine(carrollStation!, 'G')).toBe('G22'); // Will fail until we implement
  });

  test('shouldFindCarrollStForSpecificLocation', () => {
    // Red: Test that location 40.681414, -74.003240 finds Carroll St as nearest station
    const nearestStation = StationDatabase.getNearestStation(40.681414, -74.003240);
    
    expect(nearestStation).toBeDefined();
    expect(nearestStation?.station.name).toBe('Carroll St');
    expect(nearestStation?.station.lines).toContain('F');
    expect(nearestStation?.station.lines).toContain('G');
  });

  test('shouldFindJayStMetroTechForSpecificLocation', () => {
    // Red: Test that location 40.692502, -73.986329 finds Jay St-MetroTech with A,C,F,R trains
    const nearestStation = StationDatabase.getNearestStation(40.692502, -73.986329);
    
    expect(nearestStation).toBeDefined();
    expect(nearestStation?.station.name).toBe('Jay St-MetroTech');
    expect(nearestStation?.station.lines).toContain('A');
    expect(nearestStation?.station.lines).toContain('C');
    expect(nearestStation?.station.lines).toContain('F');
    expect(nearestStation?.station.lines).toContain('R');
    
    // Should have proper GTFS ID mappings for all lines
    const station = nearestStation!.station;
    expect(StationDatabase.getGtfsIdForLine(station, 'A')).toBe('A41');
    expect(StationDatabase.getGtfsIdForLine(station, 'C')).toBe('A41');
    expect(StationDatabase.getGtfsIdForLine(station, 'F')).toBe('F25');
    expect(StationDatabase.getGtfsIdForLine(station, 'R')).toBe('R29');
  });
});