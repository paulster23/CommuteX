import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('RealMTAService - Manual F→A→C Route Generation', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    jest.clearAllMocks();
    
    // Mock navigator.onLine to avoid internet connection check
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  test('shouldGenerate5FAC_RoutesWithCompleteTimingBreakdown', async () => {
    console.log('\n=== GENERATING 5 F→A→C ROUTES ===\n');
    
    // Mock GTFS transit time calculations
    jest.spyOn(service as any, 'calculateGTFSTransitTime').mockResolvedValue(34);
    
    // Mock walking times (realistic values)
    jest.spyOn(service.locationProvider, 'getWalkingTimeToTransit').mockResolvedValue(12); // Walk to Carroll St
    jest.spyOn(service.locationProvider, 'getWalkingTimeFromTwentyThirdStEighthAve').mockReturnValue(6); // Walk from 23rd St-8th Ave
    
    // Mock service alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([]);
    
    // Mock real-time arrivals with staggered timing to create multiple route options
    jest.spyOn(service as any, 'fetchTrainArrivalsFromFeed').mockImplementation(async (feedUrl, direction, station, line, stopId) => {
      const baseTime = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      
      if (line === 'F') {
        // F train departures every 6 minutes
        return [
          { stopId: 'F20N', stopSequence: 1, departureTime: baseTime, arrivalTime: baseTime },
          { stopId: 'F20N', stopSequence: 1, departureTime: baseTime + 360, arrivalTime: baseTime + 360 },
          { stopId: 'F20N', stopSequence: 1, departureTime: baseTime + 720, arrivalTime: baseTime + 720 },
          { stopId: 'F20N', stopSequence: 1, departureTime: baseTime + 1080, arrivalTime: baseTime + 1080 },
          { stopId: 'F20N', stopSequence: 1, departureTime: baseTime + 1440, arrivalTime: baseTime + 1440 }
        ];
      } else if (line === 'A') {
        // A train departures every 8 minutes, timed to connect with F trains
        return [
          { stopId: 'A41N', stopSequence: 1, departureTime: baseTime + 480, arrivalTime: baseTime + 480 },
          { stopId: 'A41N', stopSequence: 1, departureTime: baseTime + 840, arrivalTime: baseTime + 840 },
          { stopId: 'A41N', stopSequence: 1, departureTime: baseTime + 1200, arrivalTime: baseTime + 1200 },
          { stopId: 'A41N', stopSequence: 1, departureTime: baseTime + 1560, arrivalTime: baseTime + 1560 },
          { stopId: 'A41N', stopSequence: 1, departureTime: baseTime + 1920, arrivalTime: baseTime + 1920 }
        ];
      } else if (line === 'C') {
        // C train departures every 10 minutes, timed to connect with A trains
        return [
          { stopId: 'A27N', stopSequence: 1, departureTime: baseTime + 600, arrivalTime: baseTime + 600 },
          { stopId: 'A27N', stopSequence: 1, departureTime: baseTime + 960, arrivalTime: baseTime + 960 },
          { stopId: 'A27N', stopSequence: 1, departureTime: baseTime + 1320, arrivalTime: baseTime + 1320 },
          { stopId: 'A27N', stopSequence: 1, departureTime: baseTime + 1680, arrivalTime: baseTime + 1680 },
          { stopId: 'A27N', stopSequence: 1, departureTime: baseTime + 2040, arrivalTime: baseTime + 2040 }
        ];
      }
      
      return [];
    });

    // Generate F→A→C triple-transfer routes
    const routes = await service.calculateTripleTransferRoutes('Carroll St', '23rd St', '9:30 AM');

    console.log(`\n📊 GENERATED ${routes.length} F→A→C ROUTES:\n`);

    routes.forEach((route, index) => {
      console.log(`🚇 ROUTE ${index + 1}:`);
      console.log(`   Arrival: ${route.arrivalTime}`);
      console.log(`   Total Duration: ${route.duration}`);
      console.log(`   Method: ${route.method}`);
      console.log(`   Transfers: ${route.transfers}`);
      console.log(`   Confidence: ${route.confidence}`);
      console.log(`   Real-time Data: ${route.isRealTimeData ? 'Yes' : 'No'}\n`);
      
      console.log(`   📍 TIMING BREAKDOWN:`);
      let totalTime = 0;
      
      route.steps.forEach((step, stepIndex) => {
        const emoji = step.type === 'walk' ? '🚶' : 
                     step.type === 'wait' ? '⏱️' : 
                     step.type === 'transit' ? '🚇' : 
                     step.type === 'transfer' ? '🔄' : '📍';
        
        console.log(`   ${stepIndex + 1}. ${emoji} ${step.description} - ${step.duration} min (${step.dataSource})`);
        if (step.fromStation && step.toStation) {
          console.log(`      ${step.fromStation} → ${step.toStation}`);
        }
        totalTime += step.duration;
      });
      
      console.log(`   ⏰ TOTAL JOURNEY TIME: ${totalTime} minutes`);
      console.log(`   🏁 FINAL ARRIVAL: ${route.arrivalTime}\n`);
      console.log(`   ================================\n`);
    });

    // Calculate actual travel time components
    if (routes.length > 0) {
      const sampleRoute = routes[0];
      const walkingToTransit = 12; // Mock value
      const walkingFromTransit = 6; // Mock value
      const fTransitTime = 7; // Carroll St → Jay St-MetroTech
      const aTransitTime = 8; // Jay St-MetroTech → 14th St-8th Ave  
      const cTransitTime = 3; // 14th St-8th Ave → 23rd St-8th Ave
      
      console.log(`📊 TYPICAL F→A→C ROUTE BREAKDOWN:`);
      console.log(`   🚶 Walk to Carroll St: ${walkingToTransit} min`);
      console.log(`   ⏱️ Wait for F train: varies (real-time)`);
      console.log(`   🚇 F train (Carroll → Jay St): ${fTransitTime} min`);
      console.log(`   🔄 Transfer F→A at Jay St: 0 min (same platform)`);
      console.log(`   ⏱️ Wait for A train: varies (real-time)`);
      console.log(`   🚇 A train (Jay St → 14th St): ${aTransitTime} min`);
      console.log(`   🔄 Transfer A→C at 14th St: 0 min (same platform)`);
      console.log(`   ⏱️ Wait for C train: varies (real-time)`);
      console.log(`   🚇 C train (14th St → 23rd St): ${cTransitTime} min`);
      console.log(`   🚶 Walk from 23rd St-8th Ave: ${walkingFromTransit} min`);
      console.log(`   ================================`);
      console.log(`   📈 TOTAL FIXED TIME: ${walkingToTransit + fTransitTime + aTransitTime + cTransitTime + walkingFromTransit} min`);
      console.log(`   ⏰ PLUS VARIABLE WAIT TIMES: depends on real-time arrivals`);
      console.log(`   🎯 TYPICAL TOTAL: 35-45 minutes (vs 54 min direct F)`);
    }

    // Verify we got routes
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.length).toBeLessThanOrEqual(5);
    
    // Verify route structure
    routes.forEach(route => {
      expect(route.method).toContain('F→A→C');
      expect(route.transfers).toBe(2);
      expect(route.steps.length).toBeGreaterThan(5); // Should have multiple steps
    });
  });
});