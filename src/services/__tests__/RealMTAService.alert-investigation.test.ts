import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('RealMTAService - Alert Investigation', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    jest.clearAllMocks();
  });

  test('shouldInvestigateAlertDiscrepancy', async () => {
    // Test to examine what alerts are currently available in the system
    // This will help us understand why route buttons show alerts but pages don't
    
    console.log('🔍 Starting alert investigation...');
    
    // Mock realistic alert data based on existing test patterns
    const mockAlerts = [
      {
        id: 'f-train-carroll-st-alert',
        headerText: 'In Brooklyn, Coney Island-bound [F] skips Bergen St, Carroll St and Smith-9 Sts',
        descriptionText: 'For service to these stations, take the [F] to 4 Av-9 St and transfer to a Manhattan-bound [F].',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [
          {
            routeId: 'F',
            directionId: 0, // southbound (Coney Island-bound)
            stopId: 'F20' // Carroll St
          },
          {
            routeId: 'F',
            directionId: 0,
            stopId: 'F24' // Bergen St
          },
          {
            routeId: 'F',
            directionId: 0,
            stopId: 'F19' // Smith-9 Sts
          }
        ],
        activePeriod: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started 1 day ago
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Ends in 7 days
        }
      },
      {
        id: 'c-train-23rd-st-alert',
        headerText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
        descriptionText: 'For service to Spring St and 23 St, take the [C] to W 4 St-Wash Sq or 34 St-Penn Station and transfer to a downtown [C] or [E].',
        affectedRoutes: ['C'],
        severity: 'info' as const,
        informedEntities: [
          {
            routeId: 'C',
            directionId: 1, // uptown
            stopId: 'A25' // 23rd St-8th Ave
          },
          {
            routeId: 'C',
            directionId: 1,
            stopId: 'A31' // Spring St
          },
          {
            routeId: 'C',
            directionId: 1,
            stopId: 'A32' // 50th St
          }
        ],
        activePeriod: {
          start: new Date(Date.now() - 12 * 60 * 60 * 1000), // Started 12 hours ago
          end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Ends in 3 days
        }
      },
      {
        id: 'a-train-general-alert',
        headerText: 'A train service changes',
        descriptionText: 'A trains are running with delays due to signal problems.',
        affectedRoutes: ['A'],
        severity: 'warning' as const,
        informedEntities: [
          {
            routeId: 'A',
            // No direction specified - affects all directions
            // No stop specified - affects all stops
          }
        ],
        activePeriod: {
          start: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
          end: new Date(Date.now() + 4 * 60 * 60 * 1000) // Ends in 4 hours
        }
      }
    ];

    // Mock the getServiceAlerts method to return our test data
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(mockAlerts);
    
    // 1. Test getServiceAlertsForLines(['F', 'C', 'A']) - page-level alerts
    console.log('\n📄 Testing page-level alerts: getServiceAlertsForLines(["F", "C", "A"])');
    const pageAlerts = await service.getServiceAlertsForLines(['F', 'C', 'A']);
    console.log(`Found ${pageAlerts.length} page-level alerts:`);
    pageAlerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.headerText}`);
      console.log(`     Routes: ${alert.affectedRoutes.join(', ')}`);
      console.log(`     Severity: ${alert.severity}`);
      console.log(`     Description: ${alert.descriptionText.substring(0, 100)}...`);
    });
    
    // 2. Test getServiceAlertsForCommute(['F'], 0) - morning route alerts (southbound)
    console.log('\n🌅 Testing morning route alerts: getServiceAlertsForCommute(["F"], 0)');
    const morningAlerts = await service.getServiceAlertsForCommute(['F'], 0);
    console.log(`Found ${morningAlerts.length} morning route alerts:`);
    morningAlerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.headerText}`);
      console.log(`     Routes: ${alert.affectedRoutes.join(', ')}`);
      console.log(`     Severity: ${alert.severity}`);
      console.log(`     Description: ${alert.descriptionText.substring(0, 100)}...`);
      console.log(`     Informed entities: ${alert.informedEntities.length}`);
      alert.informedEntities.forEach((entity, entityIndex) => {
        console.log(`       ${entityIndex + 1}. Route: ${entity.routeId || 'N/A'}, Stop: ${entity.stopId || 'N/A'}, Direction: ${entity.directionId ?? 'N/A'}`);
      });
    });
    
    // 3. Test getServiceAlertsForCommute(['F'], 1) - afternoon route alerts (northbound)
    console.log('\n🌆 Testing afternoon route alerts: getServiceAlertsForCommute(["F"], 1)');
    const afternoonAlerts = await service.getServiceAlertsForCommute(['F'], 1);
    console.log(`Found ${afternoonAlerts.length} afternoon route alerts:`);
    afternoonAlerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.headerText}`);
      console.log(`     Routes: ${alert.affectedRoutes.join(', ')}`);
      console.log(`     Severity: ${alert.severity}`);
      console.log(`     Description: ${alert.descriptionText.substring(0, 100)}...`);
      console.log(`     Informed entities: ${alert.informedEntities.length}`);
      alert.informedEntities.forEach((entity, entityIndex) => {
        console.log(`       ${entityIndex + 1}. Route: ${entity.routeId || 'N/A'}, Stop: ${entity.stopId || 'N/A'}, Direction: ${entity.directionId ?? 'N/A'}`);
      });
    });
    
    // 4. Compare results and log analysis
    console.log('\n📊 Analysis Summary:');
    console.log(`Page-level alerts (getServiceAlertsForLines): ${pageAlerts.length}`);
    console.log(`Morning route alerts (getServiceAlertsForCommute, direction=0): ${morningAlerts.length}`);
    console.log(`Afternoon route alerts (getServiceAlertsForCommute, direction=1): ${afternoonAlerts.length}`);
    
    console.log('\n🔍 Key Findings:');
    
    // Check if getServiceAlertsForCommute is filtering more strictly than getServiceAlertsForLines
    if (morningAlerts.length < pageAlerts.length || afternoonAlerts.length < pageAlerts.length) {
      console.log('✅ getServiceAlertsForCommute filters more strictly than getServiceAlertsForLines');
      console.log('   This explains why route buttons show alerts but pages might not');
    }
    
    // Check direction filtering
    if (morningAlerts.length !== afternoonAlerts.length) {
      console.log('✅ Direction filtering is working - different alerts for morning vs afternoon');
    }
    
    // Check specific alerts
    const carrollStInMorning = morningAlerts.some(alert => alert.id === 'f-train-carroll-st-alert');
    const carrollStInAfternoon = afternoonAlerts.some(alert => alert.id === 'f-train-carroll-st-alert');
    
    console.log(`Carroll St alert in morning commute: ${carrollStInMorning}`);
    console.log(`Carroll St alert in afternoon commute: ${carrollStInAfternoon}`);
    
    if (carrollStInMorning && !carrollStInAfternoon) {
      console.log('✅ Carroll St alert correctly filtered by direction (southbound only)');
    }
    
    // The test passes if it runs without throwing - we're just investigating
    expect(true).toBe(true);
  });
});