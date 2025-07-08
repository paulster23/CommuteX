import { NearestStationService } from '../NearestStationService';
import { Location } from '../LocationService';

describe('NearestStationService', () => {
  test('shouldFindNearestStationToHome', () => {
    // Red: Test finding nearest station from home location
    const homeLocation: Location = { lat: 40.688312, lng: -73.990982 };
    
    const result = NearestStationService.findNearestStation(homeLocation);
    
    expect(result).toBeDefined();
    expect(result?.station.name).toBe('Bergen St'); // Bergen St is actually closest to home
    expect(result?.station.lines).toContain('F');
    expect(result?.distance).toBeGreaterThan(0);
    expect(result?.distance).toBeLessThan(1); // Should be less than 1 mile
  });

  test('shouldFindTwentyThirdStAsNearestToWork', () => {
    // Red: Test finding 23rd St station as nearest to work location
    const workLocation: Location = { lat: 40.746021, lng: -73.996736 };
    
    const result = NearestStationService.findNearestStation(workLocation);
    
    expect(result).toBeDefined();
    expect(result?.station.name).toBe('23rd St-8th Ave');
    expect(result?.station.lines).toContain('C');
    expect(result?.distance).toBeGreaterThan(0);
    expect(result?.distance).toBeLessThan(0.5); // Should be very close to work
  });

  test('shouldCalculateAccurateDistances', () => {
    // Red: Test that distance calculations are reasonable
    const homeLocation: Location = { lat: 40.688312, lng: -73.990982 };
    
    const result = NearestStationService.findNearestStation(homeLocation);
    
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(0.157, 2); // ~0.157 miles from home to Bergen St
  });

  test('shouldReturnNullForEmptyStationDatabase', () => {
    // Red: Test error handling when no stations available
    const anyLocation: Location = { lat: 40.0, lng: -74.0 };
    
    // Mock empty station database
    const { StationDatabase } = require('../StationDatabase');
    const originalGetNearestStation = StationDatabase.getNearestStation;
    StationDatabase.getNearestStation = jest.fn(() => null);
    
    const result = NearestStationService.findNearestStation(anyLocation);
    
    expect(result).toBeNull();
    
    // Restore original method
    StationDatabase.getNearestStation = originalGetNearestStation;
  });

  test('shouldFindNearestStationFromManhattan', () => {
    // Red: Test finding nearest station from a Manhattan location
    const manhattanLocation: Location = { lat: 40.755477, lng: -73.986754 }; // Times Square
    
    const result = NearestStationService.findNearestStation(manhattanLocation);
    
    expect(result).toBeDefined();
    expect(result?.station.name).toBe('Times Sq-42nd St');
    expect(result?.distance).toBeLessThan(0.1); // Should be very close
  });

  test('shouldReturnStationWithCompleteInformation', () => {
    // Red: Test that returned station has all required information
    const anyLocation: Location = { lat: 40.688312, lng: -73.990982 };
    
    const result = NearestStationService.findNearestStation(anyLocation);
    
    expect(result).toBeDefined();
    expect(result?.station.id).toBeDefined();
    expect(result?.station.name).toBeDefined();
    expect(result?.station.lines).toBeDefined();
    expect(result?.station.lines.length).toBeGreaterThan(0);
    expect(result?.station.lat).toBeDefined();
    expect(result?.station.lng).toBeDefined();
    expect(result?.distance).toBeDefined();
  });

  test('shouldFindDifferentStationsForDifferentLocations', () => {
    // Red: Test that different locations return different nearest stations
    const brooklynLocation: Location = { lat: 40.688312, lng: -73.990982 }; // Home
    const manhattanLocation: Location = { lat: 40.746021, lng: -73.996736 }; // Work
    
    const brooklynResult = NearestStationService.findNearestStation(brooklynLocation);
    const manhattanResult = NearestStationService.findNearestStation(manhattanLocation);
    
    expect(brooklynResult).toBeDefined();
    expect(manhattanResult).toBeDefined();
    expect(brooklynResult?.station.id).not.toBe(manhattanResult?.station.id);
  });

  test('shouldFindConsolidatedStationWithAllTrainLines', () => {
    // Red: Test that consolidated station includes all train lines at Jay St-MetroTech
    const jayStreetLocation: Location = { lat: 40.692338, lng: -73.987342 };
    
    const result = NearestStationService.findNearestStationConsolidated(jayStreetLocation);
    
    expect(result).toBeDefined();
    expect(result?.name).toBe('Jay St-MetroTech');
    expect(result?.lines).toContain('A');
    expect(result?.lines).toContain('C');
    expect(result?.lines).toContain('F');
    expect(result?.lines).toContain('R');
    expect(result?.stationIds['A']).toBe('A41');
    expect(result?.stationIds['C']).toBe('A41');
    expect(result?.stationIds['F']).toBe('F25');
    expect(result?.stationIds['R']).toBe('R29');
  });

  test('shouldReturnNearestStationWhenNoneWithinRadius', () => {
    // Red: Test fallback behavior when no stations are within radius
    const remoteLocation: Location = { lat: 50.0, lng: -80.0 }; // Very far from NYC
    
    const result = NearestStationService.findNearestStationConsolidated(remoteLocation);
    
    // Should still find a station (fallback to nearest station algorithm)
    expect(result).toBeDefined();
    expect(result?.distance).toBeGreaterThan(100); // Should be very far away
    expect(result?.lines.length).toBeGreaterThan(0);
  });

  test('shouldConsolidateStationsWithinRadius', () => {
    // Red: Test that consolidated method finds stations within radius
    const carrollStLocation: Location = { lat: 40.679371, lng: -73.995458 }; // Exact Carroll St coordinates
    
    const result = NearestStationService.findNearestStationConsolidated(carrollStLocation);
    
    expect(result).toBeDefined();
    expect(result?.lines.length).toBeGreaterThan(0);
    expect(result?.distance).toBeGreaterThanOrEqual(0);
    expect(result?.stationIds).toBeDefined();
  });

  test('shouldHaveCorrectStructureForConsolidatedResult', () => {
    // Red: Test that consolidated result has all required properties
    const carrollStLocation: Location = { lat: 40.679371, lng: -73.995458 }; // Exact Carroll St coordinates
    
    const result = NearestStationService.findNearestStationConsolidated(carrollStLocation);
    
    expect(result).toBeDefined();
    expect(result?.name).toBeDefined();
    expect(result?.lines).toBeDefined();
    expect(Array.isArray(result?.lines)).toBe(true);
    expect(result?.lat).toBeDefined();
    expect(result?.lng).toBeDefined();
    expect(result?.distance).toBeDefined();
    expect(result?.stationIds).toBeDefined();
    expect(typeof result?.stationIds).toBe('object');
  });

  test('shouldFindStationForUserLocation', () => {
    // Red: Test for the user's specific location that was having issues
    const userLocation: Location = { lat: 40.681177, lng: -74.003078 };
    
    const result = NearestStationService.findNearestStationConsolidated(userLocation);
    
    expect(result).toBeDefined();
    expect(result?.name).toBeDefined();
    expect(result?.lines.length).toBeGreaterThan(0);
    expect(result?.stationIds).toBeDefined();
    expect(result?.distance).toBeGreaterThan(0);
    
    // Log the result for debugging
    console.log('User location result:', {
      name: result?.name,
      lines: result?.lines,
      distance: result?.distance,
      stationIds: result?.stationIds
    });
  });
});