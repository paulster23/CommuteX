import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Live Service Alerts Check', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldCheckCurrentServiceAlertsForCTrainAndA23Station', async () => {
    console.log('\n🚨 CHECKING LIVE MTA SERVICE ALERTS 🚨\n');
    
    try {
      // Fetch current service alerts from MTA
      const alerts = await service.getServiceAlerts();
      console.log(`📡 Fetched ${alerts.length} total service alerts from MTA\n`);

      // Filter for C train alerts
      const cTrainAlerts = alerts.filter(alert => 
        alert.affectedRoutes.includes('C') || 
        alert.headerText.toLowerCase().includes('c train') ||
        alert.descriptionText.toLowerCase().includes('c train')
      );

      console.log(`🚇 C TRAIN ALERTS: Found ${cTrainAlerts.length} alerts\n`);

      if (cTrainAlerts.length > 0) {
        cTrainAlerts.forEach((alert, index) => {
          console.log(`📢 C TRAIN ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          
          if (alert.activePeriod) {
            console.log(`   ⏰ Active Period: ${alert.activePeriod.start || 'N/A'} to ${alert.activePeriod.end || 'Ongoing'}`);
          }
          
          // Check if alert affects specific stations
          console.log(`   📍 Informed Entities:`);
          alert.informedEntities.forEach((entity, entityIndex) => {
            console.log(`      ${entityIndex + 1}. Route: ${entity.routeId || 'N/A'}, Stop: ${entity.stopId || 'N/A'}, Direction: ${entity.directionId !== undefined ? entity.directionId : 'N/A'}`);
          });
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No specific C train alerts found\n');
      }

      // Check for alerts affecting 23rd St-8th Ave station (A23)
      const a23Alerts = alerts.filter(alert => 
        alert.informedEntities.some(entity => 
          entity.stopId?.includes('A23') || 
          entity.stopId?.includes('23') ||
          alert.descriptionText.toLowerCase().includes('23rd') ||
          alert.descriptionText.toLowerCase().includes('23 st')
        )
      );

      console.log(`🏢 23RD ST-8TH AVE (A23) ALERTS: Found ${a23Alerts.length} alerts\n`);

      if (a23Alerts.length > 0) {
        a23Alerts.forEach((alert, index) => {
          console.log(`📢 23RD ST ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No specific alerts for 23rd St-8th Ave station\n');
      }

      // Check for general ACE line alerts
      const aceAlerts = alerts.filter(alert => 
        alert.affectedRoutes.some(route => ['A', 'C', 'E'].includes(route)) ||
        alert.headerText.toLowerCase().includes('ace') ||
        alert.descriptionText.toLowerCase().includes('ace')
      );

      console.log(`🚇 ACE LINE ALERTS: Found ${aceAlerts.length} alerts\n`);

      if (aceAlerts.length > 0) {
        aceAlerts.forEach((alert, index) => {
          console.log(`📢 ACE ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No general ACE line alerts found\n');
      }

      // Check for southbound direction issues
      const southboundAlerts = alerts.filter(alert => 
        alert.informedEntities.some(entity => entity.directionId === 0) ||
        alert.descriptionText.toLowerCase().includes('southbound') ||
        alert.descriptionText.toLowerCase().includes('downtown') ||
        alert.descriptionText.toLowerCase().includes('brooklyn')
      );

      console.log(`⬇️ SOUTHBOUND DIRECTION ALERTS: Found ${southboundAlerts.length} alerts\n`);

      if (southboundAlerts.length > 0) {
        southboundAlerts.slice(0, 3).forEach((alert, index) => {
          console.log(`📢 SOUTHBOUND ALERT ${index + 1}:`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No specific southbound direction alerts found\n');
      }

      // Summary and analysis
      console.log('📊 ANALYSIS FOR C TRAIN AFTERNOON ROUTES:');
      console.log(`   🚇 Total C train specific alerts: ${cTrainAlerts.length}`);
      console.log(`   🏢 23rd St-8th Ave specific alerts: ${a23Alerts.length}`);
      console.log(`   🚇 General ACE line alerts: ${aceAlerts.length}`);
      console.log(`   ⬇️ Southbound direction alerts: ${southboundAlerts.length}`);
      
      if (cTrainAlerts.length === 0 && a23Alerts.length === 0) {
        console.log('\n✅ CONCLUSION: No service alerts detected that would explain the lack of C train departures.');
        console.log('   The issue is likely:');
        console.log('   1. 🕐 Time of day - C trains may have reduced service during off-peak hours');
        console.log('   2. 📡 Feed data quality - ACE feed may be less reliable than F train feed');
        console.log('   3. 🆔 Stop ID mapping - A23S may not match the actual GTFS stop ID for southbound C trains');
        console.log('   4. 🚇 Service pattern - C trains might not run to 23rd St-8th Ave during certain hours');
      } else {
        console.log('\n⚠️ CONCLUSION: Service alerts detected that may explain the issue!');
      }

    } catch (error) {
      console.error('❌ Error fetching service alerts:', error);
      console.log('\n🔍 FALLBACK ANALYSIS:');
      console.log('   Since we cannot fetch live alerts, the most likely causes are:');
      console.log('   1. 📡 MTA ACE feed data quality issues');
      console.log('   2. 🆔 Incorrect stop ID mapping for A23 southbound');
      console.log('   3. 🕐 Time-of-day service patterns');
    }

    // This test always passes - it's for information gathering
    expect(true).toBe(true);
  });
});