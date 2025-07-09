import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Station-Skipping Alert Direction Filtering', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    jest.clearAllMocks();
  });

  test('shouldShowStationSkippingAlertsRegardlessOfDirection', async () => {
    // Red: Test that station-skipping alerts are shown even if direction doesn't match
    
    // Mock the critical C train station-skipping alert from real MTA data
    const stationSkippingAlert = {
      id: 'F_C_STATIONS_SKIPPED',
      headerText: 'C Train Service Change',
      descriptionText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
      affectedRoutes: ['C'],
      severity: 'severe' as const,
      informedEntities: [
        {
          routeId: 'C',
          directionId: 1, // uptown = northbound = direction 1
          stopId: 'A25' // 23rd St-8th Ave (different ID than expected A23)
        }
      ],
      activePeriod: {
        start: new Date('2024-01-01T00:00:00'),
        end: new Date('2024-12-31T23:59:59')
      }
    };

    // Mock getServiceAlerts to return the station-skipping alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([stationSkippingAlert]);
    
    // Also mock getActiveServiceAlerts which is what getServiceAlertsForCommute calls
    jest.spyOn(service, 'getActiveServiceAlerts').mockResolvedValue([stationSkippingAlert]);

    // Test for afternoon commute (direction 0 = southbound)
    // Even though the alert says "uptown" (direction 1), it affects southbound travel TO that station
    const afternoonAlerts = await service.getServiceAlertsForCommute(['C'], 0); // direction 0 = southbound
    
    
    // Should show the station-skipping alert because it affects travel to/from the station
    expect(afternoonAlerts).toHaveLength(1);
    expect(afternoonAlerts[0].id).toBe('F_C_STATIONS_SKIPPED');
    expect(afternoonAlerts[0].severity).toBe('severe');
  });

  test('shouldEscalateSeverityForStationSkippingAlerts', async () => {
    // Red: Test that station-skipping alerts get escalated to 'severe' severity
    
    const stationSkippingAlert = {
      id: 'F_C_STATIONS_SKIPPED',
      headerText: 'C Train Service Change',
      descriptionText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
      affectedRoutes: ['C'],
      severity: 'warning' as const, // Originally just a warning
      informedEntities: [
        {
          routeId: 'C',
          directionId: 1, // uptown
          stopId: 'A25' // 23rd St-8th Ave
        }
      ]
    };

    // Mock getServiceAlerts to return the station-skipping alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([stationSkippingAlert]);
    
    // Also mock getServiceAlertsForCommute to return the alert
    jest.spyOn(service, 'getServiceAlertsForCommute').mockResolvedValue([stationSkippingAlert]);

    // Mock route going to the affected station
    const mockRoute = {
      id: 1,
      arrivalTime: '6:30 PM',
      duration: '35 min',
      method: 'F→A→C transfer',
      details: 'F train to Jay St, A train to 14th St, C train to 23rd St',
      transfers: 2,
      walkingToTransit: 6,
      isRealTimeData: true,
      confidence: 'high' as const,
      startingStation: '23rd St',
      endingStation: 'Carroll St',
      waitTime: 3,
      nextTrainDeparture: '6:00 PM',
      finalWalkingTime: 12,
      transitTime: 20,
      steps: [
        {
          type: 'walk' as const,
          description: 'Walk to 23rd St-8th Ave',
          duration: 6,
          dataSource: 'fixed' as const
        },
        {
          type: 'transit' as const,
          description: 'C train to 14th St',
          duration: 3,
          dataSource: 'realtime' as const,
          line: 'C',
          fromStation: '23rd St-8th Ave',
          toStation: '14th St-8th Ave'
        }
      ]
    };

    // Check route for alerts (direction 0 = southbound afternoon commute)
    const alertInfo = await service.checkRouteForAlerts(mockRoute, 0);
    
    // Should detect the station-skipping alert
    expect(alertInfo.hasAlerts).toBe(true);
    
    // Should escalate severity to 'severe' because station skipping makes routes impossible
    expect(alertInfo.severity).toBe('severe');
    
    // Should include the relevant alert
    expect(alertInfo.alerts.length).toBeGreaterThan(0);
    expect(alertInfo.alerts[0].id).toBe('F_C_STATIONS_SKIPPED');
  });

  test('shouldRecognizeStationSkippingFromAlertText', async () => {
    // Red: Test that alerts mentioning station skipping are recognized as critical
    
    const stationSkippingAlert = {
      id: 'F_STATIONS_SKIPPED',
      headerText: 'F Train Service Change',
      descriptionText: 'F trains skip Carroll St and Bergen St due to track work',
      affectedRoutes: ['F'],
      severity: 'info' as const, // Originally just info
      informedEntities: [
        {
          routeId: 'F',
          // No directionId - affects all directions
          stopId: 'F20' // Carroll St
        }
      ]
    };

    // Mock getServiceAlerts to return the station-skipping alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([stationSkippingAlert]);

    // Should recognize "skip" keyword and treat as critical
    const isStationSkipping = await service.isStationSkippingAlert(stationSkippingAlert);
    expect(isStationSkipping).toBe(true);
    
    // Should escalate severity for station-skipping alerts
    const escalatedSeverity = await service.getEscalatedSeverityForAlert(stationSkippingAlert);
    expect(escalatedSeverity).toBe('severe');
  });

  test('shouldShowStationSkippingAlertsForBothDirections', async () => {
    // Red: Test that station-skipping alerts are shown for both morning and evening commutes
    
    const stationSkippingAlert = {
      id: 'F_C_STATIONS_SKIPPED',
      headerText: 'C Train Service Change',
      descriptionText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
      affectedRoutes: ['C'],
      severity: 'severe' as const,
      informedEntities: [
        {
          routeId: 'C',
          directionId: 1, // uptown only
          stopId: 'A25' // 23rd St-8th Ave
        }
      ]
    };

    // Mock getServiceAlerts to return the station-skipping alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([stationSkippingAlert]);

    // Should show for morning commute (direction 0 = southbound)
    const morningAlerts = await service.getServiceAlertsForCommute(['C'], 0);
    expect(morningAlerts).toHaveLength(1);
    expect(morningAlerts[0].id).toBe('F_C_STATIONS_SKIPPED');

    // Should also show for evening commute (direction 1 = northbound)
    const eveningAlerts = await service.getServiceAlertsForCommute(['C'], 1);
    expect(eveningAlerts).toHaveLength(1);
    expect(eveningAlerts[0].id).toBe('F_C_STATIONS_SKIPPED');
  });
});