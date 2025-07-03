import { StaticLocationProvider, TransitStop } from '../LocationService';

describe('LocationService', () => {
  let locationProvider: StaticLocationProvider;

  beforeEach(() => {
    locationProvider = new StaticLocationProvider();
  });

  test('shouldReturnWoodhullStreetCoordinates', async () => {
    const location = await locationProvider.getCurrentLocation();
    
    expect(location.lat).toBeCloseTo(40.688312, 5);
    expect(location.lng).toBeCloseTo(-73.990982, 5);
  });

  test('shouldCalculateWalkingTimeToFTrain', async () => {
    const origin = await locationProvider.getCurrentLocation();
    const fTrainStop = locationProvider.getTransitStops().find(
      stop => stop.lines.includes('F')
    );
    
    const walkingTime = await locationProvider.getWalkingTime(origin, fTrainStop!);
    expect(walkingTime).toBe(12); // 12 minutes to F train (Carroll St) - calculated dynamically with 25% speed boost
  });

  test('shouldCalculateWalkingTimeToB61Bus', async () => {
    const origin = await locationProvider.getCurrentLocation();
    const b61Stop = locationProvider.getTransitStops().find(
      stop => stop.lines.includes('B61')
    );
    
    const walkingTime = await locationProvider.getWalkingTime(origin, b61Stop!);
    expect(walkingTime).toBe(2); // 2 minutes to B61 bus - calculated dynamically
  });

  test('shouldReturnShortestWalkingTimeForFTrain', async () => {
    const walkingTime = await locationProvider.getWalkingTimeToTransit('F');
    expect(walkingTime).toBe(12); // F train at Carroll St is 12 minutes away - calculated dynamically
  });

  test('shouldThrowErrorForUnsupportedLines', async () => {
    // Since we only support F train now, other lines should throw errors
    await expect(locationProvider.getWalkingTimeToTransit('R')).rejects.toThrow('No transit stops found for line: R');
    await expect(locationProvider.getWalkingTimeToTransit('N')).rejects.toThrow('No transit stops found for line: N');
    await expect(locationProvider.getWalkingTimeToTransit('Q')).rejects.toThrow('No transit stops found for line: Q');
  });
});