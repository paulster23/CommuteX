import { ScheduleValidationService } from '../ScheduleValidationService';
import { StationDepartureService } from '../StationDepartureService';

// Mock dependencies
jest.mock('../StationDepartureService');

describe('ScheduleValidationService', () => {
  const mockConsolidatedStation = {
    name: 'Carroll St',
    lines: ['F', 'G'],
    lat: 40.679371,
    lng: -73.995458,
    distance: 0.05,
    stationIds: {
      'F': 'F20',
      'G': 'G22'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shouldValidateStationScheduleAgainstSubwayStats', async () => {
    // Red: Test that validates our app's departure times against subwaystats.com
    
    // Mock our app's departure data
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        },
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:12:00'),
          relativeTime: '12'
        }
      ]
    };

    // Mock StationDepartureService to return our app's data
    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock subwaystats.com data (what the validation service should fetch)
    const mockSubwayStatsData = {
      'F': [
        {
          arrivalTime: '10:06:00', // 1 minute difference - should be within tolerance
          direction: 'southbound'
        },
        {
          arrivalTime: '10:13:00', // 1 minute difference - should be within tolerance
          direction: 'southbound'
        }
      ]
    };

    // Mock the fetch to subwaystats.com
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSubwayStatsData))
    });

    // Test validation
    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should return validation results
    expect(validationResult).toBeDefined();
    expect(validationResult.stationName).toBe('Carroll St');
    expect(validationResult.direction).toBe('southbound');
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.discrepancies).toHaveLength(0); // No discrepancies within tolerance
    expect(validationResult.validatedAt).toBeInstanceOf(Date);
    
    // Should have compared both F trains
    expect(validationResult.comparedTrains).toBe(2);
    
    // Should have fetched data from subwaystats.com
    expect(global.fetch).toHaveBeenCalledWith(
      'https://subwaystats.com/api/station/carroll-st?format=json'
    );
  });

  test('shouldDetectScheduleDiscrepancies', async () => {
    // Red: Test that detects when our app's schedule differs significantly from subwaystats.com
    
    // Mock our app's departure data
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        }
      ]
    };

    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock subwaystats.com data with significant difference
    const mockSubwayStatsData = {
      'F': [
        {
          arrivalTime: '10:12:00', // 7 minute difference - should exceed tolerance
          direction: 'southbound'
        }
      ]
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSubwayStatsData))
    });

    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should detect discrepancy
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.discrepancies).toHaveLength(1);
    expect(validationResult.discrepancies[0]).toEqual({
      line: 'F',
      appTime: '10:05:00',
      subwayStatsTime: '10:12:00',
      differenceMinutes: 7
    });
  });

  test('shouldHandleSubwayStatsApiFailure', async () => {
    // Red: Test graceful handling when subwaystats.com API is unavailable
    
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        }
      ]
    };

    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock API failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should handle failure gracefully
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.error).toBe('Failed to fetch subwaystats.com data: Network error');
    expect(validationResult.comparedTrains).toBe(0);
  });

  test('shouldRespectTimingToleranceThreshold', async () => {
    // Red: Test that timing tolerance is applied correctly (3 minutes tolerance)
    
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        },
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:15:00'),
          relativeTime: '15'
        }
      ]
    };

    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock subwaystats.com with trains within and outside tolerance
    const mockSubwayStatsData = {
      'F': [
        {
          arrivalTime: '10:07:00', // 2 minute difference - within 3 minute tolerance
          direction: 'southbound'
        },
        {
          arrivalTime: '10:20:00', // 5 minute difference - exceeds 3 minute tolerance
          direction: 'southbound'
        }
      ]
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSubwayStatsData))
    });

    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should detect only one discrepancy (the 5 minute difference)
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.discrepancies).toHaveLength(1);
    expect(validationResult.discrepancies[0].differenceMinutes).toBe(5);
    expect(validationResult.comparedTrains).toBe(2);
  });

  test('shouldHandleDirectionFilteringCorrectly', async () => {
    // Red: Test that only trains in the requested direction are compared
    
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        }
      ]
    };

    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock subwaystats.com with both directions, but we're requesting southbound
    const mockSubwayStatsData = {
      'F': [
        {
          arrivalTime: '10:03:00', // Northbound train - should be ignored
          direction: 'northbound'
        },
        {
          arrivalTime: '10:06:00', // Southbound train - should be compared
          direction: 'southbound'
        },
        {
          arrivalTime: '10:08:00', // Another northbound - should be ignored
          direction: 'northbound'
        }
      ]
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSubwayStatsData))
    });

    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should only compare the one southbound train
    expect(validationResult.comparedTrains).toBe(1);
    expect(validationResult.isValid).toBe(true); // 1 minute difference is within tolerance
  });

  test('shouldHandleMissingLineDataGracefully', async () => {
    // Red: Test when subwaystats.com doesn't have data for a line our app has
    
    const mockAppDepartures = {
      'F': [
        {
          line: 'F',
          departureTime: new Date('2024-01-01T10:05:00'),
          relativeTime: '5'
        }
      ],
      'G': [
        {
          line: 'G',
          departureTime: new Date('2024-01-01T10:07:00'),
          relativeTime: '7'
        }
      ]
    };

    (StationDepartureService.getDeparturesForConsolidatedStation as jest.Mock)
      .mockResolvedValue(mockAppDepartures);

    // Mock subwaystats.com with only F line data (missing G line)
    const mockSubwayStatsData = {
      'F': [
        {
          arrivalTime: '10:06:00',
          direction: 'southbound'
        }
      ]
      // No G line data
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSubwayStatsData))
    });

    const validationResult = await ScheduleValidationService.validateStation(
      mockConsolidatedStation,
      'southbound'
    );

    // Should only compare F line (G line should be skipped gracefully)
    expect(validationResult.comparedTrains).toBe(1);
    expect(validationResult.isValid).toBe(true); // F line comparison passes
  });

  test('shouldRunPeriodicValidationForKeyStations', async () => {
    // Red: Test that periodic validation checks key stations (Carroll St, Jay St)
    
    // Mock successful validation results for different stations
    const validateStationSpy = jest.spyOn(ScheduleValidationService, 'validateStation')
      .mockImplementation(async (station, direction) => ({
        stationName: station.name,
        direction,
        isValid: true,
        discrepancies: [],
        validatedAt: new Date(),
        comparedTrains: 2
      }));

    const results = await ScheduleValidationService.runPeriodicValidation();

    // Should validate key stations in both directions
    expect(results).toHaveLength(4); // Carroll St N/S, Jay St N/S
    
    // Should include Carroll St validations
    expect(results.some(r => r.stationName === 'Carroll St' && r.direction === 'northbound')).toBe(true);
    expect(results.some(r => r.stationName === 'Carroll St' && r.direction === 'southbound')).toBe(true);
    
    // Should include Jay St validations  
    expect(results.some(r => r.stationName === 'Jay St-MetroTech' && r.direction === 'northbound')).toBe(true);
    expect(results.some(r => r.stationName === 'Jay St-MetroTech' && r.direction === 'southbound')).toBe(true);

    validateStationSpy.mockRestore();
  });

  test('shouldLogValidationResults', async () => {
    // Red: Test that validation results are logged for monitoring
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock validation with discrepancies
    const mockResults = [
      {
        stationName: 'Carroll St',
        direction: 'southbound' as const,
        isValid: false,
        discrepancies: [
          {
            line: 'F',
            appTime: '10:05:00',
            subwayStatsTime: '10:12:00',
            differenceMinutes: 7
          }
        ],
        validatedAt: new Date(),
        comparedTrains: 1
      }
    ];

    ScheduleValidationService.logValidationResults(mockResults);

    // Should log validation summary
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ScheduleValidation] Validation completed')
    );
    
    // Should log discrepancies
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ScheduleValidation] DISCREPANCY')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Carroll St southbound F line: 7 minute difference')
    );

    consoleSpy.mockRestore();
  });

  test('shouldSchedulePeriodicValidation', async () => {
    // Red: Test that validation can be scheduled to run every few hours
    
    jest.useFakeTimers();
    
    const runPeriodicValidationSpy = jest.spyOn(ScheduleValidationService, 'runPeriodicValidation')
      .mockResolvedValue([]);

    // Start periodic validation (every 3 hours = 10800000ms)
    ScheduleValidationService.startPeriodicValidation();

    // Should run immediately on start (called 1 time)
    expect(runPeriodicValidationSpy).toHaveBeenCalledTimes(1);

    // Fast-forward 3 hours
    jest.advanceTimersByTime(3 * 60 * 60 * 1000);

    // Should have called validation again (called 2 times total)
    expect(runPeriodicValidationSpy).toHaveBeenCalledTimes(2);

    // Fast-forward another 3 hours
    jest.advanceTimersByTime(3 * 60 * 60 * 1000);

    // Should have called validation again (called 3 times total)
    expect(runPeriodicValidationSpy).toHaveBeenCalledTimes(3);

    // Stop periodic validation
    ScheduleValidationService.stopPeriodicValidation();

    runPeriodicValidationSpy.mockRestore();
    jest.useRealTimers();
  });
});