import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Improved Time-based Alert Filtering', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldShowUpcomingStationSkippingAlerts', async () => {
    // Red: Test that station-skipping alerts are shown even if they're scheduled for the future
    
    // Mock a future station-skipping alert (like the C train 23rd St alert)
    const futureStationSkippingAlert = {
      id: 'future-station-skipping',
      headerText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
      descriptionText: 'For service to Spring St and 23 St, take the [C] to W 4 St-Wash Sq or 34 St-Penn Station and transfer to a downtown [C] or [E].',
      affectedRoutes: ['C'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'C',
          directionId: 1, // uptown
          stopId: 'A25' // 23rd St-8th Ave
        }
      ],
      activePeriod: {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) // 2 hours later
      }
    };

    // Mock getServiceAlerts to return the future alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([futureStationSkippingAlert]);

    // Should show upcoming station-skipping alerts
    const upcomingAlerts = await service.getUpcomingStationSkippingAlerts();
    expect(upcomingAlerts).toHaveLength(1);
    expect(upcomingAlerts[0].id).toBe('future-station-skipping');
  });

  test('shouldShowRecentlyExpiredStationSkippingAlerts', async () => {
    // Red: Test that recently expired station-skipping alerts are still shown
    
    // Mock a recently expired station-skipping alert (like the F train Carroll St alert)
    const recentlyExpiredAlert = {
      id: 'recently-expired-station-skipping',
      headerText: 'In Brooklyn, Coney Island-bound [F] skips Bergen St, Carroll St and Smith-9 Sts',
      descriptionText: 'For service to these stations, take the [F] to 4 Av-9 St and transfer to a Manhattan-bound [F].',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        {
          routeId: 'F',
          directionId: 0, // southbound
          stopId: 'F20' // Carroll St
        }
      ],
      activePeriod: {
        start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        end: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    };

    // Mock getServiceAlerts to return the recently expired alert
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([recentlyExpiredAlert]);

    // Should show recently expired station-skipping alerts
    const recentAlerts = await service.getRecentStationSkippingAlerts();
    expect(recentAlerts).toHaveLength(1);
    expect(recentAlerts[0].id).toBe('recently-expired-station-skipping');
  });

  test('shouldShowRelevantAlertsForTimeWindow', async () => {
    // Red: Test that alerts within a relevant time window are shown
    
    const now = new Date();
    
    // Mock alerts at different time periods
    const alerts = [
      {
        id: 'current-alert',
        headerText: 'Current F train delay',
        descriptionText: 'F trains are delayed',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          end: new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
        }
      },
      {
        id: 'upcoming-alert',
        headerText: 'Upcoming F train work',
        descriptionText: 'F trains will skip stations',
        affectedRoutes: ['F'],
        severity: 'severe' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
          end: new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours from now
        }
      },
      {
        id: 'recent-alert',
        headerText: 'Recent F train issue',
        descriptionText: 'F trains were delayed',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          end: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
        }
      },
      {
        id: 'old-alert',
        headerText: 'Old F train issue',
        descriptionText: 'F trains were delayed yesterday',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
          end: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    ];

    // Mock getServiceAlerts to return all alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(alerts);

    // Should show alerts within 4-hour window (2 hours past, 2 hours future)
    const relevantAlerts = await service.getRelevantAlertsForTimeWindow(4 * 60 * 60 * 1000); // 4 hours in ms
    
    expect(relevantAlerts).toHaveLength(3); // current, upcoming, recent
    expect(relevantAlerts.map(a => a.id)).toContain('current-alert');
    expect(relevantAlerts.map(a => a.id)).toContain('upcoming-alert');
    expect(relevantAlerts.map(a => a.id)).toContain('recent-alert');
    expect(relevantAlerts.map(a => a.id)).not.toContain('old-alert');
  });

  test('shouldPrioritizeStationSkippingAlertsInTimeFiltering', async () => {
    // Red: Test that station-skipping alerts get priority even if they're outside normal time windows
    
    const now = new Date();
    
    // Mock a station-skipping alert that's far in the future
    const futureStationSkippingAlert = {
      id: 'future-station-skipping',
      headerText: 'F train skips Carroll St next week',
      descriptionText: 'F trains will skip Carroll St',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [{ routeId: 'F', stopId: 'F20' }],
      activePeriod: {
        start: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000) // 1 hour later
      }
    };

    // Mock a regular alert that's within normal time window
    const regularAlert = {
      id: 'regular-alert',
      headerText: 'F train delays',
      descriptionText: 'F trains are delayed',
      affectedRoutes: ['F'],
      severity: 'warning' as const,
      informedEntities: [{ routeId: 'F' }],
      activePeriod: {
        start: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
      }
    };

    // Mock getServiceAlerts to return both alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue([futureStationSkippingAlert, regularAlert]);

    // Should show both alerts - station-skipping gets priority
    const prioritizedAlerts = await service.getPrioritizedAlertsForCommute(['F'], 0);
    
    expect(prioritizedAlerts).toHaveLength(2);
    expect(prioritizedAlerts[0].id).toBe('future-station-skipping'); // Station-skipping should be first
    expect(prioritizedAlerts[1].id).toBe('regular-alert');
  });

  test('shouldEnhanceActiveServiceAlertsWithTimeWindow', async () => {
    // Red: Test that getActiveServiceAlerts includes alerts within a reasonable time window
    
    const now = new Date();
    
    // Mock various alerts at different times
    const alerts = [
      {
        id: 'active-now',
        headerText: 'Active F train delay',
        descriptionText: 'F trains are delayed',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          end: new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
        }
      },
      {
        id: 'starts-soon',
        headerText: 'F train work starting soon',
        descriptionText: 'F trains will skip stations',
        affectedRoutes: ['F'],
        severity: 'severe' as const,
        informedEntities: [{ routeId: 'F' }],
        activePeriod: {
          start: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes from now
          end: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
        }
      }
    ];

    // Mock getServiceAlerts to return the alerts
    jest.spyOn(service, 'getServiceAlerts').mockResolvedValue(alerts);

    // Should show both alerts as "active" (current + starting soon)
    const activeAlerts = await service.getActiveServiceAlerts();
    
    expect(activeAlerts).toHaveLength(2);
    expect(activeAlerts.map(a => a.id)).toContain('active-now');
    expect(activeAlerts.map(a => a.id)).toContain('starts-soon');
  });
});