import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Alert Logging and Debugging', () => {
  let service: RealMTAService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('shouldLogAlertFilteringSteps', async () => {
    // Red: Test that alert filtering steps are logged for debugging
    const mockAlerts = [
      {
        id: 'test-alert-1',
        headerText: 'F trains are delayed',
        descriptionText: 'Signal problems causing delays',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(Date.now() - 30 * 60 * 1000),
          end: new Date(Date.now() + 30 * 60 * 1000)
        }
      },
      {
        id: 'test-alert-2',
        headerText: 'F trains skip Carroll St',
        descriptionText: 'Station-skipping alert',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F', stopId: 'F20' }],
        activePeriod: {
          start: new Date(Date.now() - 60 * 60 * 1000),
          end: new Date(Date.now() + 60 * 60 * 1000)
        }
      }
    ];

    // Mock getServiceAlerts to return test alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(mockAlerts);

    // Enable debug logging
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const alerts = await service.getServiceAlertsForCommute(['F'], 0);
      
      // Should log filtering steps
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Alert filtering.*step.*F.*direction.*0/)
      );
      
      expect(alerts).toBeDefined();
      expect(alerts.length).toBeGreaterThan(0);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('shouldLogAlertEscalation', async () => {
    // Red: Test that alert severity escalation is logged
    const stationSkippingAlert = {
      id: 'station-skip-alert',
      headerText: 'F trains skip Carroll St',
      descriptionText: 'Station-skipping alert for user route',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [{ routeId: 'F', stopId: 'F20' }]
    };

    // Test escalation logging
    const escalatedSeverity = service.getEscalatedSeverityForAlert(stationSkippingAlert);
    
    expect(escalatedSeverity).toBe('severe');
    // Should log escalation when in debug mode
    process.env.DEBUG_ALERTS = 'true';
    
    try {
      service.getEscalatedSeverityForAlert(stationSkippingAlert);
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Alert.*escalated.*info.*severe/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogStationSkippingDetection', () => {
    // Red: Test that station-skipping detection is logged
    const testAlerts = [
      {
        id: 'skip-alert',
        headerText: 'F trains skip Carroll St',
        descriptionText: 'Station-skipping alert',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F', stopId: 'F20' }]
      },
      {
        id: 'delay-alert',
        headerText: 'F trains are delayed',
        descriptionText: 'Regular delay alert',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }]
      }
    ];

    process.env.DEBUG_ALERTS = 'true';
    
    try {
      testAlerts.forEach(alert => {
        const isSkipping = service.isStationSkippingAlert(alert);
        
        if (alert.id === 'skip-alert') {
          expect(isSkipping).toBe(true);
        } else {
          expect(isSkipping).toBe(false);
        }
      });
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Station-skipping.*detected.*skip/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogActiveAlertFiltering', async () => {
    // Red: Test that active alert filtering is logged
    const now = new Date();
    const testAlerts = [
      {
        id: 'active-alert',
        headerText: 'Currently active alert',
        descriptionText: 'Active right now',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 30 * 60 * 1000),
          end: new Date(now.getTime() + 30 * 60 * 1000)
        }
      },
      {
        id: 'expired-alert',
        headerText: 'Expired alert',
        descriptionText: 'No longer active',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          end: new Date(now.getTime() - 1 * 60 * 60 * 1000)
        }
      }
    ];

    // Mock getServiceAlerts to return test alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(testAlerts);

    process.env.DEBUG_ALERTS = 'true';
    
    try {
      const activeAlerts = await service.getActiveServiceAlerts();
      
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe('active-alert');
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Filtering.*active.*alerts.*2.*1/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogAlertRelevanceScoring', async () => {
    // Red: Test that alert relevance scoring is logged
    const testAlert = {
      id: 'relevance-test',
      headerText: 'F trains skip Carroll St',
      descriptionText: 'Affects user route',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [{ routeId: 'F', stopId: 'F20' }]
    };

    process.env.DEBUG_ALERTS = 'true';
    
    try {
      const isRelevant = await service.isUserRouteAffected(testAlert, 0);
      
      expect(isRelevant).toBe(true);
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Alert.*relevance.*user.*route/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogAlertStatistics', async () => {
    // Red: Test that alert statistics are logged
    const mockAlerts = Array.from({ length: 10 }, (_, i) => ({
      id: `alert-${i}`,
      headerText: `Test alert ${i}`,
      descriptionText: `Description ${i}`,
      affectedRoutes: i % 2 === 0 ? ['F'] : ['C'],
      severity: (i % 3 === 0 ? 'severe' : i % 3 === 1 ? 'warning' : 'info') as const,
      informedEntities: [{ routeId: i % 2 === 0 ? 'F' : 'C' }]
    }));

    // Mock getServiceAlerts to return test alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(mockAlerts);

    process.env.DEBUG_ALERTS = 'true';
    
    try {
      const alerts = await service.getServiceAlertsForCommute(['F'], 0);
      
      expect(alerts).toBeDefined();
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Alert statistics.*total.*alerts/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogAlertTimingAnalysis', async () => {
    // Red: Test that alert timing analysis is logged
    const now = new Date();
    const timingTestAlerts = [
      {
        id: 'future-alert',
        headerText: 'Future alert',
        descriptionText: 'Starts in 1 hour',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() + 60 * 60 * 1000),
          end: new Date(now.getTime() + 2 * 60 * 60 * 1000)
        }
      },
      {
        id: 'ongoing-alert',
        headerText: 'Ongoing alert',
        descriptionText: 'Currently active',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 30 * 60 * 1000),
          end: new Date(now.getTime() + 30 * 60 * 1000)
        }
      }
    ];

    // Mock getServiceAlerts to return test alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(timingTestAlerts);

    process.env.DEBUG_ALERTS = 'true';
    
    try {
      const prioritizedAlerts = await service.getPrioritizedAlertsForCommute(['F'], 0);
      
      expect(prioritizedAlerts).toBeDefined();
      
      if (process.env.DEBUG_ALERTS === 'true') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Alert.*timing.*analysis.*future.*ongoing/)
        );
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });

  test('shouldLogAlertSourceInformation', async () => {
    // Red: Test that alert source information is logged
    process.env.DEBUG_ALERTS = 'true';
    
    try {
      // Test the parseAlertsBuffer method directly to trigger source logging
      const mockBuffer = Buffer.from('test data');
      
      // Mock GtfsRealtimeBindings to avoid actual protobuf parsing
      const mockFeed = {
        entity: [{
          id: 'test-alert',
          alert: {
            headerText: { translation: [{ text: 'Test alert' }] },
            descriptionText: { translation: [{ text: 'Test description' }] },
            informedEntity: [{ routeId: 'F' }],
            activePeriod: []
          }
        }]
      };
      
      // Mock the decode method
      const originalDecode = require('gtfs-realtime-bindings').transit_realtime.FeedMessage.decode;
      require('gtfs-realtime-bindings').transit_realtime.FeedMessage.decode = jest.fn().mockReturnValue(mockFeed);
      
      try {
        const alerts = await service.parseAlertsBuffer(mockBuffer.buffer);
        
        expect(alerts).toBeDefined();
        
        if (process.env.DEBUG_ALERTS === 'true') {
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Alert source.*GTFS.*feed.*alerts loaded/)
          );
        }
      } finally {
        // Restore original method
        require('gtfs-realtime-bindings').transit_realtime.FeedMessage.decode = originalDecode;
      }
    } finally {
      delete process.env.DEBUG_ALERTS;
    }
  });
});