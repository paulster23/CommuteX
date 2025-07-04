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
});