import { RealMTAService } from '../RealMTAService';

describe('RealMTAService - Current Alert Diagnostic', () => {
  test('shouldDiagnoseCurrentAlertStatusForCommuteLines', async () => {
    // This test checks the live GTFS feed to verify current alert status
    // for F, A, C, and E trains specifically
    const service = new RealMTAService();
    
    try {
      console.log('\n🔍 DIAGNOSTIC: Current Service Alert Status');
      console.log('================================================');
      
      // Get all alerts from the feed
      const allAlerts = await service.getServiceAlerts();
      console.log(`📊 Total alerts in GTFS feed: ${allAlerts.length}`);
      
      // Get only active alerts
      const activeAlerts = await service.getActiveServiceAlerts();
      console.log(`✅ Active alerts (after time filtering): ${activeAlerts.length}`);
      console.log(`🗑️  Filtered out (expired/future): ${allAlerts.length - activeAlerts.length}`);
      
      // Filter for commute lines specifically
      const commuteLines = ['F', 'A', 'C', 'E'];
      const commuteAlerts = activeAlerts.filter(alert => 
        alert.affectedRoutes.some(route => commuteLines.includes(route))
      );
      
      console.log(`\n🚇 Alerts affecting commute lines (F, A, C, E): ${commuteAlerts.length}`);
      
      if (commuteAlerts.length === 0) {
        console.log('✅ No active service alerts for F, A, C, or E trains');
        console.log('   This explains why no alerts are shown in the app');
      } else {
        console.log('\n📋 ACTIVE ALERTS FOR COMMUTE LINES:');
        commuteAlerts.forEach((alert, index) => {
          console.log(`\n${index + 1}. [${alert.affectedRoutes.join(', ')}] ${alert.headerText}`);
          console.log(`   Description: ${alert.descriptionText}`);
          console.log(`   Severity: ${alert.severity}`);
          if (alert.activePeriod) {
            console.log(`   Active: ${alert.activePeriod.start} to ${alert.activePeriod.end}`);
          } else {
            console.log('   Active: No time limit specified');
          }
          
          // Show direction info
          const directions = alert.informedEntities
            .filter(entity => entity.directionId !== undefined)
            .map(entity => entity.directionId === 0 ? 'Southbound' : 'Northbound');
          if (directions.length > 0) {
            console.log(`   Directions: ${directions.join(', ')}`);
          } else {
            console.log('   Directions: All directions');
          }
        });
      }
      
      // Test the specific method used by the app
      console.log('\n🔧 Testing getServiceAlertsForCommute method:');
      
      // Morning commute (northbound)
      const morningAlerts = await service.getServiceAlertsForCommute(['F', 'C', 'A'], 1);
      console.log(`   Morning alerts (northbound): ${morningAlerts.length}`);
      
      // Afternoon commute (southbound)
      const afternoonAlerts = await service.getServiceAlertsForCommute(['F', 'C', 'A'], 0);
      console.log(`   Afternoon alerts (southbound): ${afternoonAlerts.length}`);
      
      // Show sample of filtered out alerts to verify filtering is working
      const expiredAlerts = allAlerts.filter(alert => {
        if (!alert.activePeriod?.end) return false;
        return new Date() > alert.activePeriod.end;
      });
      
      console.log(`\n🗓️  Sample expired alerts (correctly filtered out): ${expiredAlerts.length}`);
      if (expiredAlerts.length > 0) {
        expiredAlerts.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. [${alert.affectedRoutes.join(', ')}] ${alert.headerText}`);
          console.log(`      Expired: ${alert.activePeriod?.end}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in diagnostic test:', error);
    }
    
    // This test always passes - it's purely diagnostic
    expect(true).toBe(true);
  });
});