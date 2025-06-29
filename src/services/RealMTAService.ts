import { StaticLocationProvider, LocationProvider } from './LocationService';
import { StationMappingService } from './StationMappingService';

export interface Route {
  id: number;
  arrivalTime: string;
  duration: string;
  method: string;
  details: string;
  transfers?: number;
  walkingDistance?: string;
  walkingToTransit?: number;
  isRealTimeData: boolean;
  confidence?: 'high' | 'medium' | 'low';
  startingStation?: string;
  endingStation?: string;
  waitTime?: number; // minutes to wait at station for next train
  nextTrainDeparture?: string; // time of next train departure
  finalWalkingTime?: number; // minutes to walk from ending station to destination
  // Transfer-specific fields
  transferStation?: string;
  transferWalkingTime?: number;
  secondWaitTime?: number;
  secondTrainDeparture?: string; // time of second train departure for transfers
  // Next train departures for the first station
  nextDepartures?: NextTrainDeparture[];
  // Detailed timing breakdown for UI display
  transitTime?: number; // actual train travel time in minutes
  firstTransitTime?: number; // first leg travel time for transfers
  secondTransitTime?: number; // second leg travel time for transfers
  transferWaitTime?: number; // time between trains during transfer
}

export interface GTFSData {
  routes: Route[];
  lastUpdated: Date;
  isRealData: boolean;
  serviceAlerts?: ServiceAlert[];
}

export interface ServiceAlert {
  alertText: string;
  affectedRoutes: string[];
  severity: 'info' | 'warning' | 'severe';
  activeUntil?: Date;
}

interface StopTimeUpdate {
  stopId: string;
  stopSequence: number;
  arrivalTime?: number;
  departureTime?: number;
  delay?: number;
}

export interface NextTrainDeparture {
  trainLine: string;
  departureTime: string;
  minutesAway: number;
}

export class RealMTAService {
  private readonly locationProvider: LocationProvider;
  
  // Public MTA GTFS-RT feed URLs (no authentication required)
  private readonly GTFS_RT_FEEDS = {
    subway: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    subwayBDFM: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    subwayG: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    subwayJZ: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    subwayNQRW: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    subway123456S: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs', // Main feed includes 1234567S
    subwayL: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    bus: 'https://bustime.mta.info/api/siri/vehicle-monitoring.pb?key=126eec8e-0ee7-4b50-a84c-5d11aaaef4f9', // Bus real-time feed with API key
    alerts: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts'
  };

  constructor(locationProvider?: LocationProvider) {
    this.locationProvider = locationProvider || new StaticLocationProvider();
  }

  async fetchRealTimeData(): Promise<GTFSData> {
    try {
      // Fetch real-time subway data from multiple feeds
      const routes = await this.fetchAllSubwayRoutes();
      
      // Fetch service alerts
      const alerts = await this.fetchServiceAlerts();

      return {
        routes,
        lastUpdated: new Date(),
        isRealData: true,
        serviceAlerts: alerts
      };
    } catch (error) {
      throw new Error(`Failed to fetch MTA GTFS data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    try {
      const gtfsData = await this.fetchRealTimeData();
      return gtfsData.routes.sort((a, b) => {
        // Sort by duration (shortest travel time first)
        const durationA = parseInt(a.duration.replace(' min', ''));
        const durationB = parseInt(b.duration.replace(' min', ''));
        return durationA - durationB;
      });
    } catch (error) {
      throw new Error(`Unable to calculate routes: ${error instanceof Error ? error.message : 'MTA data unavailable'}`);
    }
  }

  async fetchServiceAlerts(): Promise<ServiceAlert[]> {
    try {
      const alertsData = await this.fetchGTFSRealtimeFeed(this.GTFS_RT_FEEDS.alerts);
      return this.parseServiceAlerts(alertsData);
    } catch (error) {
      throw new Error(`Failed to fetch MTA service alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchGTFSRealtimeFeed(url: string, retryCount: number = 0): Promise<any> {
    console.log(`[DEBUG] Fetching GTFS feed from: ${url}`);
    
    try {
      // Public MTA feeds - no authentication required
      const response = await fetch(url);
      console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
      
      // Log all headers for debugging
      const headers: { [key: string]: string } = {};
      try {
        if (response.headers && typeof response.headers.forEach === 'function') {
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (response.headers && typeof response.headers.get === 'function') {
          // Handle mock headers that only have get method
          const commonHeaders = ['content-type', 'content-length', 'cache-control', 'date'];
          commonHeaders.forEach(key => {
            const value = response.headers.get(key);
            if (value) headers[key] = value;
          });
        }
      } catch (headerError) {
        console.log(`[DEBUG] Could not read headers:`, headerError);
      }
      console.log(`[DEBUG] Response headers:`, headers);

      if (!response.ok) {
        if (response.status === 503) {
          console.error(`[DEBUG] MTA service unavailable (503) for: ${url}`);
          throw new Error('MTA GTFS service is temporarily unavailable.');
        }
        console.error(`[DEBUG] MTA API error for ${url}: ${response.status} ${response.statusText}`);
        throw new Error(`MTA API error: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers?.get?.('content-type') || '';
      if (contentType.includes('text/html')) {
        console.error(`[DEBUG] Invalid content type for ${url}: ${contentType}`);
        throw new Error(`Invalid content type: expected protobuf, got ${contentType}`);
      }

      const buffer = await response.arrayBuffer();
      console.log(`[DEBUG] Received buffer size: ${buffer.byteLength} bytes`);
      
      // Validate buffer is not empty
      if (buffer.byteLength === 0) {
        console.error(`[DEBUG] Empty response from ${url}`);
        throw new Error('Empty response from MTA feed');
      }
      
      // Validate buffer looks like protobuf (basic check)
      const uint8Array = new Uint8Array(buffer);
      
      // Enhanced debugging: log first bytes and text representation
      console.log(`[DEBUG] First 50 bytes:`, Array.from(uint8Array.slice(0, 50)));
      const textPreview = new TextDecoder().decode(uint8Array.slice(0, 200));
      console.log(`[DEBUG] Response preview as text:`, textPreview);
      
      // More robust HTML/XML detection
      const isHTML = textPreview.includes('<html') || 
                     textPreview.includes('<!DOCTYPE') ||
                     textPreview.includes('<title>') ||
                     textPreview.includes('<body>') ||
                     (uint8Array[0] === 0x3C && // Starts with <
                      (uint8Array[1] === 0x21 || // <!
                       uint8Array[1] === 0x68 || // <h
                       uint8Array[1] === 0x48)); // <H
      
      const isXML = textPreview.includes('<?xml') || 
                    textPreview.includes('<Error>') ||
                    textPreview.includes('<Code>NoSuchKey</Code>');
      
      if (isHTML || isXML) {
        console.error(`[DEBUG] Response appears to be ${isXML ? 'XML' : 'HTML'}, not protobuf`);
        console.error(`[DEBUG] Content preview:`, textPreview);
        console.error(`[DEBUG] Failed URL:`, url);
        
        // Check for specific XML error messages
        if (textPreview.includes('NoSuchKey')) {
          throw new Error(`Invalid MTA feed URL: ${url} - The specified feed does not exist`);
        }
        
        throw new Error(`Failed to parse GTFS-RT data format: received ${isXML ? 'XML' : 'HTML'} instead of protobuf data`);
      }
      
      // Parse GTFS-RT Protocol Buffer data
      try {
        const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(uint8Array);
        console.log(`[DEBUG] Successfully parsed GTFS feed with ${feed.entity?.length || 0} entities`);
        return feed;
      } catch (parseError) {
        console.error(`[DEBUG] Failed to parse GTFS data from ${url}:`, parseError);
        
        // Retry logic for transient failures
        if (retryCount < 1) {
          console.log(`[DEBUG] Retrying fetch for ${url} (attempt ${retryCount + 2})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return this.fetchGTFSRealtimeFeed(url, retryCount + 1);
        }
        
        throw new Error(`Failed to parse GTFS-RT data format from feed: ${url}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to parse GTFS-RT')) {
        throw error; // Re-throw parse errors
      }
      // Wrap other errors
      throw new Error(`Failed to fetch from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchAllSubwayRoutes(): Promise<Route[]> {
    const routes: Route[] = [];
    const failedFeeds: string[] = [];
    
    // Get walking times to transit options
    const walkingTimes = {
      'R': await this.locationProvider.getWalkingTimeToTransit('R'),
      'F': await this.locationProvider.getWalkingTimeToTransit('F'),
      'B61': await this.locationProvider.getWalkingTimeToTransit('B61'),
      '4': await this.locationProvider.getWalkingTimeToTransit('4')
    };

    // Fetch from relevant feeds based on your commute routes
    const feedsToCheck = [
      { feed: this.GTFS_RT_FEEDS.subwayNQRW, routes: ['R', 'N', 'Q', 'W'], name: 'NQRW' },
      { feed: this.GTFS_RT_FEEDS.subwayBDFM, routes: ['F'], name: 'BDFM' },
      { feed: this.GTFS_RT_FEEDS.subway123456S, routes: ['4'], name: '123456S' },
      { feed: this.GTFS_RT_FEEDS.subway, routes: ['A', 'C'], name: 'ACE' },
      { feed: this.GTFS_RT_FEEDS.subwayL, routes: ['L'], name: 'L' },
    ];

    let routeId = 1;
    
    // First, collect all GTFS data
    const allGtfsData: { [key: string]: any } = {};
    const workingFeeds: typeof feedsToCheck = [];
    
    for (const feedInfo of feedsToCheck) {
      try {
        const gtfsData = await this.fetchGTFSRealtimeFeed(feedInfo.feed);
        feedInfo.routes.forEach(route => {
          allGtfsData[route] = gtfsData;
        });
        workingFeeds.push(feedInfo);
      } catch (error) {
        console.warn(`Failed to fetch from ${feedInfo.name} feed (${feedInfo.feed}):`, error);
        failedFeeds.push(feedInfo.name);
        
        // If it's an HTML response error, log additional info
        if (error instanceof Error && error.message.includes('HTML')) {
          console.error(`[DEBUG] ${feedInfo.name} feed returned HTML instead of protobuf data`);
        }
      }
    }
    
    // Log summary of feed status
    console.log(`[DEBUG] Feed status - Working: ${workingFeeds.map(f => f.name).join(', ') || 'none'}, Failed: ${failedFeeds.join(', ') || 'none'}`);
    
    // Build direct routes from working feeds only
    for (const feedInfo of workingFeeds.slice(0, 3)) { // Only first 3 are direct routes
      if (allGtfsData[feedInfo.routes[0]]) { // Check if we have data for this route
        const gtfsData = allGtfsData[feedInfo.routes[0]];
        const relevantTrips = this.findRelevantTrips(gtfsData, feedInfo.routes);
        
        console.log(`[DEBUG] Feed ${feedInfo.name}: found ${relevantTrips.length} relevant trips for routes ${feedInfo.routes.join(', ')}`);
        
        for (const trip of relevantTrips) {
          const route = await this.buildRouteFromTrip(trip, walkingTimes, routeId++, gtfsData);
          if (route) {
            routes.push(route);
          }
        }
      } else {
        console.log(`[DEBUG] No GTFS data available for feed ${feedInfo.name} routes ${feedInfo.routes.join(', ')}`);
      }
    }
    
    // Build transfer routes
    const transferRoutes = StationMappingService.getTransferRoutes();
    for (const [routeKey, mapping] of Object.entries(transferRoutes)) {
      const route = await this.buildTransferRoute(routeKey, mapping, walkingTimes, allGtfsData, routeId++);
      if (route) {
        routes.push(route);
      }
    }

    // Add bus routes
    try {
      const busData = await this.fetchGTFSRealtimeFeed(this.GTFS_RT_FEEDS.bus);
      const busTrips = this.findRelevantBusTrips(busData, ['B61']);
      
      for (const trip of busTrips) {
        const route = await this.buildBusRouteFromTrip(trip, walkingTimes, routeId++);
        if (route) {
          routes.push(route);
        }
      }
    } catch (error) {
      console.warn('Bus data unavailable:', error);
    }

    if (routes.length === 0) {
      console.warn('[WARN] No routes built from GTFS data - creating estimated routes');
      
      // Create estimated routes when GTFS feeds are unavailable
      const estimatedRoutes = this.createEstimatedRoutes(walkingTimes, routeId);
      routes.push(...estimatedRoutes);
      
      if (routes.length === 0) {
        throw new Error('No real-time route data available for your commute. MTA feeds may be experiencing issues.');
      }
    }

    
    return routes;
  }

  private async calculateRoutesFromGTFS(gtfsData: any): Promise<Route[]> {
    const routes: Route[] = [];
    const currentTime = new Date();

    // Get walking times to transit options
    const walkingTimes = {
      'R': await this.locationProvider.getWalkingTimeToTransit('R'),
      'F': await this.locationProvider.getWalkingTimeToTransit('F'),
      'B61': await this.locationProvider.getWalkingTimeToTransit('B61'),
      '4': await this.locationProvider.getWalkingTimeToTransit('4')
    };

    // Process GTFS-RT data to find relevant trips
    const relevantTrips = this.findRelevantTrips(gtfsData, ['R', 'F', '4']);
    
    let routeId = 1;
    for (const trip of relevantTrips) {
      const route = await this.buildRouteFromTrip(trip, walkingTimes, routeId++);
      if (route) {
        routes.push(route);
      }
    }

    // Add bus routes if available
    try {
      const busData = await this.fetchGTFSRealtimeFeed(this.GTFS_RT_FEEDS.bus);
      const busTrips = this.findRelevantBusTrips(busData, ['B61']);
      
      for (const trip of busTrips) {
        const route = await this.buildBusRouteFromTrip(trip, walkingTimes, routeId++);
        if (route) {
          routes.push(route);
        }
      }
    } catch (error) {
      console.warn('Bus data unavailable:', error);
    }

    if (routes.length === 0) {
      throw new Error('No real-time route data available for your commute. MTA feeds may be experiencing issues.');
    }

    return routes;
  }

  private findRelevantTrips(gtfsData: any, routeIds: string[]): any[] {
    const trips: any[] = [];
    
    if (!gtfsData.entity) {
      return trips;
    }

    for (const entity of gtfsData.entity) {
      if (entity.tripUpdate && entity.tripUpdate.trip) {
        const trip = entity.tripUpdate.trip;
        if (trip.routeId && routeIds.includes(trip.routeId)) {
          trips.push(entity.tripUpdate);
        }
      }
    }

    return trips.slice(0, 4); // Limit to 4 most relevant trips
  }

  private findRelevantBusTrips(busData: any, routeIds: string[]): any[] {
    // Similar logic for bus trips
    return this.findRelevantTrips(busData, routeIds);
  }

  private async buildRouteFromTrip(trip: any, walkingTimes: any, routeId: number, allGtfsData?: any): Promise<Route | null> {
    try {
      const routeIdStr = trip.trip.routeId;
      console.log(`[DEBUG] Building route for ${routeIdStr} train`);
      
      // Proceed if we have basic trip data
      const walkingTime = walkingTimes[routeIdStr] || 30;
      console.log(`[DEBUG] Walking time to ${routeIdStr}: ${walkingTime} min`);
      
      // Get station information including final walking details
      const stationInfo = this.getStationInfo(routeIdStr);
      console.log(`[DEBUG] Station info for ${routeIdStr}:`, {
        startingStation: stationInfo.startingStation,
        endingStation: stationInfo.endingStation,
        finalWalkingDistance: stationInfo.finalWalkingDistance,
        finalWalkingTime: stationInfo.finalWalkingTime
      });
      
      // Calculate wait time and next train departure - will use GTFS or fallback
      const waitInfo = this.calculateWaitTimeFromGTFS(routeIdStr, walkingTime, trip, allGtfsData);
      if (!waitInfo) {
        console.error(`[ERROR] Cannot calculate wait time for ${routeIdStr} - even fallback failed`);
        return null;
      }
      
      // Use station-specific final walking time
      const finalWalkingTime = stationInfo.finalWalkingTime;
      
      // Calculate transit time - will use GTFS or fallback
      const transitTime = this.calculateTransitTimeFromGTFS(trip);
      
      // Determine if this route is using real-time data
      const isRealTimeData = !!(trip?.stopTimeUpdate && allGtfsData);
      console.log(`[DEBUG] Route ${routeIdStr} using real-time data: ${isRealTimeData}`);
      
      const totalTime = walkingTime + waitInfo.waitTime + transitTime + finalWalkingTime;
      
      console.log(`[DEBUG] Time breakdown for ${routeIdStr}:`, {
        walkingToStation: walkingTime,
        waitTime: waitInfo.waitTime,
        transitTime: transitTime,
        finalWalkingTime: finalWalkingTime,
        totalTime: totalTime
      });
      
      // Calculate arrival time based on total journey time
      const currentTime = new Date();
      const arrivalTime = new Date(currentTime.getTime() + totalTime * 60000);
      const arrivalTimeStr = arrivalTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      // Get next 3 departures for the first station
      const nextDepartures = isRealTimeData && allGtfsData ? this.getNext3Departures(
        stationInfo.startingStation,
        routeIdStr,
        allGtfsData,
        new Date()
      ) : this.createEstimatedNextDepartures(routeIdStr, new Date(), walkingTime);

      const route = {
        id: routeId,
        arrivalTime: arrivalTimeStr,
        duration: `${totalTime} min`,
        method: `${routeIdStr} train + Walk`,
        details: `Walk ${walkingTime} min to ${routeIdStr} train, ${routeIdStr} train to destination, walk ${finalWalkingTime} min to work`,
        transfers: this.countTransfers(trip),
        walkingDistance: stationInfo.finalWalkingDistance,
        walkingToTransit: walkingTime,
        isRealTimeData: isRealTimeData,
        confidence: isRealTimeData ? 'high' as const : 'medium' as const,
        startingStation: stationInfo.startingStation,
        endingStation: stationInfo.endingStation,
        waitTime: waitInfo.waitTime,
        nextTrainDeparture: waitInfo.nextTrainDeparture,
        finalWalkingTime: finalWalkingTime,
        transitTime: transitTime, // Add transit time for UI display
        nextDepartures: nextDepartures // Add next 3 departures for pills
      };
      
      console.log(`[DEBUG] Built route using real GTFS data:`, route);
      return route;
    } catch (error) {
      console.error(`[ERROR] Failed to build route from trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  private getStationInfo(routeId: string): { startingStation: string; endingStation: string; finalWalkingDistance: string; finalWalkingTime: number } {
    return StationMappingService.getStationMapping(routeId);
  }

  private calculateWaitTimeFromGTFS(routeId: string, walkingTime: number, trip: any, allGtfsData: any): { waitTime: number; nextTrainDeparture: string } | null {
    // Try to use real GTFS data first
    if (trip?.stopTimeUpdate && allGtfsData) {
      const currentTime = new Date();
      const arrivalAtStation = new Date(currentTime.getTime() + walkingTime * 60000);
      
      // Find the next departure from real GTFS data
      for (const stopUpdate of trip.stopTimeUpdate) {
        if (stopUpdate.departure?.time) {
          const departureTime = new Date(stopUpdate.departure.time * 1000);
          
          if (departureTime > arrivalAtStation) {
            const waitTime = Math.round((departureTime.getTime() - arrivalAtStation.getTime()) / (60 * 1000));
            const nextTrainDeparture = departureTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            return {
              waitTime: Math.max(0, waitTime),
              nextTrainDeparture
            };
          }
        }
      }
    }
    
    // Fallback: Provide frequency-based estimate with clear indication this is not real-time
    const trainFrequencies: { [key: string]: number } = {
      'F': 6, 'R': 8, '4': 5, 'N': 8, 'Q': 7, 'W': 10, 'A': 6, 'C': 8, 'L': 5
    };
    
    const frequency = trainFrequencies[routeId] || 8;
    const estimatedWait = Math.floor(Math.random() * frequency) + 2; // 2-8 minute wait
    const currentTime = new Date();
    const arrivalAtStation = new Date(currentTime.getTime() + walkingTime * 60000);
    const nextTrainTime = new Date(arrivalAtStation.getTime() + estimatedWait * 60000);
    
    return {
      waitTime: estimatedWait,
      nextTrainDeparture: nextTrainTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  }

  private calculateFinalWalkingTime(distance: string): number {
    // Calculate walking time based on distance
    // Average walking speed is about 3 mph (20 minutes per mile)
    
    if (distance.includes('mi')) {
      const miles = parseFloat(distance.replace(' mi', ''));
      return Math.round(miles * 20); // 20 minutes per mile
    }
    
    if (distance.includes('ft')) {
      const feet = parseFloat(distance.replace(' ft', ''));
      const miles = feet / 5280; // Convert feet to miles
      return Math.round(miles * 20);
    }
    
    // Default to 8 minutes for 0.4 miles
    return 8;
  }

  private async buildBusRouteFromTrip(trip: any, walkingTimes: any, routeId: number): Promise<Route | null> {
    try {
      // REQUIRE real GTFS data - no fallbacks
      if (!trip?.stopTimeUpdate) {
        console.error(`[ERROR] Cannot build bus route - missing GTFS data`);
        return null;
      }
      
      const walkingTime = walkingTimes['B61'] || 5;
      const arrivalTime = this.calculateArrivalFromGTFS(trip);
      if (!arrivalTime) {
        console.error(`[ERROR] Cannot calculate bus arrival time - GTFS data incomplete`);
        return null;
      }
      
      const transitTime = this.calculateTransitTimeFromGTFS(trip);
      if (!transitTime) {
        console.error(`[ERROR] Cannot calculate bus transit time - GTFS data incomplete`);
        return null;
      }
      
      const totalTime = walkingTime + transitTime;
      
      return {
        id: routeId,
        arrivalTime,
        duration: `${totalTime} min`,
        method: 'Bus + Walk',
        details: `Walk ${walkingTime} min to B61 bus, B61 to destination`,
        transfers: 0,
        walkingDistance: '0.6 mi',
        walkingToTransit: walkingTime,
        isRealTimeData: true,
        confidence: this.assessDataConfidence(trip)
      };
    } catch (error) {
      console.error(`[ERROR] Failed to build bus route from trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  private calculateArrivalFromGTFS(trip: any): string | null {
    // REQUIRE real GTFS trip data - no fallbacks
    if (!trip?.stopTimeUpdate || trip.stopTimeUpdate.length === 0) {
      console.error(`[ERROR] Cannot calculate arrival time - missing GTFS stop time data`);
      return null;
    }
    
    // Find the last stop with arrival time
    const stopTimes = trip.stopTimeUpdate
      .filter((stu: any) => stu.arrival?.time)
      .sort((a: any, b: any) => b.stopSequence - a.stopSequence);
    
    if (stopTimes.length === 0) {
      console.error(`[ERROR] No arrival times found in GTFS data`);
      return null;
    }
    
    const finalArrival = new Date(stopTimes[0].arrival.time * 1000);
    return finalArrival.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private calculateTransitTimeFromGTFS(trip: any): number {
    // Try to use real GTFS trip data first
    if (trip?.stopTimeUpdate && trip.stopTimeUpdate.length >= 2) {
      // Get first and last stop times from trip
      const stopTimes = trip.stopTimeUpdate
        .filter((stu: any) => stu.departure?.time && stu.arrival?.time)
        .sort((a: any, b: any) => a.stopSequence - b.stopSequence);
      
      if (stopTimes.length >= 2) {
        const firstStop = stopTimes[0];
        const lastStop = stopTimes[stopTimes.length - 1];
        
        const transitTime = Math.round((lastStop.arrival.time - firstStop.departure.time) / 60);
        return Math.max(1, transitTime); // At least 1 minute
      }
    }
    
    // Fallback: Use route-based estimates
    const routeId = trip?.trip?.routeId || 'unknown';
    const transitTimes: { [key: string]: number } = {
      'R': 35, 'F': 28, '4': 25, 'B61': 42, 'G': 45, 'N': 32, 'Q': 30, 'W': 33, 'A': 30, 'C': 32, 'L': 25
    };
    
    return transitTimes[routeId] || 35; // Default 35 minutes
  }

  private createEstimatedRoutes(walkingTimes: any, startingRouteId: number): Route[] {
    console.log('[DEBUG] Creating estimated routes when GTFS feeds unavailable');
    const routes: Route[] = [];
    let routeId = startingRouteId;
    
    // Create estimated direct routes for main lines
    const routeConfigs = [
      { line: 'F', transitTime: 28, stationInfo: { startingStation: 'Carroll St', endingStation: '23rd St', finalWalkingDistance: '0.4 mi', finalWalkingTime: 8 } },
      { line: 'R', transitTime: 35, stationInfo: { startingStation: 'Union St', endingStation: '23rd St', finalWalkingDistance: '0.4 mi', finalWalkingTime: 8 } },
      { line: '4', transitTime: 25, stationInfo: { startingStation: 'Borough Hall', endingStation: '14th St-Union Sq', finalWalkingDistance: '0.5 mi', finalWalkingTime: 10 } }
    ];
    
    for (const config of routeConfigs) {
      const walkingTime = walkingTimes[config.line] || 30;
      const estimatedWait = Math.floor(Math.random() * 8) + 2; // 2-10 minute wait
      const totalTime = walkingTime + estimatedWait + config.transitTime + config.stationInfo.finalWalkingTime;
      
      const currentTime = new Date();
      const arrivalTime = new Date(currentTime.getTime() + totalTime * 60000);
      const nextTrainTime = new Date(currentTime.getTime() + walkingTime * 60000 + estimatedWait * 60000);
      
      // Create estimated next 3 departures for this line
      const nextDepartures = this.createEstimatedNextDepartures(config.line, currentTime, walkingTime);
      
      routes.push({
        id: routeId++,
        arrivalTime: arrivalTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: `${totalTime} min`,
        method: `${config.line} train + Walk`,
        details: `Walk ${walkingTime} min to ${config.line} train, ${config.line} train to destination, walk ${config.stationInfo.finalWalkingTime} min to work`,
        transfers: 0,
        walkingDistance: config.stationInfo.finalWalkingDistance,
        walkingToTransit: walkingTime,
        isRealTimeData: false, // Clearly marked as estimated
        confidence: 'low' as const, // Low confidence for estimates
        startingStation: config.stationInfo.startingStation,
        endingStation: config.stationInfo.endingStation,
        waitTime: estimatedWait,
        nextTrainDeparture: nextTrainTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        finalWalkingTime: config.stationInfo.finalWalkingTime,
        transitTime: config.transitTime, // Actual train travel time
        nextDepartures: nextDepartures // Add the next 3 departures for pills
      });
    }
    
    console.log(`[DEBUG] Created ${routes.length} estimated routes`);
    return routes;
  }

  private createEstimatedTransferRoute(
    departureTime: Date,
    startStation: string,
    endStation: string,
    firstRoute: string,
    secondRoute: string,
    transferStation: string,
    walkingTime: number,
    finalWalkingTime: number
  ): any {
    // Create estimated transfer route using frequency-based calculations
    const currentTime = new Date();
    
    // Estimate first train times
    const firstTrainFrequency = this.getTrainFrequency(firstRoute);
    const firstWaitTime = Math.floor(Math.random() * firstTrainFrequency) + 2;
    const firstTrainDeparture = new Date(currentTime.getTime() + walkingTime * 60000 + firstWaitTime * 60000);
    
    // Estimate travel time to transfer station
    const transitToTransferTime = this.getEstimatedTransitTime(firstRoute, startStation, transferStation);
    const transferArrival = new Date(firstTrainDeparture.getTime() + transitToTransferTime * 60000);
    
    // Add transfer walking time (typically 2-5 minutes)
    const transferWalkTime = Math.floor(Math.random() * 4) + 2; // 2-5 minutes
    const readyForSecondTrain = new Date(transferArrival.getTime() + transferWalkTime * 60000);
    
    // Estimate second train wait time
    const secondTrainFrequency = this.getTrainFrequency(secondRoute);
    const secondWaitTime = Math.floor(Math.random() * secondTrainFrequency) + 1;
    const secondTrainDeparture = new Date(readyForSecondTrain.getTime() + secondWaitTime * 60000);
    
    // Estimate travel time from transfer to destination
    const transitToDestinationTime = this.getEstimatedTransitTime(secondRoute, transferStation, endStation);
    const finalArrival = new Date(secondTrainDeparture.getTime() + transitToDestinationTime * 60000 + finalWalkingTime * 60000);
    
    const totalTravelTime = Math.round((finalArrival.getTime() - currentTime.getTime()) / (60 * 1000));
    
    return {
      firstTrainDeparture,
      transferArrival,
      secondTrainDeparture,
      finalArrival,
      totalTravelTime,
      transferWaitTime: secondWaitTime,
      // Detailed timing breakdown for UI display  
      firstTransitTime: transitToTransferTime,
      secondTransitTime: transitToDestinationTime
    };
  }

  private getTrainFrequency(route: string): number {
    const frequencies: { [key: string]: number } = {
      'F': 6, 'R': 8, '4': 5, 'N': 8, 'Q': 7, 'W': 10, 'A': 6, 'C': 8, 'L': 5
    };
    return frequencies[route] || 8;
  }

  private getEstimatedTransitTime(route: string, fromStation: string, toStation: string): number {
    // Estimated transit times for common segments
    const transitTimes: { [key: string]: number } = {
      // F train segments
      'F-Carroll St-Jay St-MetroTech': 12,
      'F-Carroll St-14th St-Union Sq': 20,
      'F-Carroll St-DeKalb Ave': 8,
      
      // Transfer station to destinations
      'A-Jay St-MetroTech-23rd St-8th Ave': 10,
      'C-Jay St-MetroTech-23rd St-8th Ave': 12,
      'L-14th St-Union Sq-8th Ave': 5,
      'N-DeKalb Ave-23rd St': 15,
      'Q-DeKalb Ave-23rd St': 14,
      
      // R train segments  
      'R-Union St-14th St-Union Sq': 15,
      'R-Union St-DeKalb Ave': 5,
    };
    
    const key = `${route}-${fromStation}-${toStation}`;
    return transitTimes[key] || 15; // Default 15 minutes
  }

  private createEstimatedNextDepartures(trainLine: string, currentTime: Date, walkingTime: number): NextTrainDeparture[] {
    const departures: NextTrainDeparture[] = [];
    const frequency = this.getTrainFrequency(trainLine);
    const arrivalAtStation = new Date(currentTime.getTime() + walkingTime * 60000);
    
    // Create 3 estimated departures based on train frequency
    for (let i = 0; i < 3; i++) {
      // Space out departures by frequency (with some variation)
      const baseWait = Math.floor(Math.random() * (frequency / 2)) + (i * frequency) + 2;
      const departureTime = new Date(arrivalAtStation.getTime() + baseWait * 60000);
      const minutesAway = Math.round((departureTime.getTime() - currentTime.getTime()) / (60 * 1000));
      
      departures.push({
        trainLine: trainLine,
        departureTime: departureTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        minutesAway: minutesAway
      });
    }
    
    return departures;
  }




  private countTransfers(trip: any): number {
    // Count transfers from trip data
    return 0; // Simplified - would analyze stop sequence
  }

  private assessDataConfidence(trip: any): 'high' | 'medium' | 'low' {
    // Assess confidence based on data freshness and completeness
    return 'high'; // Simplified assessment
  }

  private parseServiceAlerts(alertsData: any): ServiceAlert[] {
    const alerts: ServiceAlert[] = [];
    
    if (!alertsData.entity) {
      return alerts;
    }

    for (const entity of alertsData.entity) {
      if (entity.alert) {
        const alert = entity.alert;
        alerts.push({
          alertText: alert.headerText?.translation?.[0]?.text || 'Service alert',
          affectedRoutes: this.extractAffectedRoutes(alert),
          severity: this.mapAlertSeverity(alert),
          activeUntil: alert.activePeriod?.[0]?.end ? new Date(alert.activePeriod[0].end * 1000) : undefined
        });
      }
    }

    return alerts.slice(0, 5); // Limit to 5 most relevant alerts
  }

  private extractAffectedRoutes(alert: any): string[] {
    const routes: string[] = [];
    if (alert.informedEntity) {
      for (const entity of alert.informedEntity) {
        if (entity.routeId) {
          routes.push(entity.routeId);
        }
      }
    }
    return routes;
  }

  private mapAlertSeverity(alert: any): 'info' | 'warning' | 'severe' {
    // Map MTA alert severity to our severity levels
    return 'info'; // Simplified mapping
  }

  private parseTime(timeStr: string): Date {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    date.setHours(hour24, minutes, 0, 0);
    return date;
  }

  private async buildTransferRoute(
    routeKey: string,
    mapping: any,
    walkingTimes: any,
    allGtfsData: any,
    routeId: number
  ): Promise<Route | null> {
    try {
      console.log(`[DEBUG] Building transfer route: ${routeKey}`);
      
      // Parse the route key (e.g., "F→A" or "F→C")
      const [firstLine, secondLine] = routeKey.split('→');
      
      // Get walking time to first train
      const walkingTime = walkingTimes[firstLine] || 15;
      
      // Try to use real GTFS data first
      let preciseRoute = null;
      let isRealTimeData = false;
      
      if (allGtfsData && allGtfsData.length > 0) {
        preciseRoute = this.buildPreciseTransferRoute(
          new Date(),
          mapping.startingStation,
          mapping.endingStation,
          firstLine,
          secondLine,
          mapping.transferStation,
          allGtfsData, // GTFS data for first line
          allGtfsData  // GTFS data for second line (should filter by route)
        );
        
        if (preciseRoute) {
          isRealTimeData = true;
          console.log(`[DEBUG] Using real GTFS data for ${routeKey}`);
        }
      }
      
      // Fallback to estimated transfer route when GTFS data unavailable
      if (!preciseRoute) {
        console.warn(`[WARN] Creating estimated transfer route for ${routeKey} - GTFS data not available`);
        preciseRoute = this.createEstimatedTransferRoute(
          new Date(),
          mapping.startingStation,
          mapping.endingStation,
          firstLine,
          secondLine,
          mapping.transferStation,
          walkingTime,
          mapping.finalWalkingTime
        );
        isRealTimeData = false;
      }
      
      console.log(`[DEBUG] Using real GTFS data for ${routeKey}:`, {
        firstTrainDeparture: preciseRoute.firstTrainDeparture,
        transferArrival: preciseRoute.transferArrival,
        secondTrainDeparture: preciseRoute.secondTrainDeparture,
        finalArrival: preciseRoute.finalArrival,
        totalTime: preciseRoute.totalTravelTime,
        transferWait: preciseRoute.transferWaitTime
      });
      
      // Get next 3 departures for the first station using real data (if available)
      const nextDepartures = isRealTimeData ? this.getNext3Departures(
        mapping.startingStation,
        firstLine,
        allGtfsData,
        new Date()
      ) : this.createEstimatedNextDepartures(firstLine, new Date(), walkingTime);
      
      
      return {
        id: routeId,
        arrivalTime: preciseRoute.finalArrival.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        duration: `${preciseRoute.totalTravelTime} min`,
        method: `${routeKey} trains + Walk`,
        details: `Walk ${walkingTime} min to ${firstLine}, transfer at ${mapping.transferStation} to ${secondLine}, walk ${mapping.finalWalkingTime} min to work`,
        transfers: 1,
        walkingDistance: mapping.finalWalkingDistance,
        walkingToTransit: walkingTime,
        isRealTimeData: isRealTimeData,
        confidence: isRealTimeData ? 'high' as const : 'medium' as const,
        startingStation: mapping.startingStation,
        endingStation: mapping.endingStation,
        waitTime: Math.round((preciseRoute.firstTrainDeparture.getTime() - new Date().getTime() - walkingTime * 60 * 1000) / (60 * 1000)),
        nextTrainDeparture: preciseRoute.firstTrainDeparture.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        finalWalkingTime: mapping.finalWalkingTime,
        // Additional transfer-specific data with real times
        transferStation: mapping.transferStation,
        transferWalkingTime: mapping.transferWalkingTime,
        secondWaitTime: preciseRoute.transferWaitTime,
        nextDepartures: nextDepartures.length > 0 ? nextDepartures : undefined,
        // Add second train departure time
        secondTrainDeparture: preciseRoute.secondTrainDeparture.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        // Detailed timing breakdown for UI display
        firstTransitTime: preciseRoute.firstTransitTime || Math.round((preciseRoute.transferArrival.getTime() - preciseRoute.firstTrainDeparture.getTime()) / (60 * 1000)),
        secondTransitTime: preciseRoute.secondTransitTime || Math.round((preciseRoute.finalArrival.getTime() - preciseRoute.secondTrainDeparture.getTime()) / (60 * 1000)),
        transferWaitTime: preciseRoute.transferWaitTime
      };
    } catch (error) {
      console.error(`[ERROR] Failed to build transfer route ${routeKey}:`, error);
      return null;
    }
  }




  private parseStopTimeUpdates(tripUpdate: any): StopTimeUpdate[] {
    if (!tripUpdate.stopTimeUpdate) return [];
    
    return tripUpdate.stopTimeUpdate.map((stu: any) => ({
      stopId: stu.stopId,
      stopSequence: stu.stopSequence || 0,
      arrivalTime: stu.arrival?.time,
      departureTime: stu.departure?.time,
      delay: stu.arrival?.delay || stu.departure?.delay || 0
    }));
  }

  private static readonly STOP_ID_MAPPINGS = {
    'Carroll St': { 'F': 'F18' },
    'Jay St-MetroTech': { 'F': 'F20', 'A': 'A41', 'C': 'A41' },
    '23rd St': { 'F': 'F22' },
    '23rd St-8th Ave': { 'A': 'A24', 'C': 'A24' },
    'Union St': { 'R': 'R25', 'N': 'R25' },
    'Borough Hall': { '4': '420', '5': '420' },
    '14th St-Union Sq': { '4': '635', '5': '635', '6': '635' }
  };

  private getStopId(stationName: string, routeId: string): string | null {
    const stationMappings = RealMTAService.STOP_ID_MAPPINGS[stationName as keyof typeof RealMTAService.STOP_ID_MAPPINGS];
    if (!stationMappings) return null;
    return (stationMappings as any)[routeId] || null;
  }

  private findNextDepartureAfter(trips: any[], stationName: string, afterTime: Date): any | null {
    const stopId = this.getStopId(stationName, trips[0]?.trip?.routeId);
    if (!stopId) return null;
    
    for (const trip of trips) {
      const stopTime = trip.stopTimes.find((st: StopTimeUpdate) => st.stopId === stopId);
      if (stopTime?.departureTime) {
        const departureTime = new Date(stopTime.departureTime * 1000);
        if (departureTime > afterTime) {
          return {
            trip: trip.trip,
            departureTime,
            stopTimes: trip.stopTimes
          };
        }
      }
    }
    return null;
  }

  private buildPreciseTransferRoute(
    departureTime: Date,
    startStation: string,
    endStation: string, 
    firstRoute: string,
    secondRoute: string,
    transferStation: string,
    firstRouteTrips: any[],
    secondRouteTrips: any[]
  ): any {
    // Calculate walk time to first train (15 minutes as specified)
    const walkToStationTime = new Date(departureTime.getTime() + 15 * 60 * 1000);
    
    // Find next departure after walking to station
    const firstTrain = this.findNextDepartureAfter(firstRouteTrips, startStation, walkToStationTime);
    if (!firstTrain) return null;
    
    // Find arrival time at transfer station
    const transferStopId = this.getStopId(transferStation, firstRoute);
    const transferStopTime = firstTrain.stopTimes.find((st: StopTimeUpdate) => st.stopId === transferStopId);
    if (!transferStopTime?.arrivalTime) return null;
    
    const transferArrival = new Date(transferStopTime.arrivalTime * 1000);
    
    // Add transfer time (30 seconds as specified)
    const transferComplete = new Date(transferArrival.getTime() + 30 * 1000);
    
    // Find next second train after transfer
    const secondTrain = this.findNextDepartureAfter(secondRouteTrips, transferStation, transferComplete);
    if (!secondTrain) return null;
    
    // Find final arrival time
    const finalStopId = this.getStopId(endStation, secondRoute);
    const finalStopTime = secondTrain.stopTimes.find((st: StopTimeUpdate) => st.stopId === finalStopId);
    if (!finalStopTime?.arrivalTime) return null;
    
    const finalArrival = new Date(finalStopTime.arrivalTime * 1000);
    
    return {
      firstTrainDeparture: firstTrain.departureTime,
      transferArrival,
      secondTrainDeparture: secondTrain.departureTime,
      finalArrival,
      totalTravelTime: Math.round((finalArrival.getTime() - departureTime.getTime()) / (60 * 1000)),
      transferWaitTime: Math.round((secondTrain.departureTime.getTime() - transferArrival.getTime()) / (60 * 1000))
    };
  }

  private getNext3Departures(stationName: string, routeId: string, tripData: any[], currentTime: Date): NextTrainDeparture[] {
    const stopId = this.getStopId(stationName, routeId);
    if (!stopId) return [];

    const departures = [];
    
    for (const trip of tripData) {
      const stopTime = trip.stopTimes.find((st: StopTimeUpdate) => st.stopId === stopId);
      if (stopTime?.departureTime) {
        const departureTime = new Date(stopTime.departureTime * 1000);
        if (departureTime > currentTime) {
          departures.push({
            departureTime,
            tripId: trip.trip.tripId
          });
        }
      }
    }

    // Sort by departure time and take first 3
    departures.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime());
    const next3 = departures.slice(0, 3);

    return next3.map(dep => {
      const minutesAway = Math.round((dep.departureTime.getTime() - currentTime.getTime()) / (60 * 1000));
      const formattedTime = dep.departureTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return {
        trainLine: routeId,
        departureTime: formattedTime,
        minutesAway
      };
    });
  }

}
