import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - F Train Alert Investigation', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldCheckCurrentFTrainAlertsForCarrollStBergenSt', async () => {
    console.log('\n🚨 CHECKING F TRAIN ALERTS FOR CARROLL ST / BERGEN ST 🚨\n');
    
    try {
      // Fetch current service alerts from MTA
      const alerts = await service.getServiceAlerts();
      console.log(`📡 Fetched ${alerts.length} total service alerts from MTA\n`);

      // Filter for F train alerts
      const fTrainAlerts = alerts.filter(alert => 
        alert.affectedRoutes.includes('F') || 
        alert.headerText.toLowerCase().includes('f train') ||
        alert.descriptionText.toLowerCase().includes('f train')
      );

      console.log(`🚇 F TRAIN ALERTS: Found ${fTrainAlerts.length} alerts\n`);

      if (fTrainAlerts.length > 0) {
        fTrainAlerts.forEach((alert, index) => {
          console.log(`📢 F TRAIN ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          
          if (alert.activePeriod) {
            console.log(`   ⏰ Active Period: ${alert.activePeriod.start || 'N/A'} to ${alert.activePeriod.end || 'Ongoing'}`);
          }
          
          // Check if alert affects Carroll St or Bergen St
          const mentionsCarrollSt = alert.headerText.toLowerCase().includes('carroll') || 
                                   alert.descriptionText.toLowerCase().includes('carroll');
          const mentionsBergenSt = alert.headerText.toLowerCase().includes('bergen') || 
                                  alert.descriptionText.toLowerCase().includes('bergen');
          const mentionsSmithSt = alert.headerText.toLowerCase().includes('smith') || 
                                 alert.descriptionText.toLowerCase().includes('smith');
          
          if (mentionsCarrollSt || mentionsBergenSt || mentionsSmithSt) {
            console.log(`   ⚠️  CRITICAL: This alert affects Carroll St, Bergen St, or Smith St!`);
          }
          
          // Check informed entities
          console.log(`   📍 Informed Entities:`);
          alert.informedEntities.forEach((entity, entityIndex) => {
            console.log(`      ${entityIndex + 1}. Route: ${entity.routeId || 'N/A'}, Stop: ${entity.stopId || 'N/A'}, Direction: ${entity.directionId !== undefined ? entity.directionId : 'N/A'}`);
          });
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No F train alerts found\n');
      }

      // Check for alerts affecting Carroll St (F20) or Bergen St (F24)
      const carrollBergenAlerts = alerts.filter(alert => 
        alert.informedEntities.some(entity => 
          entity.stopId?.includes('F20') || 
          entity.stopId?.includes('F24') || 
          entity.stopId?.includes('F19') || // Smith-9 Sts
          alert.descriptionText.toLowerCase().includes('carroll') ||
          alert.descriptionText.toLowerCase().includes('bergen') ||
          alert.descriptionText.toLowerCase().includes('smith')
        )
      );

      console.log(`🏢 CARROLL ST / BERGEN ST / SMITH ST ALERTS: Found ${carrollBergenAlerts.length} alerts\n`);

      if (carrollBergenAlerts.length > 0) {
        carrollBergenAlerts.forEach((alert, index) => {
          console.log(`📢 CARROLL/BERGEN/SMITH ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No specific alerts for Carroll St, Bergen St, or Smith St\n');
      }

      // Check for Coney Island-bound alerts
      const coneyIslandAlerts = alerts.filter(alert => 
        alert.headerText.toLowerCase().includes('coney island') ||
        alert.descriptionText.toLowerCase().includes('coney island') ||
        alert.headerText.toLowerCase().includes('coney') ||
        alert.descriptionText.toLowerCase().includes('coney')
      );

      console.log(`🏝️ CONEY ISLAND ALERTS: Found ${coneyIslandAlerts.length} alerts\n`);

      if (coneyIslandAlerts.length > 0) {
        coneyIslandAlerts.forEach((alert, index) => {
          console.log(`📢 CONEY ISLAND ALERT ${index + 1}:`);
          console.log(`   🆔 ID: ${alert.id}`);
          console.log(`   📋 Header: ${alert.headerText}`);
          console.log(`   📝 Description: ${alert.descriptionText}`);
          console.log(`   🚨 Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   🚇 Affected Routes: ${alert.affectedRoutes.join(', ')}`);
          console.log('   ================================\n');
        });
      } else {
        console.log('✅ No Coney Island alerts found\n');
      }

      // Summary and analysis
      console.log('📊 ANALYSIS FOR F TRAIN CARROLL ST ISSUE:');
      console.log(`   🚇 Total F train specific alerts: ${fTrainAlerts.length}`);
      console.log(`   🏢 Carroll St/Bergen St/Smith St alerts: ${carrollBergenAlerts.length}`);
      console.log(`   🏝️ Coney Island alerts: ${coneyIslandAlerts.length}`);
      
      if (fTrainAlerts.length === 0) {
        console.log('\n✅ CONCLUSION: No F train alerts detected in GTFS feed.');
        console.log('   This could mean:');
        console.log('   1. 🕐 The alert on MTA website is not yet in GTFS feed');
        console.log('   2. 📡 The alert is in a different feed or format');
        console.log('   3. 🔄 There\'s a delay between MTA website and GTFS feed updates');
        console.log('   4. 🆔 The alert uses different station IDs than expected');
      } else {
        console.log('\n⚠️ CONCLUSION: F train alerts found - check if they match MTA website!');
      }

    } catch (error) {
      console.error('❌ Error fetching service alerts:', error);
    }

    // This test always passes - it's for information gathering
    expect(true).toBe(true);
  });
});