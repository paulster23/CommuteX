/**
 * Route Finder Service for NYC Subway
 * Uses Simple Transfer Hub Strategy (Approach 5)
 * Prioritizes user-specified hubs and efficient transfers
 */

import { SubwayStation, StationDatabase } from './StationDatabase';
import { TransferHubService, TransferHub } from './TransferHubService';
import { ConfigLoader } from './ConfigLoader';
import { StationDepartureService, TrainDeparture, DeparturesByLine } from './StationDepartureService';

export interface RouteStep {
  type: 'board' | 'transfer' | 'arrive';
  station: string;
  line: string;
  direction?: string;
  waitTimeMinutes?: number;
  transferTimeMinutes?: number;
  instructions: string;
  nextDeparture?: Date;
  gtfsStationId?: string;
}

export interface SubwayRoute {
  steps: RouteStep[];
  totalTimeMinutes: number;
  transferCount: number;
  isDirect: boolean;
  confidence: number; // 0-100, higher = more reliable
  lines: string[];
  estimatedArrivalTime?: Date;
  isRealTimeData?: boolean;
}

export interface RouteRequest {
  fromStation: string;
  toStation: string;
  departureTime?: Date;
  maxTransfers?: number;
  preferredLines?: string[];
  fallbackToEstimated?: boolean;
}

export class RouteFinderService {
  private static initialized = false;

  /**
   * Initialize the route finder service
   */
  static initialize(): void {
    if (this.initialized) return;
    
    TransferHubService.initialize();
    this.initialized = true;
  }

  /**
   * Find routes between two stations using transfer hub strategy
   */
  static findRoutes(request: RouteRequest): SubwayRoute[] {
    this.initialize();

    const fromStations = this.findStationsByName(request.fromStation);
    const toStations = this.findStationsByName(request.toStation);

    console.log('[RouteFinderService] Station lookup:', {
      requestFrom: request.fromStation,
      requestTo: request.toStation,
      foundFromStations: fromStations.map(s => `${s.name} (${s.lines.join(',')})`),
      foundToStations: toStations.map(s => `${s.name} (${s.lines.join(',')})`)
    });

    if (fromStations.length === 0 || toStations.length === 0) {
      console.warn('[RouteFinderService] No stations found for request');
      return [];
    }

    const routes: SubwayRoute[] = [];

    // Find direct routes first
    const directRoutes = this.findDirectRoutes(fromStations, toStations, request);
    routes.push(...directRoutes);

    // Find single-transfer routes if needed
    if (routes.length === 0 || request.maxTransfers === undefined || request.maxTransfers > 0) {
      const transferRoutes = this.findTransferRoutes(fromStations, toStations, request);
      routes.push(...transferRoutes);
    }

    console.log('[RouteFinderService] Generated routes:', routes.map(r => ({
      lines: r.lines,
      isDirect: r.isDirect,
      transfers: r.transferCount,
      totalTime: r.totalTimeMinutes,
      steps: r.steps.map(s => `${s.type}:${s.station}:${s.line}`)
    })));

    // Sort routes by efficiency (total time, then transfer count)
    return routes
      .sort((a, b) => {
        if (a.totalTimeMinutes !== b.totalTimeMinutes) {
          return a.totalTimeMinutes - b.totalTimeMinutes;
        }
        return a.transferCount - b.transferCount;
      })
      .slice(0, 5); // Return top 5 routes
  }

  /**
   * Find direct routes (no transfers) between stations
   */
  private static findDirectRoutes(
    fromStations: SubwayStation[],
    toStations: SubwayStation[],
    request: RouteRequest
  ): SubwayRoute[] {
    const routes: SubwayRoute[] = [];

    for (const fromStation of fromStations) {
      for (const toStation of toStations) {
        // Find common lines between stations
        const commonLines = fromStation.lines.filter(line => 
          toStation.lines.includes(line)
        );

        for (const line of commonLines) {
          const route = this.createDirectRoute(fromStation, toStation, line, request);
          if (route) {
            routes.push(route);
          }
        }
      }
    }

    return routes;
  }

  /**
   * Find single-transfer routes using transfer hubs
   */
  private static findTransferRoutes(
    fromStations: SubwayStation[],
    toStations: SubwayStation[],
    request: RouteRequest
  ): SubwayRoute[] {
    const routes: SubwayRoute[] = [];

    // Get all lines from origin and destination
    const fromLines = [...new Set(fromStations.flatMap(s => s.lines))];
    const toLines = [...new Set(toStations.flatMap(s => s.lines))];

    // Find connecting hubs
    for (const fromLine of fromLines) {
      for (const toLine of toLines) {
        if (fromLine === toLine) continue; // Skip if same line (direct route)

        const connectingHubs = TransferHubService.getConnectingHubs(fromLine, toLine);
        
        for (const hub of connectingHubs.slice(0, 3)) { // Try top 3 hubs
          const route = this.createTransferRoute(
            fromStations, toStations, hub, fromLine, toLine, request
          );
          if (route) {
            routes.push(route);
          }
        }
      }
    }

    return routes;
  }

  /**
   * Create a direct route between two stations
   */
  private static createDirectRoute(
    fromStation: SubwayStation,
    toStation: SubwayStation,
    line: string,
    request: RouteRequest
  ): SubwayRoute | null {
    // Estimate travel time based on distance and line characteristics
    const travelTime = this.estimateTravelTime(fromStation, toStation, line);
    const waitTime = this.estimateWaitTime(line);

    const steps: RouteStep[] = [
      {
        type: 'board',
        station: fromStation.name,
        line,
        waitTimeMinutes: waitTime,
        instructions: `Board the ${line} train at ${fromStation.name}`
      },
      {
        type: 'arrive',
        station: toStation.name,
        line,
        instructions: `Arrive at ${toStation.name}`
      }
    ];

    return {
      steps,
      totalTimeMinutes: waitTime + travelTime,
      transferCount: 0,
      isDirect: true,
      confidence: 90, // High confidence for direct routes
      lines: [line],
      estimatedArrivalTime: request.departureTime ? 
        new Date(request.departureTime.getTime() + (waitTime + travelTime) * 60000) : 
        undefined
    };
  }

  /**
   * Create a transfer route using a hub
   */
  private static createTransferRoute(
    fromStations: SubwayStation[],
    toStations: SubwayStation[],
    hub: TransferHub,
    fromLine: string,
    toLine: string,
    request: RouteRequest
  ): SubwayRoute | null {
    // Find best origin station for the first line
    const bestFromStation = fromStations.find(s => s.lines.includes(fromLine));
    const bestToStation = toStations.find(s => s.lines.includes(toLine));

    if (!bestFromStation || !bestToStation) {
      return null;
    }

    // Calculate travel times
    const firstLegTime = this.estimateTravelTime(bestFromStation, {
      name: hub.name,
      lat: hub.coordinates.lat,
      lng: hub.coordinates.lng
    } as SubwayStation, fromLine);

    const secondLegTime = this.estimateTravelTime({
      name: hub.name,
      lat: hub.coordinates.lat,
      lng: hub.coordinates.lng
    } as SubwayStation, bestToStation, toLine);

    const initialWaitTime = this.estimateWaitTime(fromLine);
    const transferTime = TransferHubService.getTransferTime(hub.name, fromLine, toLine);
    const transferWaitTime = this.estimateWaitTime(toLine);

    const steps: RouteStep[] = [
      {
        type: 'board',
        station: bestFromStation.name,
        line: fromLine,
        waitTimeMinutes: initialWaitTime,
        instructions: `Board the ${fromLine} train at ${bestFromStation.name}`
      },
      {
        type: 'transfer',
        station: hub.name,
        line: toLine,
        transferTimeMinutes: transferTime,
        waitTimeMinutes: transferWaitTime,
        instructions: `Transfer to the ${toLine} train at ${hub.name}${transferTime === 0 ? ' (same platform)' : ''}`
      },
      {
        type: 'arrive',
        station: bestToStation.name,
        line: toLine,
        instructions: `Arrive at ${bestToStation.name}`
      }
    ];

    const totalTime = initialWaitTime + firstLegTime + transferTime + transferWaitTime + secondLegTime;

    // Calculate confidence based on hub reliability and user preference
    let confidence = 70; // Base confidence for transfer routes
    if (hub.isUserPriority) confidence += 15;
    if (transferTime === 0) confidence += 10; // Same platform bonus
    if (hub.priority >= 8) confidence += 5; // Major hub bonus

    return {
      steps,
      totalTimeMinutes: totalTime,
      transferCount: 1,
      isDirect: false,
      confidence: Math.min(confidence, 95), // Cap at 95%
      lines: [fromLine, toLine],
      estimatedArrivalTime: request.departureTime ? 
        new Date(request.departureTime.getTime() + totalTime * 60000) : 
        undefined
    };
  }

  /**
   * Find stations by name (handles variations)
   */
  private static findStationsByName(stationName: string): SubwayStation[] {
    const allStations = StationDatabase.getAllStations();
    
    // Exact match first
    let matches = allStations.filter(station => 
      station.name.toLowerCase() === stationName.toLowerCase()
    );

    // If no exact match, try partial matches
    if (matches.length === 0) {
      const normalizedQuery = stationName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      matches = allStations.filter(station => {
        const normalizedName = station.name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
      });
    }

    return matches;
  }

  /**
   * Estimate travel time between two points
   */
  private static estimateTravelTime(
    from: Pick<SubwayStation, 'lat' | 'lng'>,
    to: Pick<SubwayStation, 'lat' | 'lng'>,
    line: string
  ): number {
    // Calculate distance using haversine formula
    const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
    
    // Get line-specific speed from config
    const transitTime = ConfigLoader.getRouteTransitTime(line);
    
    // Estimate: roughly 1 minute per 0.5 miles for subway
    const baseTime = Math.max(1, Math.round(distance * 2));
    
    // Apply line-specific multiplier
    return Math.round(baseTime * (transitTime / ConfigLoader.getTransitConfig().defaultTransitTime));
  }

  /**
   * Estimate wait time for a train line
   */
  private static estimateWaitTime(line: string): number {
    const frequency = ConfigLoader.getTrainFrequency(line);
    const waitRange = ConfigLoader.getWaitTimeRange();
    
    // Average wait time is half the frequency, plus some randomness
    const baseWait = Math.max(1, Math.round(frequency / 2));
    const randomComponent = Math.round(Math.random() * waitRange.maxAdditionalMinutes);
    
    return Math.max(waitRange.minMinutes, baseWait + randomComponent);
  }

  /**
   * Calculate distance between two points using haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Find routes with real-time GTFS departure data
   */
  static async findRoutesWithRealTimeData(request: RouteRequest): Promise<SubwayRoute[]> {
    // First get the basic routes using the existing algorithm
    const basicRoutes = this.findRoutes(request);
    
    if (basicRoutes.length === 0) {
      return [];
    }

    try {
      // Enhance each route with real-time data
      const enhancedRoutes = await Promise.all(
        basicRoutes.map(route => this.enhanceRouteWithRealTimeData(route, request))
      );

      // Filter out routes that couldn't be enhanced and sort by efficiency
      const validRoutes = enhancedRoutes.filter(route => route !== null) as SubwayRoute[];
      return validRoutes.sort((a, b) => {
        if (a.totalTimeMinutes !== b.totalTimeMinutes) {
          return a.totalTimeMinutes - b.totalTimeMinutes;
        }
        return a.transferCount - b.transferCount;
      });

    } catch (error) {
      console.warn('[RouteFinderService] Real-time data unavailable, falling back to estimated times:', error);
      
      if (request.fallbackToEstimated) {
        return basicRoutes.map(route => ({
          ...route,
          isRealTimeData: false
        }));
      }
      
      return [];
    }
  }

  /**
   * Enhance a single route with real-time departure data
   */
  private static async enhanceRouteWithRealTimeData(
    route: SubwayRoute, 
    request: RouteRequest
  ): Promise<SubwayRoute | null> {
    try {
      const enhancedSteps: RouteStep[] = [];
      let totalTimeMinutes = 0;
      let currentTime = request.departureTime || new Date();

      for (let i = 0; i < route.steps.length; i++) {
        const step = route.steps[i];
        const enhancedStep = { ...step };

        if (step.type === 'board' || step.type === 'transfer') {
          // Get real-time departures for this station and line
          const realTimeDepartures = await this.getRealTimeDepartures(
            step.station, 
            step.line,
            currentTime
          );

          if (realTimeDepartures.length > 0) {
            const nextDeparture = realTimeDepartures[0];
            enhancedStep.nextDeparture = nextDeparture.departureTime;
            
            // Calculate actual wait time based on real departure
            const waitTime = Math.max(0, Math.ceil(
              (nextDeparture.departureTime.getTime() - currentTime.getTime()) / (1000 * 60)
            ));
            
            enhancedStep.waitTimeMinutes = waitTime;
            totalTimeMinutes += waitTime;
            
            // Update current time to departure time
            currentTime = new Date(nextDeparture.departureTime);
          } else {
            // Fallback to estimated wait time
            enhancedStep.waitTimeMinutes = step.waitTimeMinutes || this.estimateWaitTime(step.line);
            totalTimeMinutes += enhancedStep.waitTimeMinutes!;
          }

          // Add transfer time if applicable
          if (step.transferTimeMinutes) {
            totalTimeMinutes += step.transferTimeMinutes;
            currentTime = new Date(currentTime.getTime() + step.transferTimeMinutes * 60000);
          }
        }

        // Add travel time for the leg after boarding/transferring
        if (i < route.steps.length - 1) {
          const nextStep = route.steps[i + 1];
          const travelTime = this.estimateTravelTimeBetweenSteps(step, nextStep);
          totalTimeMinutes += travelTime;
          currentTime = new Date(currentTime.getTime() + travelTime * 60000);
        }

        enhancedSteps.push(enhancedStep);
      }

      return {
        ...route,
        steps: enhancedSteps,
        totalTimeMinutes,
        estimatedArrivalTime: currentTime,
        isRealTimeData: true
      };

    } catch (error) {
      console.warn(`[RouteFinderService] Could not enhance route with real-time data:`, error);
      return null;
    }
  }

  /**
   * Get real-time departures for a station and line
   */
  private static async getRealTimeDepartures(
    stationName: string, 
    line: string,
    fromTime: Date
  ): Promise<TrainDeparture[]> {
    try {
      // Find the station in the database
      const stations = this.findStationsByName(stationName);
      const station = stations.find(s => s.lines.includes(line));
      
      if (!station) {
        throw new Error(`Station ${stationName} not found for line ${line}`);
      }

      // For now, use northbound direction as default
      // TODO: Implement proper direction detection based on route
      const direction = 'northbound';
      
      // Fetch real-time departures - pass the station object, not the name
      const departuresByLine = await StationDepartureService.getDeparturesForStation(
        station,
        direction
      );

      // Extract departures for the specific line
      const departures = departuresByLine[line] || [];

      // Filter departures after the current time and sort
      return departures
        .filter(dep => dep.departureTime >= fromTime)
        .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
        .slice(0, 3); // Next 3 departures

    } catch (error) {
      console.warn(`[RouteFinderService] Error fetching real-time data for ${stationName} ${line}:`, error);
      return [];
    }
  }

  /**
   * Estimate travel time between two route steps
   */
  private static estimateTravelTimeBetweenSteps(fromStep: RouteStep, toStep: RouteStep): number {
    // Find stations for the steps
    const fromStations = this.findStationsByName(fromStep.station);
    const toStations = this.findStationsByName(toStep.station);
    
    if (fromStations.length === 0 || toStations.length === 0) {
      return 5; // Default fallback
    }

    const fromStation = fromStations[0];
    const toStation = toStations[0];
    
    return this.estimateTravelTime(fromStation, toStation, fromStep.line);
  }
}