import { StaticLocationProvider, LocationProvider } from './LocationService';
import { StationMappingService } from './StationMappingService';
import { CacheManager } from './CacheManager';
import { StationDatabase } from './StationDatabase';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export type DataSourceType = 'realtime' | 'estimate' | 'fixed';

export interface RouteConfig {
  direction: 'northbound' | 'southbound';
  startStation: string;
  endStation: string;
  line: string;
  getWalkingToStation: () => Promise<number>;
  getWalkingFromStation: () => Promise<number>;
  transitTime: number;
}

export interface RouteSegment {
  line: string;
  direction: 'northbound' | 'southbound';
  fromStation: string;
  toStation: string;
  feedUrl: string;
  startStopId: string;
  endStopId: string;
}

export interface TransferStation {
  name: string;
  transferTime: number; // 0 for Jay St MetroTech
  fromLine: string;
  toLine: string;
  fromStopId: string;
  toStopId: string;
}

export interface TransferRouteConfig {
  segments: RouteSegment[];
  transferStations: TransferStation[];
  getWalkingToStation: () => Promise<number>;
  getWalkingFromStation: () => Promise<number>;
}

export interface RouteStep {
  type: 'walk' | 'wait' | 'transit' | 'transfer';
  description: string;
  duration: number; // in minutes
  dataSource: DataSourceType;
  line?: string; // for transit steps
  fromStation?: string;
  toStation?: string;
  transferTime?: number; // for transfer steps (0 for Jay St MetroTech)
  transferStation?: string; // transfer station name
  nextLine?: string; // line to transfer to
}

export interface InformedEntity {
  agencyId?: string;
  routeId?: string;
  routeType?: number;
  directionId?: number; // 0 = outbound, 1 = inbound
  stopId?: string;
  tripId?: string;
}

export interface ServiceAlert {
  id: string;
  headerText: string;
  descriptionText: string;
  affectedRoutes: string[];
  severity: 'info' | 'warning' | 'severe';
  informedEntities: InformedEntity[];
  activePeriod?: {
    start?: Date;
    end?: Date;
  };
}

export interface Route {
  id: number;
  arrivalTime: string;
  duration: string;
  method: string;
  details: string;
  transfers: number; // Always 0 for F-train direct
  walkingDistance?: string;
  walkingToTransit: number;
  isRealTimeData: boolean;
  confidence: 'high' | 'medium' | 'low';
  startingStation: string; // Always "Carroll St"
  endingStation: string; // Always "23rd St"
  waitTime: number; // minutes to wait at Carroll St for next F train
  nextTrainDeparture: string; // time of next F train departure from Carroll St
  finalWalkingTime: number; // Always 8 minutes to destination
  transitTime: number; // F train travel time from Carroll St to 23rd St
  steps: RouteStep[];
  hasServiceAlerts?: boolean; // Whether this route is affected by service alerts
  alertSeverity?: 'info' | 'warning' | 'severe'; // Highest severity alert affecting this route
}

export interface GTFSData {
  routes: Route[];
  lastUpdated: Date;
  isRealData: boolean;
}

interface StopTimeUpdate {
  stopId: string;
  stopSequence: number;
  arrivalTime?: number;
  departureTime?: number;
  delay?: number;
}

export class RealMTAService {
  private readonly locationProvider: LocationProvider;
  private readonly cacheManager: CacheManager;
  private readonly stationMapping: StationMappingService;
  
  // GTFS-RT feed URLs
  private readonly F_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm';
  private readonly ACE_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace';
  private readonly ALERTS_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts';
  private readonly ALERTS_FEED_URL_FALLBACK = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-alerts';
  
  // Dynamic station ID getters using StationDatabase
  // Updated to use correct station IDs from the new comprehensive 472-station database
  public getCarrollStStopId(): string {
    const station = StationDatabase.getStationById('F21'); // Updated from F20 to F21
    return station ? StationDatabase.getGtfsIdForLine(station, 'F') : 'F21';
  }
  
  private getTwentyThirdStStopId(): string {
    const station = StationDatabase.getStationById('D18'); // Updated from F18 to D18
    return station ? StationDatabase.getGtfsIdForLine(station, 'F') : 'D18';
  }
  
  private getJayStStopIdForLine(line: 'F' | 'A' | 'C'): string {
    const station = StationDatabase.getStationById('A41'); // Updated from JAY_ST_METROTECH to A41
    return station ? StationDatabase.getGtfsIdForLine(station, line) : 'A41';
  }
  
  private getTwentyThirdStCStopId(): string {
    const station = StationDatabase.getStationById('A30'); // Updated from A23 to A30
    return station ? StationDatabase.getGtfsIdForLine(station, 'C') : 'A30';
  }
  
  private getFourteenthStAStopId(): string {
    const station = StationDatabase.getStationById('A31'); // Updated from A27 to A31
    return station ? StationDatabase.getGtfsIdForLine(station, 'A') : 'A31';
  }
  
  constructor(locationProvider?: LocationProvider) {
    this.locationProvider = locationProvider || new StaticLocationProvider();
    this.cacheManager = new CacheManager();
    this.stationMapping = new StationMappingService();
  }

  /**
   * Calculate all morning routes (direct F train + F→C transfer routes)
   * Returns routes sorted by arrival time at destination
   */
  async calculateAllRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[RealMTAService] Calculating all morning routes (direct F + F→C transfer)');
      
      // Get direct F train routes
      const directRoutes = await this.calculateRoutes(origin, destination, targetArrival);
      
      // Get F→C transfer routes
      const transferRoutes = await this.calculateTransferRoutes(origin, destination, targetArrival);
      
      // Get F→A→C/E triple-transfer routes
      const tripleTransferRoutes = await this.calculateTripleTransferRoutes(origin, destination, targetArrival);
      
      // Combine all routes
      const allRoutes = [...directRoutes, ...transferRoutes, ...tripleTransferRoutes];
      
      // Sort by arrival time at destination
      allRoutes.sort((a, b) => {
        const timeA = this.parseTime(a.arrivalTime);
        const timeB = this.parseTime(b.arrivalTime);
        return timeA.getTime() - timeB.getTime();
      });
      
      // Limit to 5 routes
      const limitedRoutes = allRoutes.slice(0, 5);
      
      // Enrich routes with service alert information (morning = direction 0 = southbound)
      const enrichedRoutes = await this.enrichRoutesWithAlerts(limitedRoutes, 0);
      
      console.log(`[RealMTAService] Generated ${enrichedRoutes.length} total routes (from ${directRoutes.length} direct, ${transferRoutes.length} transfer, ${tripleTransferRoutes.length} triple-transfer)`);
      return enrichedRoutes;
      
    } catch (error) {
      console.error('[RealMTAService] Failed to calculate all routes:', error);
      throw error;
    }
  }

  /**
   * Calculate F train routes from Carroll St to 23rd St
   * Returns routes sorted by arrival time at 23rd St
   */
  async calculateRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    // Check if we're offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('No internet connection available. Please check your connection and try again.');
    }

    // Calculate transit time using GTFS data instead of hardcoded value
    const transitTime = await this.calculateGTFSTransitTime('F21', 'D18', 'F');
    
    const config: RouteConfig = {
      direction: 'northbound',
      startStation: 'Carroll St',
      endStation: '23rd St',
      line: 'F',
      getWalkingToStation: () => this.locationProvider.getWalkingTimeToTransit('F'),
      getWalkingFromStation: () => Promise.resolve(this.locationProvider.getWalkingTimeFromTwentyThirdSt()),
      transitTime: transitTime
    };

    return this.calculateRoutesForDirection(config, targetArrival);
  }

  /**
   * Unified route calculation method for any direction and configuration
   */
  private async calculateRoutesForDirection(
    config: RouteConfig,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log(`[RealMTAService] Calculating ${config.line} train routes from ${config.startStation} to ${config.endStation}`);
      
      // Get walking times using config methods
      const walkingToStation = await config.getWalkingToStation();
      const walkingFromStation = await config.getWalkingFromStation();
      
      // Get real-time train data for the specified direction
      const trainArrivals = await this.fetchTrainArrivals(config.direction, config.startStation);
      
      // Build routes for each upcoming train
      const routes = await this.buildRoutesForConfig(trainArrivals, config, walkingToStation, walkingFromStation, targetArrival);
      
      // Sort by arrival time at destination
      routes.sort((a, b) => {
        const timeA = this.parseTime(a.arrivalTime);
        const timeB = this.parseTime(b.arrivalTime);
        return timeA.getTime() - timeB.getTime();
      });
      
      console.log(`[RealMTAService] Generated ${routes.length} ${config.line} train routes`);
      return routes;
      
    } catch (error) {
      console.error(`[RealMTAService] Failed to calculate ${config.line} train routes:`, error);
      throw new Error(`Unable to fetch ${config.line} train data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch real-time train arrivals from any GTFS feed
   */
  private async fetchTrainArrivalsFromFeed(
    feedUrl: string, 
    direction: 'northbound' | 'southbound', 
    station: string,
    line: string,
    stopId: string
  ): Promise<StopTimeUpdate[]> {
    try {
      console.log(`[RealMTAService] Fetching ${direction} ${line} train GTFS-RT data for ${station}...`);
      
      // Log ACE feed requests specifically for debugging afternoon routes
      if (feedUrl.includes('ace')) {
        console.log(`[ACE_FEED] Requesting ACE feed for ${line} train (${direction}) at ${station}`);
        console.log(`[ACE_FEED] Stop ID: ${stopId}, Feed URL: ${feedUrl}`);
      }
      
      // Add cache-busting parameter
      const cacheBuster = Date.now();
      const urlWithCacheBuster = `${feedUrl}?_=${cacheBuster}`;
      
      const response = await fetch(urlWithCacheBuster, {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`${line} train GTFS feed not found (404). The MTA feed may be temporarily unavailable.`);
        } else if (response.status === 403) {
          throw new Error(`${line} train GTFS feed access denied (403). API authentication may be required.`);
        } else if (response.status >= 500) {
          throw new Error(`${line} train GTFS feed server error (${response.status}). MTA servers may be down.`);
        } else {
          throw new Error(`${line} train GTFS feed error: ${response.status} ${response.statusText}`);
        }
      }
      
      const gtfsBuffer = await response.arrayBuffer();
      
      // Log ACE feed buffer size for debugging
      if (feedUrl.includes('ace')) {
        console.log(`[ACE_FEED] Received ACE feed data - buffer size: ${gtfsBuffer.byteLength} bytes`);
      }
      
      // Parse real GTFS-RT protobuf data using the same logic as StationDepartureService
      const result = this.parseGtfsBuffer(gtfsBuffer, line, stopId, direction, station);
      
      // Log ACE feed results
      if (feedUrl.includes('ace')) {
        console.log(`[ACE_FEED] Parsed ACE feed for ${line} train - found ${result.length} upcoming departures`);
        if (result.length === 0) {
          console.warn(`[ACE_FEED] ⚠️ ACE feed returned NO departures for ${line} train ${direction} at ${station} (${stopId})`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`[RealMTAService] ${line} train GTFS-RT fetch failed:`, error);
      throw error;
    }
  }

  /**
   * Parse GTFS-RT protobuf buffer and extract relevant stop time updates
   * (Copied from StationDepartureService to ensure consistency)
   */
  private parseGtfsBuffer(gtfsBuffer: ArrayBuffer, line: string, stopId: string, direction: 'northbound' | 'southbound', station: string): StopTimeUpdate[] {
    console.log(`[RealMTAService] Parsing GTFS-RT protobuf data for ${line} line`);
    console.log(`[RealMTAService] Looking for stop ID: ${stopId}`);
    console.log(`[RealMTAService] Buffer size: ${gtfsBuffer.byteLength} bytes`);
    
    if (gtfsBuffer.byteLength === 0) {
      console.log(`[RealMTAService] Empty GTFS buffer received for ${line} line`);
      return [];
    }
    
    // Parse real GTFS-RT protobuf data
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(gtfsBuffer)
    );
    
    console.log(`[RealMTAService] Feed contains ${feed.entity.length} entities`);
    
    const arrivals: StopTimeUpdate[] = [];
    const now = Date.now() / 1000; // Current time in seconds
    const directionalStopId = direction === 'northbound' ? `${stopId}N` : `${stopId}S`;
    
    // Log the directional stop ID construction for debugging
    console.log(`[RealMTAService] Constructed directional stop ID: ${directionalStopId} (base: ${stopId}, direction: ${direction})`);
    
    // Process each entity in the feed
    for (const entity of feed.entity) {
      if (!entity.tripUpdate || !entity.tripUpdate.stopTimeUpdate) {
        continue;
      }
      
      // Find stop time updates for our station
      for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
        if (stopTimeUpdate.stopId && stopTimeUpdate.stopId === directionalStopId) {
          console.log(`[RealMTAService] MATCH FOUND! Looking for: ${directionalStopId}, Found: ${stopTimeUpdate.stopId}`);
          
          // Handle both .low format (64-bit) and direct value format
          const rawDepartureTime = stopTimeUpdate.departure?.time?.low || 
                                  stopTimeUpdate.departure?.time || 
                                  stopTimeUpdate.arrival?.time?.low || 
                                  stopTimeUpdate.arrival?.time;
          const rawArrivalTime = stopTimeUpdate.arrival?.time?.low || stopTimeUpdate.arrival?.time;
          
          // Convert to number if it's a string
          const departureTime = rawDepartureTime ? Number(rawDepartureTime) : undefined;
          const arrivalTime = rawArrivalTime ? Number(rawArrivalTime) : undefined;
          
          console.log(`[RealMTAService] Time data - departure: ${departureTime}, arrival: ${arrivalTime}, now: ${now}`);
          
          if (departureTime && departureTime > now) {
            console.log(`[RealMTAService] Adding train - departure in ${Math.round((departureTime - now) / 60)} minutes`);
            arrivals.push({
              stopId: stopTimeUpdate.stopId,
              stopSequence: stopTimeUpdate.stopSequence || 1,
              departureTime: departureTime,
              arrivalTime: arrivalTime || departureTime
            });
          } else {
            console.log(`[RealMTAService] Skipping train - departureTime: ${departureTime}, now: ${now}, valid: ${departureTime && departureTime > now}`);
          }
        }
      }
    }
    
    // Sort by departure time and limit to 6
    arrivals.sort((a, b) => a.departureTime! - b.departureTime!);
    arrivals.splice(6); // Keep only first 6
    
    console.log(`[RealMTAService] Found ${arrivals.length} upcoming ${line} trains at ${station}`);
    return arrivals;
  }

  /**
   * Fetch real-time train arrivals for F train (backward compatibility)
   */
  private async fetchTrainArrivals(direction: 'northbound' | 'southbound', station: string): Promise<StopTimeUpdate[]> {
    // Use appropriate stop ID based on station
    const stopId = station === 'Carroll St' ? this.getCarrollStStopId() : this.getTwentyThirdStStopId();
    return this.fetchTrainArrivalsFromFeed(this.F_TRAIN_FEED_URL, direction, station, 'F', stopId);
  }

  /**
   * Build route objects for any train configuration
   */
  private async buildRoutesForConfig(
    trainArrivals: StopTimeUpdate[], 
    config: RouteConfig,
    walkingToStation: number,
    walkingFromStation: number,
    targetArrival: string
  ): Promise<Route[]> {
    const routes: Route[] = [];
    const targetTime = this.parseTime(targetArrival);
    
    for (let i = 0; i < trainArrivals.length; i++) {
      const arrival = trainArrivals[i];
      const departureTime = new Date(arrival.departureTime! * 1000);
      
      // Calculate when user needs to leave origin
      const leaveOriginTime = new Date(departureTime.getTime() - walkingToStation * 60000);
      
      // Skip if user needs to leave in the past
      if (leaveOriginTime.getTime() < Date.now()) {
        continue;
      }
      
      // Train travel time using config
      const trainTravelTime = config.transitTime;
      const arrivalAtEndStation = new Date(departureTime.getTime() + trainTravelTime * 60000);
      
      // Final walk time to destination
      const finalArrivalTime = new Date(arrivalAtEndStation.getTime() + walkingFromStation * 60000);
      
      // Total journey time
      const totalDuration = Math.round((finalArrivalTime.getTime() - Date.now()) / 60000);
      
      // Wait time at starting station
      const waitTime = Math.max(0, Math.round((departureTime.getTime() - Date.now() - walkingToStation * 60000) / 60000));
      
      // Build route steps
      const steps: RouteStep[] = [
        {
          type: 'walk',
          description: `to ${config.startStation}`,
          duration: walkingToStation,
          dataSource: 'fixed',
          toStation: config.startStation
        },
        {
          type: 'wait',
          description: 'wait',
          duration: waitTime,
          dataSource: 'realtime',
          fromStation: config.startStation
        },
        {
          type: 'transit',
          description: `to ${config.endStation}`,
          duration: trainTravelTime,
          dataSource: 'realtime',
          line: config.line,
          fromStation: config.startStation,
          toStation: config.endStation
        },
        {
          type: 'walk',
          description: 'walk',
          duration: walkingFromStation,
          dataSource: 'fixed',
          fromStation: config.endStation
        }
      ];
      
      const route: Route = {
        id: i + 1,
        arrivalTime: this.formatTime(finalArrivalTime),
        duration: `${totalDuration} min`,
        method: `${config.line} train + Walk`,
        details: `Take ${config.line} train from ${config.startStation} to ${config.endStation}, then walk to destination`,
        transfers: 0,
        walkingDistance: '0.4 mi',
        walkingToTransit: walkingToStation,
        isRealTimeData: true,
        confidence: 'high',
        startingStation: config.startStation,
        endingStation: config.endStation,
        waitTime: waitTime,
        nextTrainDeparture: this.formatTime(departureTime),
        finalWalkingTime: walkingFromStation,
        transitTime: trainTravelTime,
        steps: steps
      };
      
      routes.push(route);
    }
    
    return routes;
  }

  /**
   * Parse time string to Date object
   */
  private parseTime(timeStr: string): Date {
    const today = new Date();
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minutes);
    
    // If time is in the past, assume next day
    if (targetDate.getTime() < Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    return targetDate;
  }

  /**
   * Format Date object to time string
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Calculate all afternoon routes (direct F train + C→F transfer routes)
   * Returns routes sorted by arrival time at destination
   */
  async calculateAllAfternoonRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[RealMTAService] ========== AFTERNOON ROUTE CALCULATION DEBUG ==========');
      console.log(`[AfternoonRoutes] Origin: ${origin}, Destination: ${destination}, Target: ${targetArrival}`);
      console.log('[RealMTAService] Calculating all afternoon routes (direct F + C→F transfer + C→A→F triple)');
      
      // Get direct F train routes
      console.log('[AfternoonRoutes] === STEP 1: Direct F Train Routes ===');
      const directRoutes = await this.calculateAfternoonRoutes(origin, destination, targetArrival);
      console.log(`[AfternoonRoutes] ✓ Direct F routes: ${directRoutes.length} generated`);
      if (directRoutes.length > 0) {
        console.log(`[AfternoonRoutes] Direct route example: ${directRoutes[0].method} - ${directRoutes[0].arrivalTime} (${directRoutes[0].duration})`);
      }
      
      // Get C→F transfer routes
      console.log('[AfternoonRoutes] === STEP 2: C→F Transfer Routes ===');
      const transferRoutes = await this.calculateAfternoonTransferRoutes(origin, destination, targetArrival);
      console.log(`[AfternoonRoutes] ✓ C→F transfer routes: ${transferRoutes.length} generated`);
      if (transferRoutes.length > 0) {
        console.log(`[AfternoonRoutes] Transfer route example: ${transferRoutes[0].method} - ${transferRoutes[0].arrivalTime} (${transferRoutes[0].duration})`);
      } else {
        console.warn(`[AfternoonRoutes] ⚠️ NO C→F transfer routes generated! This suggests an issue with C train data or transfer logic.`);
      }
      
      // Get C/E→A→F triple-transfer routes
      console.log('[AfternoonRoutes] === STEP 3: C→A→F Triple-Transfer Routes ===');
      const tripleTransferRoutes = await this.calculateAfternoonTripleTransferRoutes(origin, destination, targetArrival);
      console.log(`[AfternoonRoutes] ✓ C→A→F triple-transfer routes: ${tripleTransferRoutes.length} generated`);
      if (tripleTransferRoutes.length > 0) {
        console.log(`[AfternoonRoutes] Triple route example: ${tripleTransferRoutes[0].method} - ${tripleTransferRoutes[0].arrivalTime} (${tripleTransferRoutes[0].duration})`);
      } else {
        console.warn(`[AfternoonRoutes] ⚠️ NO C→A→F triple-transfer routes generated! This suggests an issue with ACE feed data.`);
      }
      
      // Combine all routes
      const allRoutes = [...directRoutes, ...transferRoutes, ...tripleTransferRoutes];
      console.log(`[AfternoonRoutes] === ROUTE COMBINATION RESULTS ===`);
      console.log(`[AfternoonRoutes] Total routes before sorting: ${allRoutes.length} (${directRoutes.length} direct + ${transferRoutes.length} transfer + ${tripleTransferRoutes.length} triple)`);
      
      if (allRoutes.length === directRoutes.length && directRoutes.length > 0) {
        console.error(`[AfternoonRoutes] 🚨 ISSUE DETECTED: Only direct F routes available! Transfer routes are not being generated.`);
        console.error(`[AfternoonRoutes] This explains why user only sees direct F trains in afternoon.`);
      }
      
      // Sort by arrival time at destination
      allRoutes.sort((a, b) => {
        const timeA = this.parseTime(a.arrivalTime);
        const timeB = this.parseTime(b.arrivalTime);
        return timeA.getTime() - timeB.getTime();
      });
      
      // Limit to 5 routes
      const limitedRoutes = allRoutes.slice(0, 5);
      console.log(`[AfternoonRoutes] Final route selection (top 5):`);
      limitedRoutes.forEach((route, i) => {
        console.log(`[AfternoonRoutes] ${i + 1}. ${route.method} - ${route.arrivalTime} (${route.duration}, ${route.transfers} transfers)`);
      });
      
      // Enrich routes with service alert information (afternoon = direction 0 = southbound) 
      // Note: afternoon commute is southbound (work→home), not northbound
      const enrichedRoutes = await this.enrichRoutesWithAlerts(limitedRoutes, 0);
      
      console.log(`[RealMTAService] ========== AFTERNOON ROUTE CALCULATION COMPLETE ==========`);
      console.log(`[RealMTAService] FINAL RESULT: ${enrichedRoutes.length} total afternoon routes delivered to UI`);
      return enrichedRoutes;
      
    } catch (error) {
      console.error('[RealMTAService] Failed to calculate all afternoon routes:', error);
      throw error;
    }
  }

  /**
   * Calculate afternoon commute routes from 23rd St to Carroll St (reverse direction)
   * Returns routes sorted by arrival time at home
   */
  async calculateAfternoonRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    // Calculate transit time using GTFS data instead of hardcoded value
    const transitTime = await this.calculateGTFSTransitTime('D18', 'F21', 'F');
    
    const config: RouteConfig = {
      direction: 'southbound',
      startStation: '23rd St',
      endStation: 'Carroll St',
      line: 'F',
      getWalkingToStation: () => this.locationProvider.getWalkingTimeFromWorkToTwentyThirdSt(),
      getWalkingFromStation: () => this.locationProvider.getWalkingTimeFromCarrollStToHome(),
      transitTime: transitTime
    };

    return this.calculateRoutesForDirection(config, targetArrival);
  }

  /**
   * Calculate morning transfer routes (F→C): Carroll St → Jay St → 23rd St
   */
  async calculateTransferRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[RealMTAService] Calculating F→C transfer routes from Carroll St to 23rd St');
      
      const walkingToStation = await this.locationProvider.getWalkingTimeToTransit('F');
      const walkingFromStation = this.locationProvider.getWalkingTimeFromTwentyThirdStEighthAve();
      
      // Create transfer route configuration
      const transferConfig: TransferRouteConfig = {
        segments: [
          {
            line: 'F',
            direction: 'northbound',
            fromStation: 'Carroll St',
            toStation: 'Jay St-MetroTech',
            feedUrl: this.F_TRAIN_FEED_URL,
            startStopId: this.getCarrollStStopId(),
            endStopId: this.getJayStStopIdForLine('F')
          },
          {
            line: 'C',
            direction: 'northbound',
            fromStation: 'Jay St-MetroTech',
            toStation: '23rd St-8th Ave',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: this.getJayStStopIdForLine('C'),
            endStopId: this.getTwentyThirdStCStopId()
          }
        ],
        transferStations: [
          {
            name: 'Jay St-MetroTech',
            transferTime: 0, // Instant transfer
            fromLine: 'F',
            toLine: 'C',
            fromStopId: this.getJayStStopIdForLine('F'),
            toStopId: this.getJayStStopIdForLine('C')
          }
        ],
        getWalkingToStation: () => Promise.resolve(walkingToStation),
        getWalkingFromStation: () => Promise.resolve(walkingFromStation)
      };
      
      return this.calculateTransferRoutesForConfig(transferConfig, targetArrival);
      
    } catch (error) {
      console.error('[RealMTAService] Failed to calculate transfer routes:', error);
      throw new Error(`Unable to fetch transfer route data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate afternoon transfer routes (C→F): 23rd St → Jay St → Carroll St
   */
  async calculateAfternoonTransferRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[AfternoonTransfer] ========== C→F TRANSFER ROUTE DEBUG ==========');
      console.log('[RealMTAService] Calculating C→F transfer routes from 23rd St to Carroll St');
      console.log('[AfternoonTransfer] Starting afternoon C→F transfer route calculation');
      
      const walkingToStation = await this.locationProvider.getWalkingTimeFromWorkToTwentyThirdStEighthAve();
      const walkingFromStation = await this.locationProvider.getWalkingTimeFromCarrollStToHome();
      
      console.log(`[AfternoonTransfer] Walking times - to station: ${walkingToStation} min, from station: ${walkingFromStation} min`);
      
      // Debug the station ID lookups
      const cStopId = this.getTwentyThirdStCStopId();
      const cJayStopId = this.getJayStStopIdForLine('C');
      const fJayStopId = this.getJayStStopIdForLine('F');
      const fCarrollStopId = this.getCarrollStStopId();
      
      console.log(`[AfternoonTransfer] === STATION ID VERIFICATION ===`);
      console.log(`[AfternoonTransfer] 23rd St-8th Ave (C): ${cStopId}`);
      console.log(`[AfternoonTransfer] Jay St-MetroTech (C): ${cJayStopId}`);
      console.log(`[AfternoonTransfer] Jay St-MetroTech (F): ${fJayStopId}`);
      console.log(`[AfternoonTransfer] Carroll St (F): ${fCarrollStopId}`);
      
      // Create reverse transfer route configuration
      const transferConfig: TransferRouteConfig = {
        segments: [
          {
            line: 'C',
            direction: 'southbound',
            fromStation: '23rd St-8th Ave',
            toStation: 'Jay St-MetroTech',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: cStopId,
            endStopId: cJayStopId
          },
          {
            line: 'F',
            direction: 'southbound',
            fromStation: 'Jay St-MetroTech',
            toStation: 'Carroll St',
            feedUrl: this.F_TRAIN_FEED_URL,
            startStopId: fJayStopId,
            endStopId: fCarrollStopId
          }
        ],
        transferStations: [
          {
            name: 'Jay St-MetroTech',
            transferTime: 0, // Instant transfer
            fromLine: 'C',
            toLine: 'F',
            fromStopId: cJayStopId,
            toStopId: fJayStopId
          }
        ],
        getWalkingToStation: () => Promise.resolve(walkingToStation),
        getWalkingFromStation: () => Promise.resolve(walkingFromStation)
      };
      
      console.log(`[AfternoonTransfer] === TRANSFER CONFIGURATION ===`);
      console.log(`[AfternoonTransfer] Segment 1 (C train southbound): ${transferConfig.segments[0].startStopId} → ${transferConfig.segments[0].endStopId}`);
      console.log(`[AfternoonTransfer] Segment 2 (F train southbound): ${transferConfig.segments[1].startStopId} → ${transferConfig.segments[1].endStopId}`);
      console.log(`[AfternoonTransfer] ACE feed URL: ${this.ACE_TRAIN_FEED_URL}`);
      console.log(`[AfternoonTransfer] F feed URL: ${this.F_TRAIN_FEED_URL}`);
      
      console.log(`[AfternoonTransfer] === CALLING TRANSFER CALCULATION ===`);
      const result = await this.calculateTransferRoutesForConfig(transferConfig, targetArrival);
      
      console.log(`[AfternoonTransfer] === TRANSFER CALCULATION RESULT ===`);
      console.log(`[AfternoonTransfer] C→F transfer calculation completed - generated ${result.length} routes`);
      
      if (result.length === 0) {
        console.error(`[AfternoonTransfer] 🚨 ZERO C→F transfer routes generated!`);
        console.error(`[AfternoonTransfer] This indicates either:`);
        console.error(`[AfternoonTransfer] 1. ACE feed (C train) has no southbound data`);
        console.error(`[AfternoonTransfer] 2. F feed has no southbound data`);
        console.error(`[AfternoonTransfer] 3. Station IDs are incorrect`);
        console.error(`[AfternoonTransfer] 4. No valid transfer connections found`);
      } else {
        console.log(`[AfternoonTransfer] ✓ Successfully generated C→F transfer routes`);
        result.forEach((route, i) => {
          console.log(`[AfternoonTransfer] Route ${i + 1}: ${route.method} - ${route.arrivalTime} (${route.duration})`);
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('[AfternoonTransfer] Transfer route calculation FAILED:', error);
      console.error('[AfternoonTransfer] Error details:', error.message);
      throw new Error(`Unable to fetch afternoon transfer route data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Core transfer route calculation logic
   */
  private async calculateTransferRoutesForConfig(
    config: TransferRouteConfig,
    targetArrival: string
  ): Promise<Route[]> {
    console.log(`[Transfer] ========== CORE TRANSFER CALCULATION DEBUG ==========`);
    const routes: Route[] = [];
    const targetTime = this.parseTime(targetArrival);
    
    // Get walking times
    const walkingToStation = await config.getWalkingToStation();
    const walkingFromStation = await config.getWalkingFromStation();
    console.log(`[Transfer] Walking times: to=${walkingToStation}min, from=${walkingFromStation}min`);
    
    // Debug the segments configuration
    console.log(`[Transfer] === SEGMENT CONFIGURATION ===`);
    config.segments.forEach((segment, i) => {
      console.log(`[Transfer] Segment ${i + 1}: ${segment.line} ${segment.direction} from ${segment.fromStation} to ${segment.toStation}`);
      console.log(`[Transfer] - Stop IDs: ${segment.startStopId} → ${segment.endStopId}`);
      console.log(`[Transfer] - Feed URL: ${segment.feedUrl}`);
    });
    
    // Fetch first segment train arrivals
    const firstSegment = config.segments[0];
    console.log(`[Transfer] === FETCHING FIRST SEGMENT DATA ===`);
    console.log(`[Transfer] Fetching ${firstSegment.line} ${firstSegment.direction} arrivals from ${firstSegment.fromStation} (${firstSegment.startStopId})`);
    
    const firstSegmentArrivals = await this.fetchTrainArrivalsFromFeed(
      firstSegment.feedUrl,
      firstSegment.direction,
      firstSegment.fromStation,
      firstSegment.line,
      firstSegment.startStopId
    );
    
    console.log(`[Transfer] ✓ First segment (${firstSegment.line}): ${firstSegmentArrivals.length} arrivals found`);
    if (firstSegmentArrivals.length > 0) {
      const firstArrival = new Date(firstSegmentArrivals[0].departureTime! * 1000);
      console.log(`[Transfer] First ${firstSegment.line} train departs at: ${this.formatTime(firstArrival)}`);
    }
    
    // Fetch second segment train arrivals
    const secondSegment = config.segments[1];
    console.log(`[Transfer] === FETCHING SECOND SEGMENT DATA ===`);
    console.log(`[Transfer] Fetching ${secondSegment.line} ${secondSegment.direction} arrivals from ${secondSegment.fromStation} (${secondSegment.startStopId})`);
    
    const secondSegmentArrivals = await this.fetchTrainArrivalsFromFeed(
      secondSegment.feedUrl,
      secondSegment.direction,
      secondSegment.fromStation,
      secondSegment.line,
      secondSegment.startStopId
    );
    
    console.log(`[Transfer] ✓ Second segment (${secondSegment.line}): ${secondSegmentArrivals.length} arrivals found`);
    if (secondSegmentArrivals.length > 0) {
      const firstArrival = new Date(secondSegmentArrivals[0].departureTime! * 1000);
      console.log(`[Transfer] First ${secondSegment.line} train departs at: ${this.formatTime(firstArrival)}`);
    }
    
    // Validate arrivals data
    console.log(`[Transfer] === ARRIVAL DATA VALIDATION ===`);
    if (firstSegmentArrivals.length === 0) {
      console.error(`[Transfer] 🚨 CRITICAL: No ${firstSegment.line} arrivals found!`);
      console.error(`[Transfer] This means the ${firstSegment.line} train feed has no ${firstSegment.direction} departures from ${firstSegment.fromStation}`);
      console.error(`[Transfer] Check: 1) ACE feed connectivity 2) Station ID mapping 3) Direction mapping`);
      return [];
    }
    
    if (secondSegmentArrivals.length === 0) {
      console.error(`[Transfer] 🚨 CRITICAL: No ${secondSegment.line} arrivals found!`);
      console.error(`[Transfer] This means the ${secondSegment.line} train feed has no ${secondSegment.direction} departures from ${secondSegment.fromStation}`);
      console.error(`[Transfer] Check: 1) F feed connectivity 2) Station ID mapping 3) Direction mapping`);
      return [];
    }
    
    // Calculate routes for each first segment train
    for (let i = 0; i < firstSegmentArrivals.length; i++) {
      const firstTrainArrival = firstSegmentArrivals[i];
      const firstTrainDepartureTime = new Date(firstTrainArrival.departureTime! * 1000);
      
      // Calculate when user needs to leave origin
      const leaveOriginTime = new Date(firstTrainDepartureTime.getTime() - walkingToStation * 60000);
      
      // Skip if user needs to leave in the past
      if (leaveOriginTime.getTime() < Date.now()) {
        continue;
      }
      
      // Calculate arrival at transfer station (using GTFS timing - simplified for now)
      // In real implementation, this would use GTFS static data for exact travel times
      const firstSegmentTravelTime = this.getSegmentTravelTime(firstSegment);
      const arrivalAtTransferStation = new Date(firstTrainDepartureTime.getTime() + firstSegmentTravelTime * 60000);
      
      // Find next available train on second segment after transfer
      const transferStation = config.transferStations[0];
      const earliestDepartureTime = new Date(arrivalAtTransferStation.getTime() + transferStation.transferTime * 60000);
      
      // Find the next train on second segment
      console.log(`[Transfer] Connection attempt: First train arrives at ${this.formatTime(arrivalAtTransferStation)}, need second train after ${this.formatTime(earliestDepartureTime)}`);
      
      const availableSecondTrains = secondSegmentArrivals.filter(train => {
        const trainDepartureTime = new Date(train.departureTime! * 1000);
        return trainDepartureTime.getTime() >= earliestDepartureTime.getTime();
      });
      
      if (availableSecondTrains.length === 0) {
        console.log(`[Transfer] No connecting trains available for first train ${i + 1}`);
        continue; // No connecting trains available
      }
      
      const secondTrainDeparture = availableSecondTrains[0];
      const secondTrainDepartureTime = new Date(secondTrainDeparture.departureTime! * 1000);
      
      // Calculate final arrival
      const secondSegmentTravelTime = this.getSegmentTravelTime(secondSegment);
      const arrivalAtFinalStation = new Date(secondTrainDepartureTime.getTime() + secondSegmentTravelTime * 60000);
      const finalArrivalTime = new Date(arrivalAtFinalStation.getTime() + walkingFromStation * 60000);
      
      // Calculate total journey time and wait times
      const totalDuration = Math.round((finalArrivalTime.getTime() - Date.now()) / 60000);
      const firstWaitTime = Math.max(0, Math.round((firstTrainDepartureTime.getTime() - Date.now() - walkingToStation * 60000) / 60000));
      const transferWaitTime = Math.round((secondTrainDepartureTime.getTime() - arrivalAtTransferStation.getTime()) / 60000);
      
      // Build route steps for transfer route
      const steps: RouteStep[] = [
        {
          type: 'walk',
          description: `to ${firstSegment.fromStation}`,
          duration: walkingToStation,
          dataSource: 'fixed',
          toStation: firstSegment.fromStation
        },
        {
          type: 'wait',
          description: 'wait',
          duration: firstWaitTime,
          dataSource: 'realtime',
          fromStation: firstSegment.fromStation
        },
        {
          type: 'transit',
          description: `to ${transferStation.name}`,
          duration: firstSegmentTravelTime,
          dataSource: 'realtime',
          line: firstSegment.line,
          fromStation: firstSegment.fromStation,
          toStation: transferStation.name
        },
        {
          type: 'transfer',
          description: 'Transfer',
          duration: transferStation.transferTime,
          dataSource: 'fixed',
          transferTime: transferStation.transferTime,
          transferStation: transferStation.name,
          nextLine: secondSegment.line
        },
        {
          type: 'wait',
          description: 'wait',
          duration: transferWaitTime,
          dataSource: 'realtime',
          fromStation: transferStation.name
        },
        {
          type: 'transit',
          description: `to ${secondSegment.toStation}`,
          duration: secondSegmentTravelTime,
          dataSource: 'realtime',
          line: secondSegment.line,
          fromStation: transferStation.name,
          toStation: secondSegment.toStation
        },
        {
          type: 'walk',
          description: 'walk',
          duration: walkingFromStation,
          dataSource: 'fixed',
          fromStation: secondSegment.toStation
        }
      ];
      
      const route: Route = {
        id: 1000 + i, // Use different ID range for transfer routes
        arrivalTime: this.formatTime(finalArrivalTime),
        duration: `${totalDuration} min`,
        method: `${firstSegment.line}→${secondSegment.line} trains + Walk`,
        details: `Take ${firstSegment.line} train from ${firstSegment.fromStation} to ${transferStation.name}, transfer to ${secondSegment.line} train to ${secondSegment.toStation}, then walk to destination`,
        transfers: 1,
        walkingDistance: '0.4 mi',
        walkingToTransit: walkingToStation,
        isRealTimeData: true,
        confidence: 'high',
        startingStation: firstSegment.fromStation,
        endingStation: secondSegment.toStation,
        waitTime: firstWaitTime,
        nextTrainDeparture: this.formatTime(firstTrainDepartureTime),
        finalWalkingTime: walkingFromStation,
        transitTime: firstSegmentTravelTime + transferStation.transferTime + transferWaitTime + secondSegmentTravelTime,
        steps: steps
      };
      
      routes.push(route);
    }
    
    if (routes.length === 0) {
      console.log('[Transfer] No connecting trains available - no transfer routes generated');
    } else {
      console.log(`[Transfer] Generated ${routes.length} transfer routes`);
    }
    return routes;
  }

  /**
   * Calculate morning triple-transfer routes (F→A→C/E): Carroll St → Jay St → 14th St → 23rd St
   */
  async calculateTripleTransferRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[RealMTAService] Calculating F→A→C/E triple-transfer routes from Carroll St to 23rd St');
      
      const walkingToStation = await this.locationProvider.getWalkingTimeToTransit('F');
      const walkingFromStation = this.locationProvider.getWalkingTimeFromTwentyThirdStEighthAve();
      
      // Create triple-transfer route configuration
      const tripleTransferConfig: TransferRouteConfig = {
        segments: [
          {
            line: 'F',
            direction: 'northbound',
            fromStation: 'Carroll St',
            toStation: 'Jay St-MetroTech',
            feedUrl: this.F_TRAIN_FEED_URL,
            startStopId: this.getCarrollStStopId(),
            endStopId: this.getJayStStopIdForLine('F')
          },
          {
            line: 'A',
            direction: 'northbound',
            fromStation: 'Jay St-MetroTech',
            toStation: '14th St-8th Ave',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: this.getJayStStopIdForLine('A'),
            endStopId: this.getFourteenthStAStopId()
          },
          {
            line: 'C',
            direction: 'northbound',
            fromStation: '14th St-8th Ave',
            toStation: '23rd St-8th Ave',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: this.getFourteenthStAStopId(),
            endStopId: this.getTwentyThirdStCStopId()
          }
        ],
        transferStations: [
          {
            name: 'Jay St-MetroTech',
            transferTime: 0, // Instant transfer F to A
            fromLine: 'F',
            toLine: 'A',
            fromStopId: this.getJayStStopIdForLine('F'),
            toStopId: this.getJayStStopIdForLine('A')
          },
          {
            name: '14th St-8th Ave',
            transferTime: 0, // Instant transfer A to C/E
            fromLine: 'A',
            toLine: 'C',
            fromStopId: this.getFourteenthStAStopId(),
            toStopId: this.getFourteenthStAStopId() // Same platform for A,C,E
          }
        ],
        getWalkingToStation: () => Promise.resolve(walkingToStation),
        getWalkingFromStation: () => Promise.resolve(walkingFromStation)
      };
      
      return this.calculateTripleTransferRoutesForConfig(tripleTransferConfig, targetArrival);
      
    } catch (error) {
      console.error('[RealMTAService] Failed to calculate triple-transfer routes:', error);
      throw new Error(`Unable to fetch triple-transfer route data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate afternoon triple-transfer routes (C/E→A→F): 23rd St → 14th St → Jay St → Carroll St
   */
  async calculateAfternoonTripleTransferRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      console.log('[RealMTAService] Calculating C/E→A→F triple-transfer routes from 23rd St to Carroll St');
      console.log('[AfternoonTriple] Starting afternoon C→A→F triple-transfer route calculation');
      
      const walkingToStation = await this.locationProvider.getWalkingTimeFromWorkToTwentyThirdStEighthAve();
      const walkingFromStation = await this.locationProvider.getWalkingTimeFromCarrollStToHome();
      
      console.log(`[AfternoonTriple] Walking times - to station: ${walkingToStation} min, from station: ${walkingFromStation} min`);
      
      // Create reverse triple-transfer route configuration
      const tripleTransferConfig: TransferRouteConfig = {
        segments: [
          {
            line: 'C',
            direction: 'southbound',
            fromStation: '23rd St-8th Ave',
            toStation: '14th St-8th Ave',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: this.getTwentyThirdStCStopId(),
            endStopId: this.getFourteenthStAStopId()
          },
          {
            line: 'A',
            direction: 'southbound',
            fromStation: '14th St-8th Ave',
            toStation: 'Jay St-MetroTech',
            feedUrl: this.ACE_TRAIN_FEED_URL,
            startStopId: this.getFourteenthStAStopId(),
            endStopId: this.getJayStStopIdForLine('A')
          },
          {
            line: 'F',
            direction: 'southbound',
            fromStation: 'Jay St-MetroTech',
            toStation: 'Carroll St',
            feedUrl: this.F_TRAIN_FEED_URL,
            startStopId: this.getJayStStopIdForLine('F'),
            endStopId: this.getCarrollStStopId()
          }
        ],
        transferStations: [
          {
            name: '14th St-8th Ave',
            transferTime: 0, // Instant transfer C/E to A
            fromLine: 'C',
            toLine: 'A',
            fromStopId: this.getFourteenthStAStopId(),
            toStopId: this.getFourteenthStAStopId() // Same platform for A,C,E
          },
          {
            name: 'Jay St-MetroTech',
            transferTime: 0, // Instant transfer A to F
            fromLine: 'A',
            toLine: 'F',
            fromStopId: this.getJayStStopIdForLine('A'),
            toStopId: this.getJayStStopIdForLine('F')
          }
        ],
        getWalkingToStation: () => Promise.resolve(walkingToStation),
        getWalkingFromStation: () => Promise.resolve(walkingFromStation)
      };
      
      console.log(`[AfternoonTriple] Triple-transfer config:`);
      console.log(`[AfternoonTriple] Segment 1 - C train: ${tripleTransferConfig.segments[0].startStopId} → ${tripleTransferConfig.segments[0].endStopId}`);
      console.log(`[AfternoonTriple] Segment 2 - A train: ${tripleTransferConfig.segments[1].startStopId} → ${tripleTransferConfig.segments[1].endStopId}`);
      console.log(`[AfternoonTriple] Segment 3 - F train: ${tripleTransferConfig.segments[2].startStopId} → ${tripleTransferConfig.segments[2].endStopId}`);
      console.log(`[AfternoonTriple] Using ACE feed for C and A trains, F feed for F train`);
      
      const result = await this.calculateTripleTransferRoutesForConfig(tripleTransferConfig, targetArrival);
      console.log(`[AfternoonTriple] C→A→F triple-transfer calculation completed - generated ${result.length} routes`);
      return result;
      
    } catch (error) {
      console.error('[RealMTAService] Failed to calculate afternoon triple-transfer routes:', error);
      throw new Error(`Unable to fetch afternoon triple-transfer route data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Core triple-transfer route calculation logic
   */
  private async calculateTripleTransferRoutesForConfig(
    config: TransferRouteConfig,
    targetArrival: string
  ): Promise<Route[]> {
    const routes: Route[] = [];
    const targetTime = this.parseTime(targetArrival);
    
    // Get walking times
    const walkingToStation = await config.getWalkingToStation();
    const walkingFromStation = await config.getWalkingFromStation();
    
    // Fetch arrivals for all three segments
    const firstSegment = config.segments[0];
    const secondSegment = config.segments[1];
    const thirdSegment = config.segments[2];
    
    const firstSegmentArrivals = await this.fetchTrainArrivalsFromFeed(
      firstSegment.feedUrl,
      firstSegment.direction,
      firstSegment.fromStation,
      firstSegment.line,
      firstSegment.startStopId
    );
    
    const secondSegmentArrivals = await this.fetchTrainArrivalsFromFeed(
      secondSegment.feedUrl,
      secondSegment.direction,
      secondSegment.fromStation,
      secondSegment.line,
      secondSegment.startStopId
    );
    
    const thirdSegmentArrivals = await this.fetchTrainArrivalsFromFeed(
      thirdSegment.feedUrl,
      thirdSegment.direction,
      thirdSegment.fromStation,
      thirdSegment.line,
      thirdSegment.startStopId
    );
    
    // Calculate routes for each first segment train
    for (let i = 0; i < firstSegmentArrivals.length; i++) {
      const firstTrainArrival = firstSegmentArrivals[i];
      const firstTrainDepartureTime = new Date(firstTrainArrival.departureTime! * 1000);
      
      // Calculate when user needs to leave origin
      const leaveOriginTime = new Date(firstTrainDepartureTime.getTime() - walkingToStation * 60000);
      
      // Skip if user needs to leave in the past
      if (leaveOriginTime.getTime() < Date.now()) {
        continue;
      }
      
      // Calculate arrival at first transfer station
      const firstSegmentTravelTime = this.getSegmentTravelTime(firstSegment);
      const arrivalAtFirstTransfer = new Date(firstTrainDepartureTime.getTime() + firstSegmentTravelTime * 60000);
      
      // Find next available train on second segment after first transfer
      const firstTransferStation = config.transferStations[0];
      const firstTransferEarliestDeparture = new Date(arrivalAtFirstTransfer.getTime() + firstTransferStation.transferTime * 60000);
      
      // Find available second segment trains
      const availableSecondTrains = secondSegmentArrivals.filter(train => {
        const trainDepartureTime = new Date(train.departureTime! * 1000);
        return trainDepartureTime.getTime() >= firstTransferEarliestDeparture.getTime();
      });
      
      if (availableSecondTrains.length === 0) continue;
      
      const secondTrainDeparture = availableSecondTrains[0];
      const secondTrainDepartureTime = new Date(secondTrainDeparture.departureTime! * 1000);
      
      // Calculate arrival at second transfer station
      const secondSegmentTravelTime = this.getSegmentTravelTime(secondSegment);
      const arrivalAtSecondTransfer = new Date(secondTrainDepartureTime.getTime() + secondSegmentTravelTime * 60000);
      
      // Find next available train on third segment after second transfer
      const secondTransferStation = config.transferStations[1];
      const secondTransferEarliestDeparture = new Date(arrivalAtSecondTransfer.getTime() + secondTransferStation.transferTime * 60000);
      
      // Find available third segment trains
      const availableThirdTrains = thirdSegmentArrivals.filter(train => {
        const trainDepartureTime = new Date(train.departureTime! * 1000);
        return trainDepartureTime.getTime() >= secondTransferEarliestDeparture.getTime();
      });
      
      if (availableThirdTrains.length === 0) continue;
      
      const thirdTrainDeparture = availableThirdTrains[0];
      const thirdTrainDepartureTime = new Date(thirdTrainDeparture.departureTime! * 1000);
      
      // Calculate final arrival
      const thirdSegmentTravelTime = this.getSegmentTravelTime(thirdSegment);
      const arrivalAtFinalStation = new Date(thirdTrainDepartureTime.getTime() + thirdSegmentTravelTime * 60000);
      const finalArrivalTime = new Date(arrivalAtFinalStation.getTime() + walkingFromStation * 60000);
      
      // Calculate total journey time and wait times
      const totalDuration = Math.round((finalArrivalTime.getTime() - Date.now()) / 60000);
      const firstWaitTime = Math.max(0, Math.round((firstTrainDepartureTime.getTime() - Date.now() - walkingToStation * 60000) / 60000));
      const firstTransferWaitTime = Math.round((secondTrainDepartureTime.getTime() - arrivalAtFirstTransfer.getTime()) / 60000);
      const secondTransferWaitTime = Math.round((thirdTrainDepartureTime.getTime() - arrivalAtSecondTransfer.getTime()) / 60000);
      
      // Build route steps for triple-transfer route
      const steps: RouteStep[] = [
        {
          type: 'walk',
          description: `to ${firstSegment.fromStation}`,
          duration: walkingToStation,
          dataSource: 'fixed',
          toStation: firstSegment.fromStation
        },
        {
          type: 'wait',
          description: 'wait',
          duration: firstWaitTime,
          dataSource: 'realtime',
          fromStation: firstSegment.fromStation
        },
        {
          type: 'transit',
          description: `to ${firstTransferStation.name}`,
          duration: firstSegmentTravelTime,
          dataSource: 'realtime',
          line: firstSegment.line,
          fromStation: firstSegment.fromStation,
          toStation: firstTransferStation.name
        },
        {
          type: 'transfer',
          description: 'Transfer',
          duration: firstTransferStation.transferTime,
          dataSource: 'fixed',
          transferTime: firstTransferStation.transferTime,
          transferStation: firstTransferStation.name,
          nextLine: secondSegment.line
        },
        {
          type: 'wait',
          description: 'wait',
          duration: firstTransferWaitTime,
          dataSource: 'realtime',
          fromStation: firstTransferStation.name
        },
        {
          type: 'transit',
          description: `to ${secondTransferStation.name}`,
          duration: secondSegmentTravelTime,
          dataSource: 'realtime',
          line: secondSegment.line,
          fromStation: firstTransferStation.name,
          toStation: secondTransferStation.name
        },
        {
          type: 'transfer',
          description: 'Transfer',
          duration: secondTransferStation.transferTime,
          dataSource: 'fixed',
          transferTime: secondTransferStation.transferTime,
          transferStation: secondTransferStation.name,
          nextLine: thirdSegment.line
        },
        {
          type: 'wait',
          description: 'wait',
          duration: secondTransferWaitTime,
          dataSource: 'realtime',
          fromStation: secondTransferStation.name
        },
        {
          type: 'transit',
          description: `to ${thirdSegment.toStation}`,
          duration: thirdSegmentTravelTime,
          dataSource: 'realtime',
          line: thirdSegment.line,
          fromStation: secondTransferStation.name,
          toStation: thirdSegment.toStation
        },
        {
          type: 'walk',
          description: 'walk',
          duration: walkingFromStation,
          dataSource: 'fixed',
          fromStation: thirdSegment.toStation
        }
      ];
      
      const route: Route = {
        id: 2000 + i, // Use different ID range for triple-transfer routes
        arrivalTime: this.formatTime(finalArrivalTime),
        duration: `${totalDuration} min`,
        method: `${firstSegment.line}→${secondSegment.line}→${thirdSegment.line} trains + Walk`,
        details: `Take ${firstSegment.line} train from ${firstSegment.fromStation} to ${firstTransferStation.name}, transfer to ${secondSegment.line} train to ${secondTransferStation.name}, transfer to ${thirdSegment.line} train to ${thirdSegment.toStation}, then walk to destination`,
        transfers: 2,
        walkingDistance: '0.4 mi',
        walkingToTransit: walkingToStation,
        isRealTimeData: true,
        confidence: 'high',
        startingStation: firstSegment.fromStation,
        endingStation: thirdSegment.toStation,
        waitTime: firstWaitTime,
        nextTrainDeparture: this.formatTime(firstTrainDepartureTime),
        finalWalkingTime: walkingFromStation,
        transitTime: firstSegmentTravelTime + firstTransferStation.transferTime + firstTransferWaitTime + secondSegmentTravelTime + secondTransferStation.transferTime + secondTransferWaitTime + thirdSegmentTravelTime,
        steps: steps
      };
      
      routes.push(route);
    }
    
    console.log(`[RealMTAService] Generated ${routes.length} triple-transfer routes`);
    return routes;
  }

  /**
   * Get travel time for a route segment (using GTFS schedule data)
   * Simplified - in real implementation would parse GTFS static data
   */
  private getSegmentTravelTime(segment: RouteSegment): number {
    // Based on actual GTFS schedule data (simplified for demo)
    if (segment.line === 'F' && segment.fromStation === 'Carroll St' && segment.toStation === 'Jay St-MetroTech') {
      return 7; // Carroll St to Jay St-MetroTech on F train
    }
    if (segment.line === 'C' && segment.fromStation === 'Jay St-MetroTech' && segment.toStation === '23rd St-8th Ave') {
      return 11; // Jay St-MetroTech to 23rd St-8th Ave on C train
    }
    if (segment.line === 'C' && segment.fromStation === '23rd St-8th Ave' && segment.toStation === 'Jay St-MetroTech') {
      return 11; // 23rd St-8th Ave to Jay St-MetroTech on C train (reverse)
    }
    if (segment.line === 'F' && segment.fromStation === 'Jay St-MetroTech' && segment.toStation === 'Carroll St') {
      return 7; // Jay St-MetroTech to Carroll St on F train (reverse)
    }
    
    // A train segments for triple-transfer routes
    if (segment.line === 'A' && segment.fromStation === 'Jay St-MetroTech' && segment.toStation === '14th St-8th Ave') {
      return 8; // Jay St-MetroTech to 14th St-8th Ave on A train
    }
    if (segment.line === 'A' && segment.fromStation === '14th St-8th Ave' && segment.toStation === 'Jay St-MetroTech') {
      return 8; // 14th St-8th Ave to Jay St-MetroTech on A train (reverse)
    }
    
    // C train segments for triple-transfer routes  
    if (segment.line === 'C' && segment.fromStation === '14th St-8th Ave' && segment.toStation === '23rd St-8th Ave') {
      return 3; // 14th St-8th Ave to 23rd St-8th Ave on C train
    }
    if (segment.line === 'C' && segment.fromStation === '23rd St-8th Ave' && segment.toStation === '14th St-8th Ave') {
      return 3; // 23rd St-8th Ave to 14th St-8th Ave on C train (reverse)
    }
    
    // Fallback to estimated time
    return 10;
  }

  /**
   * Fetch service alerts from MTA GTFS-RT alerts feed with fallback URL
   */
  async getServiceAlerts(): Promise<ServiceAlert[]> {
    // Try primary URL first, then fallback URL
    const urlsToTry = [this.ALERTS_FEED_URL, this.ALERTS_FEED_URL_FALLBACK];
    
    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i];
      const isLastUrl = i === urlsToTry.length - 1;
      
      try {
        console.log(`[RealMTAService] Fetching alerts from ${i === 0 ? 'primary' : 'fallback'} URL`);
        
        // MTA feeds are public and don't require API key
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`[RealMTAService] Failed to fetch alerts from ${url}:`, response.status);
          if (isLastUrl) return [];
          continue; // Try next URL
        }

        const alertsBuffer = await response.arrayBuffer();
        
        // Check if response is XML error (not protobuf)
        const firstBytes = new Uint8Array(alertsBuffer.slice(0, 10));
        const startsWithXml = firstBytes[0] === 0x3C && firstBytes[1] === 0x3F; // "<?xml"
        
        if (startsWithXml) {
          const errorText = new TextDecoder().decode(alertsBuffer.slice(0, 200));
          console.error(`[RealMTAService] Received XML error response from ${url}:`, errorText);
          if (isLastUrl) return [];
          continue; // Try next URL
        }
        
        // Parse GTFS-RT alerts data using protobuf parsing
        return await this.parseAlertsBuffer(alertsBuffer);
        
      } catch (error) {
        console.error(`[RealMTAService] Error fetching service alerts from ${url}:`, error);
        if (isLastUrl) return [];
        // Try next URL
      }
    }
    
    return [];
  }

  /**
   * Parse GTFS-RT alerts protobuf buffer and extract service alerts
   */
  async parseAlertsBuffer(alertsBuffer: ArrayBuffer): Promise<ServiceAlert[]> {
    console.log(`[RealMTAService] Parsing GTFS-RT alerts protobuf data`);
    console.log(`[RealMTAService] Buffer size: ${alertsBuffer.byteLength} bytes`);
    
    if (alertsBuffer.byteLength === 0) {
      console.log(`[RealMTAService] Empty alerts buffer received`);
      return [];
    }
    
    try {
      // Parse real GTFS-RT alerts protobuf data
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(alertsBuffer)
      );
      
      console.log(`[RealMTAService] Alerts feed contains ${feed.entity.length} entities`);
      
      const alerts: ServiceAlert[] = [];
      
      // Process each entity in the feed
      for (const entity of feed.entity) {
        if (!entity.alert) {
          continue;
        }
        
        const alert = entity.alert;
        
        // Extract basic alert information
        const headerText = alert.headerText?.translation?.[0]?.text || 'Service Alert';
        const descriptionText = alert.descriptionText?.translation?.[0]?.text || 'Check MTA website for details';
        
        // Extract affected routes and detailed informed entities
        const affectedRoutes: string[] = [];
        const informedEntities: InformedEntity[] = [];
        if (alert.informedEntity) {
          for (const entity of alert.informedEntity) {
            const informedEntity: InformedEntity = {
              agencyId: entity.agencyId || undefined,
              routeId: entity.routeId || undefined,
              routeType: entity.routeType || undefined,
              directionId: entity.directionId || undefined,
              stopId: entity.stopId || undefined,
              tripId: entity.trip?.tripId || undefined,
            };
            informedEntities.push(informedEntity);
            
            if (entity.routeId) {
              affectedRoutes.push(entity.routeId);
            }
          }
        }
        
        // Determine severity (simplified logic)
        let severity: 'info' | 'warning' | 'severe' = 'info';
        if (headerText.toLowerCase().includes('suspended') || 
            headerText.toLowerCase().includes('no service') ||
            descriptionText.toLowerCase().includes('suspended')) {
          severity = 'severe';
        } else if (headerText.toLowerCase().includes('delay') || 
                   headerText.toLowerCase().includes('slower') ||
                   descriptionText.toLowerCase().includes('delay')) {
          severity = 'warning';
        }
        
        // Extract timing information
        let activePeriod: { start?: Date; end?: Date } | undefined;
        if (alert.activePeriod && alert.activePeriod.length > 0) {
          const period = alert.activePeriod[0];
          
          // Helper function to safely parse GTFS-RT timestamp
          const parseGtfsTimestamp = (timestamp: any): Date | undefined => {
            if (!timestamp) return undefined;
            
            try {
              let unixSeconds: number;
              
              // Handle different timestamp formats from GTFS-RT
              if (typeof timestamp === 'number') {
                unixSeconds = timestamp;
              } else if (timestamp.low !== undefined) {
                // 64-bit integer representation
                unixSeconds = timestamp.low;
              } else if (timestamp.toNumber) {
                // Protocol buffer Long type
                unixSeconds = timestamp.toNumber();
              } else {
                console.warn('[RealMTAService] Unknown timestamp format:', timestamp);
                return undefined;
              }
              
              const date = new Date(unixSeconds * 1000);
              
              // Validate the date
              if (isNaN(date.getTime())) {
                console.warn('[RealMTAService] Invalid date parsed from timestamp:', unixSeconds);
                return undefined;
              }
              
              return date;
            } catch (error) {
              console.warn('[RealMTAService] Error parsing timestamp:', timestamp, error);
              return undefined;
            }
          };
          
          activePeriod = {
            start: parseGtfsTimestamp(period.start),
            end: parseGtfsTimestamp(period.end),
          };
          
          // Debug log for timing issues
          if (process.env.DEBUG_ALERTS === 'true' && activePeriod.start) {
            console.log(`[RealMTAService] Alert timing: ${activePeriod.start.toISOString()} - ${activePeriod.end?.toISOString() || 'ongoing'}`);
          }
        }

        alerts.push({
          id: entity.id || `alert-${Date.now()}`,
          headerText,
          descriptionText,
          affectedRoutes,
          severity,
          informedEntities,
          activePeriod
        });
      }
      
      console.log(`[RealMTAService] Parsed ${alerts.length} service alerts`);
      
      if (process.env.DEBUG_ALERTS === 'true') {
        console.log(`[RealMTAService] Alert source: GTFS-RT feed (${alerts.length} alerts loaded)`);
      }
      
      return alerts;
      
    } catch (error) {
      console.error('[RealMTAService] Error parsing alerts protobuf:', error);
      return [];
    }
  }

  /**
   * Get service alerts filtered for specific subway lines
   * Only returns currently active alerts
   */
  async getServiceAlertsForLines(lines: string[]): Promise<ServiceAlert[]> {
    const allAlerts = await this.getActiveServiceAlerts();
    
    return allAlerts.filter(alert => 
      alert.affectedRoutes.some(route => lines.includes(route))
    );
  }

  /**
   * Get service alerts filtered for specific direction (0=outbound, 1=inbound)
   * Only returns currently active alerts
   */
  async getServiceAlertsForDirection(lines: string[], direction: 0 | 1): Promise<ServiceAlert[]> {
    const allAlerts = await this.getActiveServiceAlerts();
    
    return allAlerts.filter(alert => {
      // Check if alert affects any of the specified lines
      const affectsLines = alert.affectedRoutes.some(route => lines.includes(route));
      if (!affectsLines) return false;
      
      // Check if alert specifies direction and if it matches
      const hasDirectionFilter = alert.informedEntities.some(entity => 
        entity.directionId === direction && entity.routeId && lines.includes(entity.routeId)
      );
      
      // If no direction specified in alert, include it (affects all directions)
      const hasNoDirectionFilter = alert.informedEntities.some(entity => 
        entity.directionId === undefined && entity.routeId && lines.includes(entity.routeId)
      );
      
      return hasDirectionFilter || hasNoDirectionFilter;
    });
  }

  /**
   * Get service alerts filtered for specific stations
   * Only returns currently active alerts
   */
  async getServiceAlertsForStations(stationIds: string[]): Promise<ServiceAlert[]> {
    const allAlerts = await this.getActiveServiceAlerts();
    
    return allAlerts.filter(alert => 
      alert.informedEntities.some(entity => 
        entity.stopId && stationIds.some(stationId => 
          entity.stopId === stationId || 
          entity.stopId === `${stationId}N` || 
          entity.stopId === `${stationId}S`
        )
      )
    );
  }

  /**
   * Get service alerts for specific commute route
   * Filters by lines, direction, and stations on the route
   * Uses enhanced time-based filtering that includes station-skipping alerts
   */
  async getServiceAlertsForCommute(
    lines: string[], 
    direction: 0 | 1, 
    stationIds: string[] = []
  ): Promise<ServiceAlert[]> {
    if (process.env.DEBUG_ALERTS === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`[RealMTAService] Alert filtering step: lines=${lines.join(',')} direction=${direction} stations=${stationIds.join(',')}`);
    }
    
    // Use the prioritized alert method which handles station-skipping alerts properly
    const prioritizedAlerts = await this.getPrioritizedAlertsForCommute(lines, direction);
    
    // If no station filtering is requested, return all prioritized alerts
    if (stationIds.length === 0) {
      if (process.env.DEBUG_ALERTS === 'true') {
        console.log(`[RealMTAService] Alert statistics: ${prioritizedAlerts.length} total alerts (no station filtering)`);
      }
      return prioritizedAlerts;
    }
    
    // Apply station filtering only to non-station-skipping alerts
    const filteredAlerts = prioritizedAlerts.filter(alert => {
      // Station-skipping alerts always pass (they're critical)
      if (this.isStationSkippingAlert(alert)) {
        return true;
      }
      
      // Check if alert affects any of our stations
      const stationMatch = alert.informedEntities.some(entity => 
        entity.stopId && stationIds.some(stationId => 
          entity.stopId === stationId || 
          entity.stopId === `${stationId}N` || 
          entity.stopId === `${stationId}S`
        )
      );
      
      // Include alert if it has no station filter or affects our stations
      const hasNoStationFilter = alert.informedEntities.every(entity => !entity.stopId);
      return stationMatch || hasNoStationFilter;
    });
    
    if (process.env.DEBUG_ALERTS === 'true') {
      console.log(`[RealMTAService] Alert statistics: ${prioritizedAlerts.length} total → ${filteredAlerts.length} filtered for stations`);
    }
    
    return filteredAlerts;
  }

  /**
   * Check if a route is affected by service alerts and return alert information
   * Enhanced with user route awareness and severity escalation
   */
  async checkRouteForAlerts(route: Route, direction: 0 | 1): Promise<{
    hasAlerts: boolean;
    severity: 'info' | 'warning' | 'severe' | undefined;
    alerts: ServiceAlert[];
  }> {
    // Determine which lines this route uses
    const routeLines: string[] = [];
    const routeStations: string[] = [];
    
    // Extract lines and stations from route steps
    for (const step of route.steps) {
      if (step.line) {
        routeLines.push(step.line);
      }
      if (step.fromStation) {
        // Convert station names to station IDs
        const stationId = this.getStationIdFromName(step.fromStation);
        if (stationId) routeStations.push(stationId);
      }
      if (step.toStation) {
        const stationId = this.getStationIdFromName(step.toStation);
        if (stationId) routeStations.push(stationId);
      }
    }
    
    // Add default stations for F train routes
    if (routeLines.includes('F')) {
      routeStations.push('F21', 'D18'); // Carroll St, 23rd St
    }
    
    // Get alerts for this specific commute
    const alerts = await this.getServiceAlertsForCommute(
      routeLines.length > 0 ? routeLines : ['F'], // Default to F line
      direction,
      routeStations
    );

    // Enhanced severity analysis with user route awareness
    let highestSeverity: 'info' | 'warning' | 'severe' | undefined;
    const userRouteAlerts: ServiceAlert[] = [];
    
    if (alerts.length > 0) {
      for (const alert of alerts) {
        // Check if this alert affects user's route stations
        const affectsUserRoute = await this.isUserRouteAffected(alert, direction);
        
        // Get escalated severity based on alert content (e.g., station-skipping)
        const escalatedSeverity = this.getEscalatedSeverityForAlert(alert);
        
        if (affectsUserRoute) {
          userRouteAlerts.push(alert);
          // Escalate severity when user's route stations are affected
          if (alert.severity === 'info' || alert.severity === 'warning') {
            // User route impact escalates any alert to severe
            highestSeverity = 'severe';
          } else {
            highestSeverity = escalatedSeverity;
          }
        } else {
          // Non-user route alerts use escalated severity
          if (!highestSeverity || this.compareSeverity(escalatedSeverity, highestSeverity) > 0) {
            highestSeverity = escalatedSeverity;
          }
        }
      }
      
      // If we have user route alerts, use the escalated severity
      if (userRouteAlerts.length > 0 && highestSeverity !== 'severe') {
        highestSeverity = 'severe';
      }
    }
    
    return {
      hasAlerts: alerts.length > 0,
      severity: highestSeverity,
      alerts: userRouteAlerts.length > 0 ? userRouteAlerts : alerts // Prioritize user route alerts
    };
  }

  /**
   * Compare severity levels for sorting (higher number = more severe)
   */
  private compareSeverity(a: 'info' | 'warning' | 'severe', b: 'info' | 'warning' | 'severe'): number {
    const severityOrder = { 'info': 1, 'warning': 2, 'severe': 3 };
    return severityOrder[a] - severityOrder[b];
  }

  /**
   * Convert station name to station ID
   */
  private getStationIdFromName(stationName: string): string | null {
    const stationMappings: { [key: string]: string } = {
      'Carroll St': 'F21',
      '23rd St': 'D18', 
      'Jay St-MetroTech': 'A41',
      '23rd St-8th Ave': 'A30',
      '14th St-8th Ave': 'A31'
    };
    
    return stationMappings[stationName] || null;
  }

  /**
   * Enrich routes with service alert information
   */
  async enrichRoutesWithAlerts(routes: Route[], direction: 0 | 1): Promise<Route[]> {
    const enrichedRoutes: Route[] = [];
    
    for (const route of routes) {
      const alertInfo = await this.checkRouteForAlerts(route, direction);
      
      const enrichedRoute: Route = {
        ...route,
        hasServiceAlerts: alertInfo.hasAlerts,
        alertSeverity: alertInfo.severity
      };
      
      enrichedRoutes.push(enrichedRoute);
    }
    
    return enrichedRoutes;
  }

  /**
   * Get only currently active service alerts (filtered by activePeriod)
   */
  async getActiveServiceAlerts(): Promise<ServiceAlert[]> {
    const allAlerts = await this.getServiceAlerts();
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    const activeAlerts = allAlerts.filter(alert => {
      // If no activePeriod is specified, treat as always active
      if (!alert.activePeriod) {
        return true;
      }
      
      const { start, end } = alert.activePeriod;
      
      // Alert is active if:
      // 1. Currently active (between start and end)
      // 2. Starts soon (within next 30 minutes)
      const isCurrentlyActive = (!start || now >= start) && (!end || now <= end);
      const startsSoon = start && start > now && start <= soonThreshold;
      
      return isCurrentlyActive || startsSoon;
    });
    
    if (process.env.DEBUG_ALERTS === 'true') {
      console.log(`[RealMTAService] Filtering active alerts: ${allAlerts.length} total → ${activeAlerts.length} active`);
    }
    
    return activeAlerts;
  }

  /**
   * Get upcoming station-skipping alerts (future but within next 7 days)
   */
  async getUpcomingStationSkippingAlerts(): Promise<ServiceAlert[]> {
    const allAlerts = await this.getServiceAlerts();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return allAlerts.filter(alert => {
      // Must be a station-skipping alert
      if (!this.isStationSkippingAlert(alert)) {
        return false;
      }
      
      // Check if alert is in the future but within next 7 days
      if (alert.activePeriod?.start) {
        return alert.activePeriod.start > now && alert.activePeriod.start <= sevenDaysFromNow;
      }
      
      return false;
    });
  }

  /**
   * Get recently expired station-skipping alerts (expired within last 24 hours)
   */
  async getRecentStationSkippingAlerts(): Promise<ServiceAlert[]> {
    const allAlerts = await this.getServiceAlerts();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return allAlerts.filter(alert => {
      // Must be a station-skipping alert
      if (!this.isStationSkippingAlert(alert)) {
        return false;
      }
      
      // Check if alert expired within last 24 hours
      if (alert.activePeriod?.end) {
        return alert.activePeriod.end < now && alert.activePeriod.end >= twentyFourHoursAgo;
      }
      
      return false;
    });
  }

  /**
   * Get alerts relevant for a specific time window (in milliseconds)
   */
  async getRelevantAlertsForTimeWindow(windowMs: number): Promise<ServiceAlert[]> {
    const allAlerts = await this.getServiceAlerts();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs / 2);
    const windowEnd = new Date(now.getTime() + windowMs / 2);
    
    return allAlerts.filter(alert => {
      // If no activePeriod, include it (always relevant)
      if (!alert.activePeriod) {
        return true;
      }
      
      const { start, end } = alert.activePeriod;
      
      // Alert is relevant if it overlaps with our time window
      const alertStart = start || new Date(0);
      const alertEnd = end || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now if no end
      
      return alertStart <= windowEnd && alertEnd >= windowStart;
    });
  }

  /**
   * Get prioritized alerts for commute (station-skipping alerts first, then by severity)
   */
  async getPrioritizedAlertsForCommute(lines: string[], direction: 0 | 1): Promise<ServiceAlert[]> {
    const allAlerts = await this.getActiveServiceAlerts();
    const timeWindowAlerts = await this.getRelevantAlertsForTimeWindow(4 * 60 * 60 * 1000); // 4 hour window
    
    // Filter by lines and direction
    const relevantAlerts = allAlerts.filter(alert => {
      // Must affect at least one of our lines
      const affectsLines = alert.affectedRoutes.some(route => lines.includes(route));
      if (!affectsLines) return false;
      
      // Station-skipping alerts bypass both time window and direction filtering
      if (this.isStationSkippingAlert(alert)) {
        return true;
      }
      
      // Regular alerts must be within time window and match direction
      const inTimeWindow = timeWindowAlerts.some(ta => ta.id === alert.id);
      if (!inTimeWindow) return false;
      
      const directionMatch = alert.informedEntities.some(entity => {
        if (!entity.routeId || !lines.includes(entity.routeId)) return false;
        return entity.directionId === undefined || entity.directionId === direction;
      });
      
      return directionMatch;
    });
    
    // Sort by priority: station-skipping first, then by severity
    const sortedAlerts = relevantAlerts.sort((a, b) => {
      const aIsStationSkipping = this.isStationSkippingAlert(a);
      const bIsStationSkipping = this.isStationSkippingAlert(b);
      
      if (aIsStationSkipping && !bIsStationSkipping) return -1;
      if (!aIsStationSkipping && bIsStationSkipping) return 1;
      
      // If both are station-skipping or both are regular, sort by severity
      const severityOrder = { 'severe': 0, 'warning': 1, 'info': 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    if (process.env.DEBUG_ALERTS === 'true') {
      const stationSkippingCount = sortedAlerts.filter(a => this.isStationSkippingAlert(a)).length;
      const futureCount = allAlerts.length - timeWindowAlerts.length;
      const ongoingCount = timeWindowAlerts.length - stationSkippingCount;
      console.log(`[RealMTAService] Alert timing analysis: ${futureCount} future, ${ongoingCount} ongoing, ${stationSkippingCount} station-skipping`);
    }
    
    return sortedAlerts;
  }

  /**
   * Get all stations that could be part of user's possible routes
   * Includes F-direct, F→C transfer, and F→A→C triple-transfer routes
   */
  async getUserRouteStations(): Promise<string[]> {
    const stations = new Set<string>();

    // F-direct route stations: Carroll St → Jay St → 23rd St
    stations.add('F21'); // Carroll St (origin) - updated from F20
    stations.add('F24'); // Bergen St (intermediate on F line) - verify this exists
    stations.add('A41'); // Jay St-MetroTech (F line) - updated from F25
    stations.add('D18'); // 23rd St (F line destination) - updated from F18

    // F→C transfer route stations: Carroll St → Jay St → 23rd St-8th Ave
    stations.add('A41'); // Jay St-MetroTech (A/C line) - already added above
    stations.add('A30'); // 23rd St-8th Ave (C line destination) - updated from A23

    // F→A→C triple-transfer route stations: Carroll St → Jay St → 14th St → 23rd St-8th Ave
    stations.add('A31'); // 14th St-8th Ave (A/C transfer point) - updated from A27

    return Array.from(stations);
  }

  /**
   * Check if a service alert affects any of the user's possible route stations
   */
  async isUserRouteAffected(alert: ServiceAlert, direction: 0 | 1): Promise<boolean> {
    const userStations = await this.getUserRouteStations();
    
    // Check if alert affects any user route station in the relevant direction
    const isAffected = alert.informedEntities.some(entity => {
      // Check if it's the right direction (or no direction specified)
      const directionMatch = entity.directionId === undefined || entity.directionId === direction;
      
      // Check if it affects a user route station
      const stationMatch = entity.stopId && userStations.some(stationId => {
        // Match exact station ID or directional variants
        return entity.stopId === stationId ||
               entity.stopId === `${stationId}N` ||
               entity.stopId === `${stationId}S`;
      });

      return directionMatch && stationMatch;
    });
    
    if (process.env.DEBUG_ALERTS === 'true' && isAffected) {
      console.log(`[RealMTAService] Alert ${alert.id} relevance: affects user route (direction=${direction})`);
    }
    
    return isAffected;
  }

  /**
   * Check if an alert is about station skipping
   * These alerts are critical and should be shown regardless of direction
   */
  isStationSkippingAlert(alert: ServiceAlert): boolean {
    const text = `${alert.headerText} ${alert.descriptionText}`.toLowerCase();
    const isSkipping = text.includes('skip') || text.includes('not stopping');
    
    if (process.env.DEBUG_ALERTS === 'true' && isSkipping) {
      console.log(`[RealMTAService] Station-skipping alert detected: ${alert.id} - "${alert.headerText}"`);
    }
    
    return isSkipping;
  }

  /**
   * Get escalated severity for an alert based on its content
   */
  getEscalatedSeverityForAlert(alert: ServiceAlert): 'info' | 'warning' | 'severe' {
    if (this.isStationSkippingAlert(alert)) {
      if (process.env.DEBUG_ALERTS === 'true') {
        console.log(`[RealMTAService] Alert ${alert.id} escalated from ${alert.severity} to severe (station-skipping)`);
      }
      return 'severe';
    }
    return alert.severity;
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cacheManager.clearCache();
    console.log('[RealMTAService] Cleared cache manager');
  }

  /**
   * Fetch GTFS static data for calculating accurate transit times
   */
  private async fetchGTFSStaticData(line: string): Promise<any> {
    try {
      // For now, return mock data structure that matches expected format
      // TODO: Implement actual GTFS static data fetching
      const mockData = {
        stops: [
          { stop_id: 'F21', stop_name: 'Carroll St', stop_lat: 40.679371, stop_lon: -73.995148 },
          { stop_id: 'D18', stop_name: '23rd St', stop_lat: 40.742878, stop_lon: -73.992821 }
        ],
        stop_times: [
          // Northbound trip: Carroll St → 23rd St
          { trip_id: 'F_TRIP_NORTH', stop_id: 'F21', stop_sequence: 1, arrival_time: '09:00:00', departure_time: '09:00:00' },
          { trip_id: 'F_TRIP_NORTH', stop_id: 'D18', stop_sequence: 6, arrival_time: '09:34:00', departure_time: '09:34:00' },
          // Southbound trip: 23rd St → Carroll St  
          { trip_id: 'F_TRIP_SOUTH', stop_id: 'D18', stop_sequence: 1, arrival_time: '17:00:00', departure_time: '17:00:00' },
          { trip_id: 'F_TRIP_SOUTH', stop_id: 'F21', stop_sequence: 6, arrival_time: '17:34:00', departure_time: '17:34:00' }
        ]
      };
      
      return mockData;
    } catch (error) {
      console.warn(`[RealMTAService] Failed to fetch GTFS static data for line ${line}:`, error);
      throw error;
    }
  }

  /**
   * Calculate transit time between two stops using GTFS static data
   */
  async calculateGTFSTransitTime(fromStopId: string, toStopId: string, line: string): Promise<number> {
    try {
      const gtfsData = await this.fetchGTFSStaticData(line);
      
      // Find a trip that includes both stops in the correct sequence
      const allTrips = new Set(gtfsData.stop_times.map((st: any) => st.trip_id));
      let fromStop: any = null;
      let toStop: any = null;
      
      // Look for a trip where fromStopId comes before toStopId in sequence
      for (const tripId of allTrips) {
        const tripStops = gtfsData.stop_times.filter((st: any) => st.trip_id === tripId);
        const fromStopInTrip = tripStops.find((st: any) => st.stop_id === fromStopId);
        const toStopInTrip = tripStops.find((st: any) => st.stop_id === toStopId);
        
        if (fromStopInTrip && toStopInTrip && fromStopInTrip.stop_sequence < toStopInTrip.stop_sequence) {
          fromStop = fromStopInTrip;
          toStop = toStopInTrip;
          break;
        }
      }
      
      if (!fromStop || !toStop) {
        console.warn(`[RealMTAService] Could not find GTFS data for ${fromStopId} to ${toStopId} on line ${line}`);
        return this.getFallbackTransitTime(fromStopId, toStopId, line);
      }
      
      // Calculate time difference in minutes
      const fromTime = this.parseGTFSTime(fromStop.departure_time);
      const toTime = this.parseGTFSTime(toStop.arrival_time);
      const transitTimeMinutes = Math.round((toTime - fromTime) / (1000 * 60));
      
      console.log(`[RealMTAService] GTFS transit time ${fromStopId} → ${toStopId} (${line}): ${transitTimeMinutes} minutes`);
      return transitTimeMinutes;
      
    } catch (error) {
      console.warn(`[RealMTAService] GTFS transit time calculation failed for ${fromStopId} to ${toStopId}:`, error);
      return this.getFallbackTransitTime(fromStopId, toStopId, line);
    }
  }

  /**
   * Parse GTFS time format (HH:MM:SS) to Date object
   */
  private parseGTFSTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const today = new Date();
    const timeDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
    return timeDate.getTime();
  }

  /**
   * Get fallback transit time when GTFS data is unavailable
   */
  private getFallbackTransitTime(fromStopId: string, toStopId: string, line: string): number {
    // Fallback to segment-based calculation or reasonable estimates
    if (fromStopId === 'F21' && toStopId === 'D18' && line === 'F') {
      // Carroll St to 23rd St direct F train (northbound) - use realistic estimate instead of hardcoded 18
      return 34; // Based on actual NYC subway timing
    }
    
    if (fromStopId === 'D18' && toStopId === 'F21' && line === 'F') {
      // 23rd St to Carroll St direct F train (southbound) - use realistic estimate
      return 34; // Same timing in reverse
    }
    
    // Default fallback for unknown routes
    return 25;
  }
}