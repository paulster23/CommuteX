import { ConsolidatedStationResult } from './NearestStationService';
import { StationDepartureService, DeparturesByLine } from './StationDepartureService';

export interface ValidationDiscrepancy {
  line: string;
  appTime: string;
  subwayStatsTime: string;
  differenceMinutes: number;
}

export interface ValidationResult {
  stationName: string;
  direction: 'northbound' | 'southbound';
  isValid: boolean;
  discrepancies: ValidationDiscrepancy[];
  validatedAt: Date;
  comparedTrains: number;
  error?: string;
}

export interface SubwayStatsTrainData {
  arrivalTime: string;
  direction: string;
}

export interface SubwayStatsData {
  [line: string]: SubwayStatsTrainData[];
}

export class ScheduleValidationService {
  private static readonly TOLERANCE_MINUTES = 3; // Allow 3 minute difference
  private static validationInterval: NodeJS.Timeout | null = null;
  
  static async validateStation(
    station: ConsolidatedStationResult,
    direction: 'northbound' | 'southbound'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      stationName: station.name,
      direction,
      isValid: true,
      discrepancies: [],
      validatedAt: new Date(),
      comparedTrains: 0
    };

    try {
      // Get our app's departure data
      const appDepartures = await StationDepartureService.getDeparturesForConsolidatedStation(
        station,
        direction
      );

      // Get subwaystats.com data
      const subwayStatsData = await this.fetchSubwayStatsData(station.name);

      // Compare schedules
      result.comparedTrains = this.compareSchedules(appDepartures, subwayStatsData, direction, result);
      
      // Validation is invalid if there are discrepancies
      result.isValid = result.discrepancies.length === 0;

    } catch (error) {
      result.isValid = false;
      result.error = `Failed to fetch subwaystats.com data: ${error.message}`;
      result.comparedTrains = 0;
    }

    return result;
  }

  private static async fetchSubwayStatsData(stationName: string): Promise<SubwayStatsData> {
    // Convert station name to subwaystats.com format
    const urlStationName = stationName.toLowerCase().replace(/\s+/g, '-');
    const url = `https://subwaystats.com/api/station/${urlStationName}?format=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    return JSON.parse(data);
  }

  private static compareSchedules(
    appDepartures: DeparturesByLine,
    subwayStatsData: SubwayStatsData,
    direction: 'northbound' | 'southbound',
    result: ValidationResult
  ): number {
    let comparedCount = 0;

    // Compare each line's departures
    for (const [line, departures] of Object.entries(appDepartures)) {
      if (!subwayStatsData[line]) continue;

      // Filter subwaystats data by direction
      const directionTrains = subwayStatsData[line].filter(
        train => train.direction === direction
      );

      // Compare first few trains (up to 3)
      const trainsToCompare = Math.min(departures.length, directionTrains.length, 3);
      
      for (let i = 0; i < trainsToCompare; i++) {
        const appTrain = departures[i];
        const subwayStatsTrain = directionTrains[i];

        // Convert times to comparable format
        const appTime = this.formatTime(appTrain.departureTime);
        const subwayStatsTime = subwayStatsTrain.arrivalTime;

        // Calculate difference in minutes
        const differenceMinutes = this.calculateTimeDifference(appTime, subwayStatsTime);

        // Check if within tolerance
        if (Math.abs(differenceMinutes) > this.TOLERANCE_MINUTES) {
          result.discrepancies.push({
            line,
            appTime,
            subwayStatsTime,
            differenceMinutes
          });
        }

        comparedCount++;
      }
    }

    return comparedCount;
  }

  private static formatTime(date: Date): string {
    return date.toTimeString().substring(0, 8); // HH:MM:SS format
  }

  private static calculateTimeDifference(time1: string, time2: string): number {
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);

    const minutes1 = h1 * 60 + m1 + s1 / 60;
    const minutes2 = h2 * 60 + m2 + s2 / 60;

    return minutes2 - minutes1;
  }

  static async runPeriodicValidation(): Promise<ValidationResult[]> {
    console.log('[ScheduleValidation] Starting periodic validation of key stations...');
    
    // Define key stations to validate
    const keyStations = [
      {
        name: 'Carroll St',
        lines: ['F', 'G'],
        lat: 40.679371,
        lng: -73.995458,
        distance: 0.05,
        stationIds: {
          'F': 'F20',
          'G': 'G22'
        }
      },
      {
        name: 'Jay St-MetroTech',
        lines: ['A', 'C', 'F', 'R'],
        lat: 40.692338,
        lng: -73.987342,
        distance: 0.1,
        stationIds: {
          'A': 'A41',
          'C': 'A41',
          'F': 'F25',
          'R': 'R29'
        }
      }
    ];

    const validationResults: ValidationResult[] = [];

    // Validate each station in both directions
    for (const station of keyStations) {
      for (const direction of ['northbound', 'southbound'] as const) {
        try {
          const result = await this.validateStation(station, direction);
          validationResults.push(result);
        } catch (error) {
          console.error(`[ScheduleValidation] Failed to validate ${station.name} ${direction}:`, error);
          // Continue with other validations even if one fails
        }
      }
    }

    // Log the results
    this.logValidationResults(validationResults);

    return validationResults;
  }

  static logValidationResults(results: ValidationResult[]): void {
    const totalStations = results.length;
    const validStations = results.filter(r => r.isValid).length;
    const invalidStations = totalStations - validStations;

    console.log(`[ScheduleValidation] Validation completed: ${validStations}/${totalStations} stations passed`);

    if (invalidStations > 0) {
      console.log(`[ScheduleValidation] ${invalidStations} stations have discrepancies:`);
      
      results.filter(r => !r.isValid).forEach(result => {
        if (result.error) {
          console.log(`[ScheduleValidation] ERROR ${result.stationName} ${result.direction}: ${result.error}`);
        } else {
          result.discrepancies.forEach(discrepancy => {
            console.log(`[ScheduleValidation] DISCREPANCY ${result.stationName} ${result.direction} ${discrepancy.line} line: ${Math.abs(discrepancy.differenceMinutes)} minute difference`);
          });
        }
      });
    } else {
      console.log('[ScheduleValidation] All station schedules are accurate!');
    }
  }

  static startPeriodicValidation(): void {
    // Stop any existing validation
    this.stopPeriodicValidation();

    console.log('[ScheduleValidation] Starting periodic validation (every 3 hours)');
    
    // Run validation every 3 hours (10800000ms)
    this.validationInterval = setInterval(async () => {
      try {
        await this.runPeriodicValidation();
      } catch (error) {
        console.error('[ScheduleValidation] Periodic validation failed:', error);
      }
    }, 3 * 60 * 60 * 1000);

    // Run first validation immediately
    this.runPeriodicValidation().catch(error => {
      console.error('[ScheduleValidation] Initial validation failed:', error);
    });
  }

  static stopPeriodicValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
      console.log('[ScheduleValidation] Stopped periodic validation');
    }
  }
}