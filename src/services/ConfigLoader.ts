/**
 * Configuration loader for transit and station mapping data
 * Following CLAUDE.md principles - separating data from logic
 */

import transitConfig from '../../config/transit-config.json';
import stationMappingsConfig from '../../config/station-mappings.json';

export interface TransitConfig {
  trainFrequencies: { [key: string]: number };
  defaultFrequency: number;
  routeTransitTimes: { [key: string]: number };
  defaultTransitTime: number;
  walkingSpeed: {
    milesPerHour: number;
    minutesPerMile: number;
  };
  waitTimeRange: {
    minMinutes: number;
    maxAdditionalMinutes: number;
  };
  minimumRealisticTransitTime: number;
}

export interface StationMappingsConfig {
  workDestination: {
    address: string;
    description: string;
  };
  directRoutes: { [key: string]: any };
  transferRoutes: { [key: string]: any };
  defaultMapping: any;
}

export class ConfigLoader {
  private static transitConfigCache: TransitConfig | null = null;
  private static stationMappingsCache: StationMappingsConfig | null = null;

  static getTransitConfig(): TransitConfig {
    if (!this.transitConfigCache) {
      this.transitConfigCache = transitConfig as TransitConfig;
    }
    return this.transitConfigCache;
  }

  static getStationMappingsConfig(): StationMappingsConfig {
    if (!this.stationMappingsCache) {
      this.stationMappingsCache = stationMappingsConfig as StationMappingsConfig;
    }
    return this.stationMappingsCache;
  }

  // Helper methods for common config access patterns
  static getTrainFrequency(routeId: string): number {
    const config = this.getTransitConfig();
    return config.trainFrequencies[routeId] || config.defaultFrequency;
  }

  static getRouteTransitTime(routeId: string): number {
    const config = this.getTransitConfig();
    return config.routeTransitTimes[routeId] || config.defaultTransitTime;
  }

  static getWalkingMinutesPerMile(): number {
    return this.getTransitConfig().walkingSpeed.minutesPerMile;
  }

  static getMinimumRealisticTransitTime(): number {
    return this.getTransitConfig().minimumRealisticTransitTime;
  }

  static getWaitTimeRange(): { minMinutes: number; maxAdditionalMinutes: number } {
    return this.getTransitConfig().waitTimeRange;
  }
}