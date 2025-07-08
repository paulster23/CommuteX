import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('RealMTAService - Enhanced Alert Filtering', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
    jest.clearAllMocks();
  });

  test('shouldGetUserRouteStations', async () => {
    // Red: Test that getUserRouteStations returns all stations from possible user routes
    
    const routeStations = await service.getUserRouteStations();

    // Should include all stations from all possible routes
    expect(routeStations).toContain('F20'); // Carroll St (origin)
    expect(routeStations).toContain('F25'); // Jay St-MetroTech (F line)
    expect(routeStations).toContain('A41'); // Jay St-MetroTech (A/C line)
    expect(routeStations).toContain('F18'); // 23rd St (F line destination)
    expect(routeStations).toContain('A23'); // 23rd St-8th Ave (C line destination)
    expect(routeStations).toContain('A27'); // 14th St-8th Ave (A/C transfer point)

    // Should also include intermediate stations on F line
    expect(routeStations).toContain('F24'); // Bergen St (on F route to Jay St)

    // Should have unique stations (no duplicates)
    const uniqueStations = [...new Set(routeStations)];
    expect(routeStations.length).toBe(uniqueStations.length);

    // Should be an array of strings
    expect(Array.isArray(routeStations)).toBe(true);
    routeStations.forEach(station => {
      expect(typeof station).toBe('string');
    });
  });

  test('shouldIdentifyUserRouteAffectedByAlert', async () => {
    // Red: Test that isUserRouteAffected correctly identifies when alerts impact user's route
    
    // Mock alert affecting Carroll St (user's origin)
    const carrollStAlert = {
      id: 'alert-1',
      headerText: 'F Train Service Change',
      descriptionText: 'F trains skipping Carroll St',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S', // Carroll St southbound
          directionId: 0 // southbound
        }
      ],
      activePeriod: {
        start: new Date('2024-01-01T08:00:00'),
        end: new Date('2024-01-01T10:00:00')
      }
    };

    // Mock alert affecting different station (not user's route)
    const unrelatedAlert = {
      id: 'alert-2',
      headerText: 'F Train Service Change',
      descriptionText: 'F trains delayed at Church Ave',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F15S', // Church Ave (not on user's route)
          directionId: 0
        }
      ]
    };

    // Should detect Carroll St alert affects user route
    const isCarrollAffected = await service.isUserRouteAffected(carrollStAlert, 0); // southbound direction
    expect(isCarrollAffected).toBe(true);

    // Should detect unrelated alert doesn't affect user route
    const isUnrelatedAffected = await service.isUserRouteAffected(unrelatedAlert, 0);
    expect(isUnrelatedAffected).toBe(false);
  });

  test('shouldEscalateSeverityForUserRouteStations', async () => {
    // Red: Test that alerts affecting user route stations get severity escalated
    
    // Mock alert affecting Jay St-MetroTech (user's transfer hub)
    const jayStAlert = {
      id: 'alert-3',
      headerText: 'F Train Service Change',
      descriptionText: 'F trains not stopping at Jay St-MetroTech',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F25S', // Jay St southbound
          directionId: 0 // southbound (morning commute)
        }
      ]
    };

    // Mock getServiceAlerts to return our test alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([jayStAlert]);
    
    // Also mock getServiceAlertsForCommute to return our test alert directly
    jest.spyOn(service, 'getServiceAlertsForCommute').mockResolvedValue([jayStAlert]);

    // Mock route for morning commute (southbound)
    const mockRoute = {
      id: 1,
      arrivalTime: '9:30 AM',
      duration: '32 min',
      method: 'F train',
      details: 'Direct F train from Carroll St to 23rd St',
      transfers: 0,
      walkingToTransit: 5,
      isRealTimeData: true,
      confidence: 'high' as const,
      startingStation: 'Carroll St',
      endingStation: '23rd St',
      waitTime: 6,
      nextTrainDeparture: '9:00 AM',
      finalWalkingTime: 8,
      transitTime: 18,
      steps: [
        {
          type: 'walk' as const,
          description: 'Walk to Carroll St',
          duration: 5,
          dataSource: 'fixed' as const
        },
        {
          type: 'wait' as const,
          description: 'Wait for F train',
          duration: 6,
          dataSource: 'realtime' as const,
          line: 'F'
        },
        {
          type: 'transit' as const,
          description: 'F train to 23rd St',
          duration: 18,
          dataSource: 'realtime' as const,
          line: 'F',
          fromStation: 'Carroll St',
          toStation: '23rd St'
        }
      ]
    };

    // Should escalate severity when user route station is affected
    const alertInfo = await service.checkRouteForAlerts(mockRoute, 0); // direction 0 = southbound (morning)
    
    // Should detect alerts affecting user route
    expect(alertInfo.hasAlerts).toBe(true);
    
    // Should escalate severity to severe when user's critical stations are affected
    expect(alertInfo.severity).toBe('severe');
    
    // Should include the relevant alert
    expect(alertInfo.alerts.length).toBeGreaterThan(0);
  });

  test('shouldFilterAlertsByDirection', async () => {
    // Red: Test that morning page only shows southbound alerts, evening page only shows northbound
    
    // Mock southbound alert (relevant for morning commute)
    const southboundAlert = {
      id: 'alert-sb',
      headerText: 'F Train Southbound Delay',
      descriptionText: 'Southbound F trains delayed due to signal problems',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S',
          directionId: 0 // southbound
        }
      ]
    };

    // Mock northbound alert (relevant for evening commute)
    const northboundAlert = {
      id: 'alert-nb', 
      headerText: 'F Train Northbound Delay',
      descriptionText: 'Northbound F trains delayed due to signal problems',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20N',
          directionId: 1 // northbound
        }
      ]
    };

    // Mock getServiceAlerts to return both alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([southboundAlert, northboundAlert]);

    // Morning commute (direction 0) should only show southbound alerts
    const morningAlerts = await service.getServiceAlertsForDirection(['F'], 0);
    expect(morningAlerts).toHaveLength(1);
    expect(morningAlerts[0].id).toBe('alert-sb');

    // Evening commute (direction 1) should only show northbound alerts  
    const eveningAlerts = await service.getServiceAlertsForDirection(['F'], 1);
    expect(eveningAlerts).toHaveLength(1);
    expect(eveningAlerts[0].id).toBe('alert-nb');
  });

  test('shouldFilterExpiredAndFutureAlerts', async () => {
    // Red: Test that only currently active alerts are shown
    
    const now = new Date('2024-01-01T09:00:00');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    // Mock active alert (currently happening)
    const activeAlert = {
      id: 'alert-active',
      headerText: 'Current F Train Delay',
      descriptionText: 'F trains delayed',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S',
          directionId: 0
        }
      ],
      activePeriod: {
        start: new Date('2024-01-01T08:30:00'), // Started 30 minutes ago
        end: new Date('2024-01-01T10:00:00')   // Ends in 1 hour
      }
    };

    // Mock expired alert (already ended)
    const expiredAlert = {
      id: 'alert-expired',
      headerText: 'Past F Train Issue',
      descriptionText: 'F trains were delayed earlier',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S',
          directionId: 0
        }
      ],
      activePeriod: {
        start: new Date('2024-01-01T07:00:00'), // Started 2 hours ago
        end: new Date('2024-01-01T08:00:00')   // Ended 1 hour ago
      }
    };

    // Mock future alert (hasn't started yet)
    const futureAlert = {
      id: 'alert-future',
      headerText: 'Planned F Train Work',
      descriptionText: 'F trains will be affected later',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S',
          directionId: 0
        }
      ],
      activePeriod: {
        start: new Date('2024-01-01T11:00:00'), // Starts in 2 hours
        end: new Date('2024-01-01T13:00:00')   // Ends in 4 hours
      }
    };

    // Mock getServiceAlerts to return all alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([activeAlert, expiredAlert, futureAlert]);

    // Should only return currently active alerts
    const currentAlerts = await service.getActiveServiceAlerts();
    expect(currentAlerts).toHaveLength(1);
    expect(currentAlerts[0].id).toBe('alert-active');

    jest.useRealTimers();
  });

  test('shouldHandleAlertsWithoutActivePeriod', async () => {
    // Red: Test that alerts without activePeriod are treated as always active
    
    const alertWithoutPeriod = {
      id: 'alert-no-period',
      headerText: 'General F Train Notice',
      descriptionText: 'F trains running normally',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'F',
          stopId: 'F20S',
          directionId: 0
        }
      ]
      // No activePeriod specified
    };

    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([alertWithoutPeriod]);

    // Should include alerts without activePeriod (treat as always active)
    const activeAlerts = await service.getActiveServiceAlerts();
    expect(activeAlerts).toHaveLength(1);
    expect(activeAlerts[0].id).toBe('alert-no-period');
  });
});