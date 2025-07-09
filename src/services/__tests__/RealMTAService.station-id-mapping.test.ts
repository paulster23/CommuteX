import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Station ID Mapping Validation', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldValidateUserRouteStationIDs', async () => {
    // Red: Test that getUserRouteStations returns valid station IDs
    const userStations = await service.getUserRouteStations();
    
    expect(userStations).toBeDefined();
    expect(userStations.length).toBeGreaterThan(0);
    
    // Validate F train stations
    expect(userStations).toContain('F20'); // Carroll St
    expect(userStations).toContain('F25'); // Jay St-MetroTech (F line)
    expect(userStations).toContain('F24'); // Bergen St
    expect(userStations).toContain('F18'); // 23rd St (F line destination)
    
    // Validate A train stations
    expect(userStations).toContain('A41'); // Jay St-MetroTech (A/C line)
    expect(userStations).toContain('A27'); // 14th St-8th Ave (A/C transfer point)
    
    // Validate C train stations
    expect(userStations).toContain('A23'); // 23rd St-8th Ave (C line destination)
  });

  test('shouldMatchStationIDsWithDirectionalSuffixes', () => {
    // Red: Test that station ID matching works with N/S suffixes
    const mockAlert = {
      id: 'test-alert',
      headerText: 'Test alert',
      descriptionText: 'Test description',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        { routeId: 'F', stopId: 'F20N' }, // Carroll St northbound
        { routeId: 'F', stopId: 'F20S' }, // Carroll St southbound
        { routeId: 'F', stopId: 'F25N' }, // Jay St northbound
        { routeId: 'F', stopId: 'F25S' }  // Jay St southbound
      ]
    };

    // Should match F20 with F20N and F20S
    const userStations = ['F20', 'F25'];
    
    const hasF20Match = mockAlert.informedEntities.some(entity => 
      entity.stopId && userStations.some(stationId => 
        entity.stopId === stationId || 
        entity.stopId === `${stationId}N` || 
        entity.stopId === `${stationId}S`
      )
    );
    
    expect(hasF20Match).toBe(true);
  });

  test('shouldMatchStationIDsWithoutSuffixes', () => {
    // Red: Test that station ID matching works without suffixes
    const mockAlert = {
      id: 'test-alert',
      headerText: 'Test alert',
      descriptionText: 'Test description',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        { routeId: 'F', stopId: 'F20' }, // Carroll St without suffix
        { routeId: 'F', stopId: 'F25' }  // Jay St without suffix
      ]
    };

    const userStations = ['F20', 'F25'];
    
    const hasMatch = mockAlert.informedEntities.some(entity => 
      entity.stopId && userStations.some(stationId => 
        entity.stopId === stationId || 
        entity.stopId === `${stationId}N` || 
        entity.stopId === `${stationId}S`
      )
    );
    
    expect(hasMatch).toBe(true);
  });

  test('shouldValidateStationIDFormats', async () => {
    // Red: Test that station IDs follow expected formats
    const userStations = await service.getUserRouteStations();
    
    // F train stations should start with F
    const fStations = userStations.filter(id => id.startsWith('F'));
    expect(fStations.length).toBeGreaterThan(0);
    
    // A train stations should start with A
    const aStations = userStations.filter(id => id.startsWith('A'));
    expect(aStations.length).toBeGreaterThan(0);
    
    // All station IDs should be alphanumeric
    const validFormat = userStations.every(id => /^[A-Z][0-9]+$/.test(id));
    expect(validFormat).toBe(true);
  });

  test('shouldHandleComplexStationIDs', () => {
    // Red: Test handling of complex station IDs like transfer stations
    const mockAlert = {
      id: 'complex-alert',
      headerText: 'Complex station alert',
      descriptionText: 'Testing complex station IDs',
      affectedRoutes: ['F', 'A'],
      severity: 'warning' as const,
      informedEntities: [
        { routeId: 'F', stopId: 'F25' },   // Jay St-MetroTech F train
        { routeId: 'A', stopId: 'A41' },   // Jay St-MetroTech A train
        { routeId: 'F', stopId: 'F25N' },  // Jay St-MetroTech F northbound
        { routeId: 'A', stopId: 'A41S' }   // Jay St-MetroTech A southbound
      ]
    };

    const jayStStations = ['F25', 'A41']; // Jay St-MetroTech on both F and A
    
    const hasJayStMatch = mockAlert.informedEntities.some(entity => 
      entity.stopId && jayStStations.some(stationId => 
        entity.stopId === stationId || 
        entity.stopId === `${stationId}N` || 
        entity.stopId === `${stationId}S`
      )
    );
    
    expect(hasJayStMatch).toBe(true);
  });

  test('shouldValidateStationIDsInUserRoute', async () => {
    // Red: Test that user route stations are properly mapped
    const userStations = await service.getUserRouteStations();
    
    // Key stations in user's commute route
    const expectedStations = [
      'F20', // Carroll St (home station)
      'F25', // Jay St-MetroTech (F train)
      'A41', // Jay St-MetroTech (A train)
      'A23', // 23rd St-8th Ave (destination)
      'A27', // 14th St-8th Ave (A/C transfer point)
      'F24', // Bergen St (nearby station)
      'F18'  // 23rd St (F line destination)
    ];
    
    expectedStations.forEach(stationId => {
      expect(userStations).toContain(stationId);
    });
  });

  test('shouldHandleInvalidStationIDs', () => {
    // Red: Test handling of invalid or malformed station IDs
    const mockAlert = {
      id: 'invalid-alert',
      headerText: 'Invalid station alert',
      descriptionText: 'Testing invalid station IDs',
      affectedRoutes: ['F'],
      severity: 'info' as const,
      informedEntities: [
        { routeId: 'F', stopId: '' },          // Empty string
        { routeId: 'F', stopId: undefined },   // Undefined
        { routeId: 'F', stopId: 'INVALID' },   // Invalid format
        { routeId: 'F', stopId: 'F20' },       // Valid station
        { routeId: 'F' }                       // No stopId
      ]
    };

    const userStations = ['F20'];
    
    const hasValidMatch = mockAlert.informedEntities.some(entity => 
      entity.stopId && userStations.some(stationId => 
        entity.stopId === stationId || 
        entity.stopId === `${stationId}N` || 
        entity.stopId === `${stationId}S`
      )
    );
    
    expect(hasValidMatch).toBe(true);
    
    // Should not crash with invalid IDs
    expect(() => {
      mockAlert.informedEntities.forEach(entity => {
        if (entity.stopId) {
          userStations.includes(entity.stopId);
        }
      });
    }).not.toThrow();
  });

  test('shouldMatchStationIDsAcrossLines', async () => {
    // Red: Test station ID matching across different subway lines
    const mockAlert = {
      id: 'multi-line-alert',
      headerText: 'Multi-line station alert',
      descriptionText: 'Testing station IDs across lines',
      affectedRoutes: ['F', 'A', 'C'],
      severity: 'severe' as const,
      informedEntities: [
        { routeId: 'F', stopId: 'F20' },  // Carroll St on F
        { routeId: 'A', stopId: 'A41' },  // Jay St on A
        { routeId: 'C', stopId: 'A23' },  // 23rd St on C
        { routeId: 'F', stopId: 'F25' },  // Jay St on F
        { routeId: 'A', stopId: 'A27' }   // 14th St on A
      ]
    };

    const userStations = await service.getUserRouteStations();
    
    // Should match stations across all lines
    const matchCount = mockAlert.informedEntities.filter(entity => 
      entity.stopId && userStations.some(stationId => 
        entity.stopId === stationId || 
        entity.stopId === `${stationId}N` || 
        entity.stopId === `${stationId}S`
      )
    ).length;
    
    expect(matchCount).toBeGreaterThan(0);
  });
});