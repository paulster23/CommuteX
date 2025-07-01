import { RealMTAService } from '../RealMTAService';

describe('GTFS Transit Time Calculation', () => {
  let mtaService: RealMTAService;

  beforeEach(() => {
    mtaService = new RealMTAService();
  });

  test('shouldCalculateCorrectFTrainTransitTimeFromCarrollTo23rd', async () => {
    // Red: F train from Carroll St to 23rd St should take approximately 20-25 minutes
    // This is a realistic travel time for this F train route in Brooklyn to Manhattan
    
    const mockTrip = {
      trip: {
        routeId: 'F',
        tripId: 'F_TEST_TRIP'
      },
      stopTimeUpdate: [
        {
          stopId: 'F20N', // Carroll St F train northbound
          stopSequence: 10,
          departure: {
            time: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
          },
          arrival: {
            time: Math.floor(Date.now() / 1000) + 240 // 4 minutes from now
          }
        },
        {
          stopId: 'F14N', // 23rd St F train northbound
          stopSequence: 30,
          arrival: {
            time: Math.floor(Date.now() / 1000) + 1620 // 22 minutes from departure (27 total)
          },
          departure: {
            time: Math.floor(Date.now() / 1000) + 1680 // 23 minutes from departure
          }
        }
      ]
    };

    // Call the private method through reflection to test GTFS transit time calculation
    const transitTime = (mtaService as any).calculateTransitTimeFromGTFS(mockTrip);
    
    // Should be approximately 22 minutes (1620 - 300 = 1320 seconds = 22 minutes)
    expect(transitTime).toBeGreaterThan(20);
    expect(transitTime).toBeLessThan(25);
    expect(transitTime).not.toBe(1); // Should never be 1 minute for this route
  });

  test('shouldHandleInvalidGTFSDataGracefully', () => {
    // Red: Should return null for invalid GTFS data, not a bogus 1-minute time
    
    const invalidTrip = {
      trip: {
        routeId: 'F'
      },
      stopTimeUpdate: [] // No stop time updates
    };

    const transitTime = (mtaService as any).calculateTransitTimeFromGTFS(invalidTrip);
    
    // Should return null for invalid data, not 1 minute
    expect(transitTime).toBeNull();
  });

  test('shouldCalculateTransitTimeFromStopSequence', () => {
    // Red: Should calculate time between first and last stop in GTFS trip
    
    const mockTrip = {
      trip: {
        routeId: 'F'
      },
      stopTimeUpdate: [
        {
          stopId: 'F20N',
          stopSequence: 10,
          departure: {
            time: Math.floor(Date.now() / 1000) + 300
          }
        },
        {
          stopId: 'F18N', 
          stopSequence: 15,
          arrival: {
            time: Math.floor(Date.now() / 1000) + 600
          },
          departure: {
            time: Math.floor(Date.now() / 1000) + 660
          }
        },
        {
          stopId: 'F14N',
          stopSequence: 25, 
          arrival: {
            time: Math.floor(Date.now() / 1000) + 1500
          },
          departure: {
            time: Math.floor(Date.now() / 1000) + 1560
          }
        }
      ]
    };

    const transitTime = (mtaService as any).calculateTransitTimeFromGTFS(mockTrip);
    
    // Should be 14 minutes (1500 - 660 = 840 seconds = 14 minutes from last departure to last arrival)
    expect(transitTime).toBe(14);
  });

  test('shouldUseFallbackForUnrealisticallyShortTransitTimes', () => {
    // Red: Should use fallback estimate for transit times under 5 minutes as likely data errors
    
    const unrealisticTrip = {
      trip: {
        routeId: 'F'
      },
      stopTimeUpdate: [
        {
          stopId: 'F20N',
          stopSequence: 10,
          departure: {
            time: Math.floor(Date.now() / 1000) + 300
          },
          arrival: {
            time: Math.floor(Date.now() / 1000) + 240
          }
        },
        {
          stopId: 'F14N',
          stopSequence: 15,
          arrival: {
            time: Math.floor(Date.now() / 1000) + 360 // Only 1 minute transit time
          },
          departure: {
            time: Math.floor(Date.now() / 1000) + 420
          }
        }
      ]
    };

    const transitTime = (mtaService as any).calculateTransitTimeFromGTFS(unrealisticTrip);
    
    // Should return F train fallback estimate (28 minutes) instead of unrealistic 1 minute
    expect(transitTime).toBe(28);
  });
});