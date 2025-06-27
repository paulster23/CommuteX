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
    expect(walkingTime).toBe(15); // 15 minutes to F train
  });

  test('shouldCalculateWalkingTimeToB61Bus', async () => {
    const origin = await locationProvider.getCurrentLocation();
    const b61Stop = locationProvider.getTransitStops().find(
      stop => stop.lines.includes('B61')
    );
    
    const walkingTime = await locationProvider.getWalkingTime(origin, b61Stop!);
    expect(walkingTime).toBe(5); // 5 minutes to B61 bus
  });

  test('shouldCalculateWalkingTimeToRTrain', async () => {
    const origin = await locationProvider.getCurrentLocation();
    const rTrainStop = locationProvider.getTransitStops().find(
      stop => stop.lines.includes('R')
    );
    
    const walkingTime = await locationProvider.getWalkingTime(origin, rTrainStop!);
    expect(walkingTime).toBe(30); // 30 minutes to R train
  });

  test('shouldReturnShortestWalkingTimeForMultipleStops', async () => {
    const walkingTime = await locationProvider.getWalkingTimeToTransit('F');
    expect(walkingTime).toBe(15); // F train is 15 minutes away
  });

  test('shouldHandleMultipleLineAccess', async () => {
    // Atlantic-Barclays serves multiple lines, should return same time for all
    const rTime = await locationProvider.getWalkingTimeToTransit('R');
    const nTime = await locationProvider.getWalkingTimeToTransit('N');
    const qTime = await locationProvider.getWalkingTimeToTransit('Q');
    
    expect(rTime).toBe(30);
    expect(nTime).toBe(30);
    expect(qTime).toBe(30);
  });
});
