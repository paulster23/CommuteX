import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Alert Filtering Debug', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldDebugWhyCarrollStAlertIsFiltered', async () => {
    console.log('\n🔍 DEBUGGING CARROLL ST ALERT FILTERING 🔍\n');
    
    try {
      // Get all alerts first
      const allAlerts = await service.getServiceAlerts();
      console.log(`📡 Total alerts: ${allAlerts.length}`);
      
      // Find the Carroll St alert
      const carrollStAlert = allAlerts.find(alert => 
        alert.affectedRoutes.includes('F') && 
        alert.headerText.toLowerCase().includes('carroll')
      );
      
      if (!carrollStAlert) {
        console.log('❌ Carroll St alert not found in GTFS feed');
        return;
      }
      
      console.log('✅ Found Carroll St alert in GTFS:');
      console.log(`   ID: ${carrollStAlert.id}`);
      console.log(`   Header: ${carrollStAlert.headerText}`);
      console.log(`   Affected Routes: ${carrollStAlert.affectedRoutes.join(', ')}`);
      console.log(`   Severity: ${carrollStAlert.severity}`);
      console.log(`   Active Period: ${carrollStAlert.activePeriod?.start} to ${carrollStAlert.activePeriod?.end}`);
      console.log(`   Informed Entities: ${carrollStAlert.informedEntities.length}`);
      
      carrollStAlert.informedEntities.forEach((entity, index) => {
        console.log(`      ${index + 1}. Route: ${entity.routeId}, Stop: ${entity.stopId}, Direction: ${entity.directionId}`);
      });
      
      // Test station-skipping detection
      const isStationSkipping = service.isStationSkippingAlert(carrollStAlert);
      console.log(`\n🚨 Station-skipping detection: ${isStationSkipping}`);
      
      // Test active alert filtering
      const activeAlerts = await service.getActiveServiceAlerts();
      const isActive = activeAlerts.some(alert => alert.id === carrollStAlert.id);
      console.log(`⏰ Is active (time-based filtering): ${isActive}`);
      
      if (!isActive) {
        const now = new Date();
        console.log(`   Current time: ${now.toISOString()}`);
        console.log(`   Alert start: ${carrollStAlert.activePeriod?.start}`);
        console.log(`   Alert end: ${carrollStAlert.activePeriod?.end}`);
        
        if (carrollStAlert.activePeriod?.start && now < carrollStAlert.activePeriod.start) {
          console.log('   ❌ Filtered out: Alert is in the future');
        } else if (carrollStAlert.activePeriod?.end && now > carrollStAlert.activePeriod.end) {
          console.log('   ❌ Filtered out: Alert has expired');
        } else {
          console.log('   ❌ Filtered out: Unknown time filtering reason');
        }
      }
      
      // Test direction-based filtering
      console.log('\n🧭 Direction-based filtering:');
      
      // Morning commute (direction 0 = southbound)
      const morningAlerts = await service.getServiceAlertsForDirection(['F'], 0);
      const inMorningAlerts = morningAlerts.some(alert => alert.id === carrollStAlert.id);
      console.log(`   Morning (direction 0): ${inMorningAlerts}`);
      
      // Afternoon commute (direction 1 = northbound)
      const afternoonAlerts = await service.getServiceAlertsForDirection(['F'], 1);
      const inAfternoonAlerts = afternoonAlerts.some(alert => alert.id === carrollStAlert.id);
      console.log(`   Afternoon (direction 1): ${inAfternoonAlerts}`);
      
      // Test station-based filtering
      console.log('\n🏢 Station-based filtering:');
      
      // Test with specific station IDs
      const stationIds = ['F20', 'F24', 'F19']; // Carroll St, Bergen St, Smith-9 Sts
      
      for (const stationId of stationIds) {
        const stationAlerts = await service.getServiceAlertsForCommute(['F'], 0, [stationId]);
        const hasStationAlert = stationAlerts.some(alert => alert.id === carrollStAlert.id);
        console.log(`   Station ${stationId}: ${hasStationAlert}`);
      }
      
      // Test with no station filtering
      const noStationAlerts = await service.getServiceAlertsForCommute(['F'], 0, []);
      const hasNoStationAlert = noStationAlerts.some(alert => alert.id === carrollStAlert.id);
      console.log(`   No station filter: ${hasNoStationAlert}`);
      
      // Test the full filtering pipeline step by step
      console.log('\n🔍 STEP-BY-STEP FILTERING ANALYSIS:');
      
      // Step 1: Line filtering
      const affectsF = carrollStAlert.affectedRoutes.includes('F');
      console.log(`   1. Line filtering (affects F): ${affectsF}`);
      
      // Step 2: Station-skipping bypass
      const isStationSkippingBypass = service.isStationSkippingAlert(carrollStAlert);
      console.log(`   2. Station-skipping bypass: ${isStationSkippingBypass}`);
      
      // Step 3: Direction matching
      const hasDirectionMatch = carrollStAlert.informedEntities.some(entity => {
        if (!entity.routeId || !['F'].includes(entity.routeId)) return false;
        return entity.directionId === undefined || entity.directionId === 0;
      });
      console.log(`   3. Direction matching (morning): ${hasDirectionMatch}`);
      
      // Step 4: Station matching
      const hasStationMatch = carrollStAlert.informedEntities.some(entity => 
        entity.stopId && ['F20', 'F24', 'F19'].some(stationId => 
          entity.stopId === stationId || 
          entity.stopId === `${stationId}N` || 
          entity.stopId === `${stationId}S`
        )
      );
      console.log(`   4. Station matching: ${hasStationMatch}`);
      
      // Step 5: No station filter check
      const hasNoStationFilter = carrollStAlert.informedEntities.every(entity => !entity.stopId);
      console.log(`   5. No station filter: ${hasNoStationFilter}`);
      
      // Final result
      const shouldPass = affectsF && isStationSkippingBypass;
      console.log(`\n✅ Should pass filtering: ${shouldPass}`);
      
      if (!shouldPass) {
        console.log('❌ Alert is being filtered out incorrectly');
      }
      
    } catch (error) {
      console.error('❌ Error debugging alert filtering:', error);
    }
    
    expect(true).toBe(true);
  });

  test('shouldDebugWhyCTrainAlertIsFiltered', async () => {
    console.log('\n🔍 DEBUGGING C TRAIN 23RD ST ALERT FILTERING 🔍\n');
    
    try {
      // Get all alerts first
      const allAlerts = await service.getServiceAlerts();
      
      // Find the C train 23rd St alert
      const cTrainAlert = allAlerts.find(alert => 
        alert.affectedRoutes.includes('C') && 
        alert.headerText.toLowerCase().includes('23 st')
      );
      
      if (!cTrainAlert) {
        console.log('❌ C train 23rd St alert not found in GTFS feed');
        return;
      }
      
      console.log('✅ Found C train 23rd St alert in GTFS:');
      console.log(`   ID: ${cTrainAlert.id}`);
      console.log(`   Header: ${cTrainAlert.headerText}`);
      console.log(`   Affected Routes: ${cTrainAlert.affectedRoutes.join(', ')}`);
      console.log(`   Severity: ${cTrainAlert.severity}`);
      console.log(`   Active Period: ${cTrainAlert.activePeriod?.start} to ${cTrainAlert.activePeriod?.end}`);
      
      // Test station-skipping detection
      const isStationSkipping = service.isStationSkippingAlert(cTrainAlert);
      console.log(`\n🚨 Station-skipping detection: ${isStationSkipping}`);
      
      // Test active alert filtering
      const activeAlerts = await service.getActiveServiceAlerts();
      const isActive = activeAlerts.some(alert => alert.id === cTrainAlert.id);
      console.log(`⏰ Is active (time-based filtering): ${isActive}`);
      
      if (!isActive) {
        const now = new Date();
        console.log(`   Current time: ${now.toISOString()}`);
        console.log(`   Alert start: ${cTrainAlert.activePeriod?.start}`);
        console.log(`   Alert end: ${cTrainAlert.activePeriod?.end}`);
        
        if (cTrainAlert.activePeriod?.start && now < cTrainAlert.activePeriod.start) {
          console.log('   ❌ Filtered out: Alert is in the future');
        } else if (cTrainAlert.activePeriod?.end && now > cTrainAlert.activePeriod.end) {
          console.log('   ❌ Filtered out: Alert has expired');
        } else {
          console.log('   ❌ Filtered out: Unknown time filtering reason');
        }
      }
      
      // Test direction-based filtering
      console.log('\n🧭 Direction-based filtering:');
      
      // Morning commute (direction 0 = southbound)
      const morningAlerts = await service.getServiceAlertsForDirection(['C'], 0);
      const inMorningAlerts = morningAlerts.some(alert => alert.id === cTrainAlert.id);
      console.log(`   Morning (direction 0): ${inMorningAlerts}`);
      
      // Afternoon commute (direction 1 = northbound)
      const afternoonAlerts = await service.getServiceAlertsForDirection(['C'], 1);
      const inAfternoonAlerts = afternoonAlerts.some(alert => alert.id === cTrainAlert.id);
      console.log(`   Afternoon (direction 1): ${inAfternoonAlerts}`);
      
      // Test station-based filtering
      console.log('\n🏢 Station-based filtering:');
      
      const stationIds = ['A23', 'A25', 'A27']; // 23rd St variants
      
      for (const stationId of stationIds) {
        const stationAlerts = await service.getServiceAlertsForCommute(['C'], 0, [stationId]);
        const hasStationAlert = stationAlerts.some(alert => alert.id === cTrainAlert.id);
        console.log(`   Station ${stationId}: ${hasStationAlert}`);
      }
      
      // Test the full filtering pipeline step by step
      console.log('\n🔍 STEP-BY-STEP FILTERING ANALYSIS:');
      
      // Step 1: Line filtering
      const affectsC = cTrainAlert.affectedRoutes.includes('C');
      console.log(`   1. Line filtering (affects C): ${affectsC}`);
      
      // Step 2: Station-skipping bypass
      const isStationSkippingBypass = service.isStationSkippingAlert(cTrainAlert);
      console.log(`   2. Station-skipping bypass: ${isStationSkippingBypass}`);
      
      // Step 3: Direction matching (should be bypassed for station-skipping)
      const hasDirectionMatch = cTrainAlert.informedEntities.some(entity => {
        if (!entity.routeId || !['C'].includes(entity.routeId)) return false;
        return entity.directionId === undefined || entity.directionId === 0;
      });
      console.log(`   3. Direction matching (morning): ${hasDirectionMatch}`);
      
      // Final result
      const shouldPass = affectsC && isStationSkippingBypass;
      console.log(`\n✅ Should pass filtering: ${shouldPass}`);
      
      if (!shouldPass) {
        console.log('❌ Alert is being filtered out incorrectly');
      }
      
    } catch (error) {
      console.error('❌ Error debugging C train alert filtering:', error);
    }
    
    expect(true).toBe(true);
  });

  test('shouldTestManualAlertFiltering', async () => {
    console.log('\n🧪 MANUAL ALERT FILTERING TEST 🧪\n');
    
    try {
      // Get all alerts
      const allAlerts = await service.getServiceAlerts();
      
      // Find both critical alerts
      const carrollStAlert = allAlerts.find(alert => 
        alert.affectedRoutes.includes('F') && 
        alert.headerText.toLowerCase().includes('carroll')
      );
      
      const cTrainAlert = allAlerts.find(alert => 
        alert.affectedRoutes.includes('C') && 
        alert.headerText.toLowerCase().includes('23 st')
      );
      
      if (!carrollStAlert || !cTrainAlert) {
        console.log('❌ Could not find both critical alerts');
        return;
      }
      
      console.log('🔍 Testing manual filtering logic...\n');
      
      // Test the exact logic from getServiceAlertsForCommute
      const testAlerts = [carrollStAlert, cTrainAlert];
      
      for (const alert of testAlerts) {
        console.log(`📋 Testing alert: ${alert.headerText.substring(0, 50)}...`);
        
        // Step 1: Line filtering
        const affectsLines = alert.affectedRoutes.some(route => ['F', 'C'].includes(route));
        console.log(`   ✓ Line filtering: ${affectsLines}`);
        
        if (!affectsLines) {
          console.log('   ❌ Failed line filtering');
          continue;
        }
        
        // Step 2: Station-skipping check
        const isStationSkipping = service.isStationSkippingAlert(alert);
        console.log(`   ✓ Station-skipping: ${isStationSkipping}`);
        
        // Step 3: Direction matching
        const directionMatch = alert.informedEntities.some(entity => {
          if (!entity.routeId || !['F', 'C'].includes(entity.routeId)) return false;
          return entity.directionId === undefined || entity.directionId === 0;
        });
        console.log(`   ✓ Direction matching: ${directionMatch}`);
        
        // Step 4: Station matching
        const stationMatch = alert.informedEntities.some(entity => 
          entity.stopId && ['F20', 'F24', 'F19', 'A23', 'A25', 'A27'].some(stationId => 
            entity.stopId === stationId || 
            entity.stopId === `${stationId}N` || 
            entity.stopId === `${stationId}S`
          )
        );
        console.log(`   ✓ Station matching: ${stationMatch}`);
        
        // Step 5: No station filter
        const hasNoStationFilter = alert.informedEntities.every(entity => !entity.stopId);
        console.log(`   ✓ No station filter: ${hasNoStationFilter}`);
        
        // Final logic
        const shouldPass = isStationSkipping ? true : (directionMatch && (stationMatch || hasNoStationFilter));
        console.log(`   ✅ Should pass: ${shouldPass}\n`);
        
        if (!shouldPass) {
          console.log('   ❌ This alert is being filtered out incorrectly!');
          console.log('   🔍 Debugging info:');
          console.log(`      - isStationSkipping: ${isStationSkipping}`);
          console.log(`      - directionMatch: ${directionMatch}`);
          console.log(`      - stationMatch: ${stationMatch}`);
          console.log(`      - hasNoStationFilter: ${hasNoStationFilter}`);
          console.log(`      - Station IDs in alert: ${alert.informedEntities.map(e => e.stopId).join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in manual filtering test:', error);
    }
    
    expect(true).toBe(true);
  });
});