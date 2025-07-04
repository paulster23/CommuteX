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
    // Red: Test that Jay St-MetroTech station has correct coordinates for both F and A/C platforms
    const fStation = StationDatabase.getStationById('F25');
    const acStation = StationDatabase.getStationById('A41');
    
    expect(fStation).toBeDefined();
    expect(fStation?.name).toBe('Jay St-MetroTech');
    expect(fStation?.lines).toContain('F');
    
    expect(acStation).toBeDefined();
    expect(acStation?.name).toBe('Jay St-MetroTech');
    expect(acStation?.lines).toContain('A');
    expect(acStation?.lines).toContain('C');
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
});