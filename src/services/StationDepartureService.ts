import { SubwayStation } from './StationDatabase';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export interface TrainDeparture {
  line: string;
  departureTime: Date;
  relativeTime: string;
}

export interface DeparturesByLine {
  [line: string]: TrainDeparture[];
}

interface StopTimeUpdate {
  stopId: string;
  stopSequence: number;
  arrivalTime?: number;
  departureTime?: number;
  delay?: number;
}

export class StationDepartureService {
  // GTFS-RT feed URLs (reused from RealMTAService)
  private static readonly F_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm';
  private static readonly ACE_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace';
  private static readonly NQR_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw';
  private static readonly L_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l';
  private static readonly G_TRAIN_FEED_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g';

  static async getDeparturesForStation(
    station: SubwayStation, 
    direction: 'northbound' | 'southbound'
  ): Promise<DeparturesByLine> {
    const departuresByLine: DeparturesByLine = {};

    // Fetch departures for each line at this station
    for (const line of station.lines) {
      try {
        const feedUrl = this.getFeedUrlForLine(line);
        const gtfsStopId = this.getDirectionalStopId(station.id, direction);
        const stopTimeUpdates = await this.fetchTrainArrivalsFromFeed(
          feedUrl, 
          direction, 
          station.name, 
          line, 
          gtfsStopId
        );

        // Convert to TrainDeparture objects and limit to 5
        const departures = stopTimeUpdates
          .slice(0, 5) // Limit to next 5 trains per line
          .map(update => ({
            line,
            departureTime: new Date(update.departureTime! * 1000),
            relativeTime: this.formatRelativeTime(new Date(update.departureTime! * 1000))
          }));

        departuresByLine[line] = departures;
      } catch (error) {
        console.error(`Failed to fetch departures for ${line} line:`, error);
        // Throw error instead of falling back to mock data
        throw error;
      }
    }

    return departuresByLine;
  }

  static formatRelativeTime(departureTime: Date): string {
    const now = new Date();
    const diffInMinutes = Math.round((departureTime.getTime() - now.getTime()) / 60000);
    
    if (diffInMinutes <= 0) {
      return 'Now';
    }
    
    return `${diffInMinutes}`;
  }

  /**
   * Convert station ID + direction to directional GTFS stop ID
   * e.g., 'F20' + 'northbound' → 'F20N'
   */
  private static getDirectionalStopId(stationId: string, direction: 'northbound' | 'southbound'): string {
    const directionSuffix = direction === 'northbound' ? 'N' : 'S';
    return `${stationId}${directionSuffix}`;
  }

  private static getFeedUrlForLine(line: string): string {
    // Map train lines to their respective GTFS-RT feeds
    const feedMap: { [key: string]: string } = {
      'F': this.F_TRAIN_FEED_URL,
      'M': this.F_TRAIN_FEED_URL,
      'B': this.F_TRAIN_FEED_URL,
      'D': this.F_TRAIN_FEED_URL,
      'A': this.ACE_TRAIN_FEED_URL,
      'C': this.ACE_TRAIN_FEED_URL,
      'E': this.ACE_TRAIN_FEED_URL,
      'N': this.NQR_TRAIN_FEED_URL,
      'Q': this.NQR_TRAIN_FEED_URL,
      'R': this.NQR_TRAIN_FEED_URL,
      'W': this.NQR_TRAIN_FEED_URL,
      'L': this.L_TRAIN_FEED_URL,
      'G': this.G_TRAIN_FEED_URL,
      '1': this.NQR_TRAIN_FEED_URL, // Using NQR feed as fallback
      '2': this.NQR_TRAIN_FEED_URL,
      '3': this.NQR_TRAIN_FEED_URL,
      '4': this.NQR_TRAIN_FEED_URL,
      '5': this.NQR_TRAIN_FEED_URL,
      '6': this.NQR_TRAIN_FEED_URL,
      '7': this.NQR_TRAIN_FEED_URL,
    };

    return feedMap[line] || this.F_TRAIN_FEED_URL; // Default to F train feed
  }

  /**
   * Fetch real-time train arrivals from any GTFS feed
   * (Reused logic from RealMTAService)
   */
  private static async fetchTrainArrivalsFromFeed(
    feedUrl: string, 
    direction: 'northbound' | 'southbound', 
    station: string,
    line: string,
    stopId: string
  ): Promise<StopTimeUpdate[]> {
    try {
      console.log(`[StationDepartureService] Fetching ${direction} ${line} train GTFS-RT data for ${station}...`);
      
      const gtfsBuffer = await this.fetchGtfsBuffer(feedUrl, line);
      const arrivals = this.parseGtfsBuffer(gtfsBuffer, line, stopId);
      
      console.log(`[StationDepartureService] Found ${arrivals.length} upcoming ${line} trains at ${station}`);
      return arrivals;
      
    } catch (error) {
      console.error(`[StationDepartureService] ${line} train GTFS-RT fetch failed:`, error);
      throw error;
    }
  }

  /**
   * Fetch GTFS buffer from MTA feed URL
   */
  private static async fetchGtfsBuffer(feedUrl: string, line: string): Promise<ArrayBuffer> {
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
    
    return await response.arrayBuffer();
  }

  /**
   * Parse GTFS-RT protobuf buffer and extract relevant stop time updates
   */
  private static parseGtfsBuffer(gtfsBuffer: ArrayBuffer, line: string, stopId: string): StopTimeUpdate[] {
    console.log(`[StationDepartureService] Parsing GTFS-RT protobuf data for ${line} line`);
    console.log(`[StationDepartureService] Looking for stop ID: ${stopId}`);
    console.log(`[StationDepartureService] Buffer size: ${gtfsBuffer.byteLength} bytes`);
    
    if (gtfsBuffer.byteLength === 0) {
      console.log(`[StationDepartureService] Empty GTFS buffer received for ${line} line`);
      return [];
    }
    
    // Parse real GTFS-RT protobuf data
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(gtfsBuffer)
    );
    
    console.log(`[StationDepartureService] Feed contains ${feed.entity.length} entities`);
    
    const arrivals: StopTimeUpdate[] = [];
    const now = Date.now() / 1000; // Current time in seconds
    const allStopIds = new Set<string>();
    const baseStopId = stopId.replace(/[NS]$/, ''); // Remove N/S suffix if present
    
    // Process each entity in the feed
    for (const entity of feed.entity) {
      if (!entity.tripUpdate || !entity.tripUpdate.stopTimeUpdate) {
        continue;
      }
      
      // Find stop time updates for our station
      for (const stopTimeUpdate of entity.tripUpdate.stopTimeUpdate) {
        if (stopTimeUpdate.stopId) {
          allStopIds.add(stopTimeUpdate.stopId);
          
          // Use strict directional matching to prevent cross-contamination
          const matches = [
            stopTimeUpdate.stopId === stopId, // Exact directional match (e.g., F20N)
            // Only fall back to base ID if no directional suffix is requested
            stopId === baseStopId && stopTimeUpdate.stopId === baseStopId, // Base match only when explicitly looking for base
          ];
          
          if (matches.some(match => match)) {
            console.log(`[StationDepartureService] MATCH FOUND! Looking for: ${stopId}, Found: ${stopTimeUpdate.stopId}`);
            
            // Handle both .low format (64-bit) and direct value format
            const rawDepartureTime = stopTimeUpdate.departure?.time?.low || 
                                    stopTimeUpdate.departure?.time || 
                                    stopTimeUpdate.arrival?.time?.low || 
                                    stopTimeUpdate.arrival?.time;
            const rawArrivalTime = stopTimeUpdate.arrival?.time?.low || stopTimeUpdate.arrival?.time;
            
            // Convert to number if it's a string
            const departureTime = rawDepartureTime ? Number(rawDepartureTime) : undefined;
            const arrivalTime = rawArrivalTime ? Number(rawArrivalTime) : undefined;
            
            console.log(`[StationDepartureService] Time data - departure: ${departureTime}, arrival: ${arrivalTime}, now: ${now}`);
            
            if (departureTime && departureTime > now) {
              console.log(`[StationDepartureService] Adding train - departure in ${Math.round((departureTime - now) / 60)} minutes`);
              arrivals.push({
                stopId: stopTimeUpdate.stopId,
                stopSequence: stopTimeUpdate.stopSequence || 1,
                departureTime: departureTime,
                arrivalTime: arrivalTime || departureTime
              });
            } else {
              console.log(`[StationDepartureService] Skipping train - departureTime: ${departureTime}, now: ${now}, valid: ${departureTime && departureTime > now}`);
            }
          }
        }
      }
    }
    
    // Debug: Log all unique stop IDs found in the feed
    const sortedStopIds = Array.from(allStopIds).sort();
    console.log(`[StationDepartureService] All stop IDs in ${line} feed (${sortedStopIds.length} total):`);
    console.log(`[StationDepartureService] Stop IDs: ${sortedStopIds.slice(0, 20).join(', ')}${sortedStopIds.length > 20 ? ' ...' : ''}`);
    
    // Debug: Log stop IDs that match our base station
    const relatedStopIds = sortedStopIds.filter(id => id.includes(baseStopId));
    if (relatedStopIds.length > 0) {
      console.log(`[StationDepartureService] Stop IDs containing '${baseStopId}': ${relatedStopIds.join(', ')}`);
    } else {
      console.log(`[StationDepartureService] No stop IDs found containing '${baseStopId}'`);
      
      // Additional debugging: Try different Carroll St variations
      if (baseStopId === 'F20') {
        console.log(`[StationDepartureService] DEBUGGING CARROLL ST: Searching for alternative stop ID patterns...`);
        
        // Check for potential Carroll St variations in the feed
        const carrollVariations = sortedStopIds.filter(id => 
          id.includes('Carroll') || 
          id.includes('CARROLL') ||
          id.includes('635') ||  // MTA sometimes uses numeric IDs
          id.includes('F21') ||  // Adjacent stations
          id.includes('F19') ||
          id.includes('F 20') || // Space variations
          id.includes('F-20') || // Dash variations
          id.includes('F_20')    // Underscore variations
        );
        
        if (carrollVariations.length > 0) {
          console.log(`[StationDepartureService] Found potential Carroll St alternatives: ${carrollVariations.join(', ')}`);
        } else {
          console.log(`[StationDepartureService] No Carroll St alternatives found. First 50 stop IDs in feed:`, sortedStopIds.slice(0, 50));
        }
      }
    }
    
    // Sort by departure time and limit to 6
    arrivals.sort((a, b) => a.departureTime! - b.departureTime!);
    arrivals.splice(6); // Keep only first 6
    
    return arrivals;
  }
}