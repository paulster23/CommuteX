import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

interface WebsiteAlert {
  line: string;
  title: string;
  description: string;
  isServiceChange: boolean;
  isDelay: boolean;
  isPlanned: boolean;
  affectsStations: string[];
  severity: 'info' | 'warning' | 'severe';
}

describe('RealMTAService - Alert Comparison (GTFS vs Website)', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  /**
   * Helper function to scrape current alerts from MTA website
   * This is for testing comparison only - not for production use
   */
  async function scrapeWebsiteAlerts(): Promise<WebsiteAlert[]> {
    try {
      // Fetch the MTA service status page
      const response = await fetch('https://www.mta.info/');
      const html = await response.text();
      
      const alerts: WebsiteAlert[] = [];
      
      // Parse HTML to extract service alerts
      // Look for service alert patterns in the HTML
      const serviceAlertPatterns = [
        // Pattern for F train alerts
        /In Brooklyn.*?[Cc]oney [Ii]sland[- ]bound.*?\[F\].*?skips.*?(Carroll St|Bergen St|Smith.*?9.*?St)/gi,
        // Pattern for C train alerts  
        /In Manhattan.*?uptown.*?\[C\].*?skips.*?(Spring St|23.*?St|50.*?St)/gi,
        // Pattern for general station skipping
        /\[([ABCDEFGJLMNQRWZ123456789])\].*?skips.*?([A-Za-z0-9\s\-,]+)/gi,
        // Pattern for service changes
        /\[([ABCDEFGJLMNQRWZ123456789])\].*?(service change|no service|not stopping)/gi
      ];
      
      for (const pattern of serviceAlertPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const line = match[1] || 'Unknown';
          const fullText = match[0];
          
          // Extract stations mentioned
          const stationMatches = fullText.match(/(Carroll St|Bergen St|Smith.*?9.*?St|23.*?St|Spring St|50.*?St)/gi) || [];
          
          alerts.push({
            line,
            title: fullText.substring(0, 100) + '...',
            description: fullText,
            isServiceChange: /skips|not stopping|no service/.test(fullText),
            isDelay: /delay|slower|disruption/.test(fullText),
            isPlanned: /planned|scheduled|maintenance/.test(fullText),
            affectsStations: stationMatches,
            severity: /skips|not stopping|no service/.test(fullText) ? 'severe' : 'warning'
          });
        }
      }
      
      // Look for specific Carroll St F train alert pattern
      const carrollStPattern = /[Cc]oney [Ii]sland[- ]bound.*?\[F\].*?skips.*?(Bergen St|Carroll St|Smith.*?9.*?St)/gi;
      const carrollMatches = html.matchAll(carrollStPattern);
      
      for (const match of carrollMatches) {
        alerts.push({
          line: 'F',
          title: 'Coney Island-bound F train skips stations',
          description: match[0],
          isServiceChange: true,
          isDelay: false,
          isPlanned: true,
          affectsStations: ['Bergen St', 'Carroll St', 'Smith-9 Sts'],
          severity: 'severe'
        });
      }
      
      // Look for C train 23rd St alert
      const cTrainPattern = /uptown.*?\[C\].*?skips.*?(Spring St|23.*?St|50.*?St)/gi;
      const cTrainMatches = html.matchAll(cTrainPattern);
      
      for (const match of cTrainMatches) {
        alerts.push({
          line: 'C',
          title: 'Uptown C train skips Manhattan stations',
          description: match[0],
          isServiceChange: true,
          isDelay: false,
          isPlanned: true,
          affectsStations: ['Spring St', '23rd St', '50th St'],
          severity: 'severe'
        });
      }
      
      return alerts;
    } catch (error) {
      console.warn('Failed to scrape website alerts:', error);
      return [];
    }
  }

  test('shouldCompareGTFSAlertsWithWebsiteAlerts', async () => {
    console.log('\n🔍 COMPARING GTFS ALERTS WITH MTA WEBSITE ALERTS 🔍\n');
    
    try {
      // Get GTFS alerts
      const gtfsAlerts = await service.getServiceAlerts();
      console.log(`📡 GTFS Feed: ${gtfsAlerts.length} total alerts`);
      
      // Get website alerts  
      const websiteAlerts = await scrapeWebsiteAlerts();
      console.log(`🌐 Website: ${websiteAlerts.length} parsed alerts\n`);
      
      // Focus on F and C train alerts
      const gtfsFTrainAlerts = gtfsAlerts.filter(alert => 
        alert.affectedRoutes.includes('F') && 
        (alert.headerText.toLowerCase().includes('carroll') || 
         alert.headerText.toLowerCase().includes('bergen') ||
         alert.headerText.toLowerCase().includes('smith') ||
         alert.descriptionText.toLowerCase().includes('carroll') ||
         alert.descriptionText.toLowerCase().includes('bergen') ||
         alert.descriptionText.toLowerCase().includes('smith'))
      );
      
      const gtfsCTrainAlerts = gtfsAlerts.filter(alert => 
        alert.affectedRoutes.includes('C') && 
        (alert.headerText.toLowerCase().includes('23') || 
         alert.descriptionText.toLowerCase().includes('23'))
      );
      
      const websiteFTrainAlerts = websiteAlerts.filter(alert => 
        alert.line === 'F' && 
        alert.affectsStations.some(station => 
          station.toLowerCase().includes('carroll') || 
          station.toLowerCase().includes('bergen') ||
          station.toLowerCase().includes('smith'))
      );
      
      const websiteCTrainAlerts = websiteAlerts.filter(alert => 
        alert.line === 'C' && 
        alert.affectsStations.some(station => station.includes('23'))
      );
      
      console.log('🚇 F TRAIN CARROLL ST / BERGEN ST ALERTS:');
      console.log(`   📡 GTFS: ${gtfsFTrainAlerts.length} alerts`);
      console.log(`   🌐 Website: ${websiteFTrainAlerts.length} alerts`);
      
      if (gtfsFTrainAlerts.length > 0) {
        console.log('\n   📡 GTFS F Train Alerts:');
        gtfsFTrainAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.headerText}`);
          console.log(`      Description: ${alert.descriptionText.substring(0, 150)}...`);
        });
      }
      
      if (websiteFTrainAlerts.length > 0) {
        console.log('\n   🌐 Website F Train Alerts:');
        websiteFTrainAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Stations: ${alert.affectsStations.join(', ')}`);
          console.log(`      Description: ${alert.description.substring(0, 150)}...`);
        });
      }
      
      console.log('\n🚇 C TRAIN 23RD ST ALERTS:');
      console.log(`   📡 GTFS: ${gtfsCTrainAlerts.length} alerts`);
      console.log(`   🌐 Website: ${websiteCTrainAlerts.length} alerts`);
      
      if (gtfsCTrainAlerts.length > 0) {
        console.log('\n   📡 GTFS C Train Alerts:');
        gtfsCTrainAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.headerText}`);
          console.log(`      Active: ${alert.activePeriod?.start} to ${alert.activePeriod?.end}`);
          console.log(`      Description: ${alert.descriptionText.substring(0, 150)}...`);
        });
      }
      
      if (websiteCTrainAlerts.length > 0) {
        console.log('\n   🌐 Website C Train Alerts:');
        websiteCTrainAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Stations: ${alert.affectsStations.join(', ')}`);
          console.log(`      Description: ${alert.description.substring(0, 150)}...`);
        });
      }
      
      // Analysis
      console.log('\n📊 ANALYSIS:');
      
      if (websiteFTrainAlerts.length > 0 && gtfsFTrainAlerts.length === 0) {
        console.log('   ⚠️  MISSING F TRAIN ALERTS: Website shows Carroll St alerts but GTFS feed does not');
      } else if (websiteFTrainAlerts.length === 0 && gtfsFTrainAlerts.length === 0) {
        console.log('   ✅ F TRAIN ALERTS: Both sources show no Carroll St alerts');
      } else {
        console.log('   ✅ F TRAIN ALERTS: Both sources have alerts - need to compare details');
      }
      
      if (websiteCTrainAlerts.length > 0 && gtfsCTrainAlerts.length === 0) {
        console.log('   ⚠️  MISSING C TRAIN ALERTS: Website shows 23rd St alerts but GTFS feed does not');
      } else if (websiteCTrainAlerts.length === 0 && gtfsCTrainAlerts.length === 0) {
        console.log('   ✅ C TRAIN ALERTS: Both sources show no 23rd St alerts');
      } else {
        console.log('   ✅ C TRAIN ALERTS: Both sources have alerts - need to compare details');
      }
      
      console.log('\n🔍 NEXT STEPS:');
      console.log('   1. Check if GTFS alerts are being filtered out by time/direction');
      console.log('   2. Verify station ID matching (F20=Carroll St, A25=23rd St)');
      console.log('   3. Test app alert display with current filtering logic');
      console.log('   4. Compare alert active periods with current time');
      
    } catch (error) {
      console.error('❌ Error comparing alerts:', error);
    }
    
    // This test always passes - it's for comparison analysis
    expect(true).toBe(true);
  });

  test('shouldTestAppAlertDisplay', async () => {
    console.log('\n📱 TESTING APP ALERT DISPLAY 📱\n');
    
    try {
      // Test morning commute alerts (direction 0 = southbound)
      console.log('🌅 MORNING COMMUTE ALERTS (direction 0 = southbound):');
      const morningAlerts = await service.getServiceAlertsForCommute(['F', 'C'], 0);
      console.log(`   Found ${morningAlerts.length} alerts for morning commute`);
      
      morningAlerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.affectedRoutes.join(',')}] ${alert.headerText}`);
        console.log(`      Severity: ${alert.severity}`);
        console.log(`      Station-skipping: ${service.isStationSkippingAlert(alert)}`);
        console.log(`      Active: ${alert.activePeriod?.start} to ${alert.activePeriod?.end}`);
      });
      
      // Test afternoon commute alerts (direction 1 = northbound)
      console.log('\n🌆 AFTERNOON COMMUTE ALERTS (direction 1 = northbound):');
      const afternoonAlerts = await service.getServiceAlertsForCommute(['F', 'C'], 1);
      console.log(`   Found ${afternoonAlerts.length} alerts for afternoon commute`);
      
      afternoonAlerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.affectedRoutes.join(',')}] ${alert.headerText}`);
        console.log(`      Severity: ${alert.severity}`);
        console.log(`      Station-skipping: ${service.isStationSkippingAlert(alert)}`);
        console.log(`      Active: ${alert.activePeriod?.start} to ${alert.activePeriod?.end}`);
      });
      
      // Test specific station alerts
      console.log('\n🏢 TESTING STATION-SPECIFIC ALERTS:');
      const userStations = ['F20', 'F18', 'F24', 'A23', 'A25', 'A27', 'A41'];
      
      for (const station of userStations) {
        const stationAlerts = await service.getServiceAlertsForCommute(['F', 'C'], 0, [station]);
        console.log(`   Station ${station}: ${stationAlerts.length} alerts`);
      }
      
      // Test current time vs alert active periods
      console.log('\n⏰ TESTING TIME-BASED FILTERING:');
      const now = new Date();
      console.log(`   Current time: ${now.toISOString()}`);
      
      const allAlerts = await service.getServiceAlerts();
      const activeAlerts = await service.getActiveServiceAlerts();
      
      console.log(`   Total alerts: ${allAlerts.length}`);
      console.log(`   Active alerts: ${activeAlerts.length}`);
      console.log(`   Filtered out: ${allAlerts.length - activeAlerts.length}`);
      
      // Show some filtered out alerts
      const filteredAlerts = allAlerts.filter(alert => 
        !activeAlerts.some(active => active.id === alert.id)
      );
      
      console.log('\n   📋 SAMPLE FILTERED OUT ALERTS:');
      filteredAlerts.slice(0, 3).forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.affectedRoutes.join(',')}] ${alert.headerText}`);
        console.log(`      Active: ${alert.activePeriod?.start} to ${alert.activePeriod?.end}`);
        console.log(`      Reason: ${!alert.activePeriod ? 'No active period' : 
          alert.activePeriod.end && now > alert.activePeriod.end ? 'Expired' :
          alert.activePeriod.start && now < alert.activePeriod.start ? 'Future' : 'Other'}`);
      });
      
    } catch (error) {
      console.error('❌ Error testing app alert display:', error);
    }
    
    // This test always passes - it's for analysis
    expect(true).toBe(true);
  });
});