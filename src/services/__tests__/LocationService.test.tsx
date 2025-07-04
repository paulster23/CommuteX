import { StaticLocationProvider } from '../LocationService';

describe('LocationService', () => {
  test('shouldCalculateWalkingTimeFromWorkToTwentyThirdSt', async () => {
    // Red: Test walking time from work (512 W 22nd St) to 23rd St F train station
    const locationProvider = new StaticLocationProvider();
    
    const walkingTime = await locationProvider.getWalkingTimeFromWorkToTwentyThirdSt();
    
    // Should calculate realistic walking time based on distance
    expect(walkingTime).toBeGreaterThan(0);
    expect(walkingTime).toBeLessThan(20); // Should be reasonable walking time (now ~15 mins with actual 0.7 mile distance)
  });

  test('shouldCalculateWalkingTimeFromCarrollStToHome', async () => {
    // Red: Test walking time from Carroll St station to home (42 Woodhull St)
    const locationProvider = new StaticLocationProvider();
    
    const walkingTime = await locationProvider.getWalkingTimeFromCarrollStToHome();
    
    // Should return the same ~12 minutes as the morning commute in reverse (with Brooklyn 3.75 mph speed)
    expect(walkingTime).toBe(12);
  });
});