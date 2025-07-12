import { SubwayStation, StationDatabase } from './StationDatabase';
import { ConsolidatedStationResult } from './NearestStationService';
import { getFeedUrlForLine, getMTAApiHeaders } from '../config/MTAFeedConfig';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export interface TrainDeparture {
  line: string;
  departureTime: Date;
  relativeTime: string;
  feedSource?: string; // Which GTFS feed this data came from
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
  // Feed URLs now managed by centralized configuration

  static async getDeparturesForStation(
    station: SubwayStation, 
    direction: 'northbound' | 'southbound'
  ): Promise<DeparturesByLine> {
    const departuresByLine: DeparturesByLine = {};

    // Fetch departures for each line at this station
    for (const line of station.lines) {
      try {
        const feedUrl = this.getFeedUrlForLine(line);
        const gtfsStopId = this.getDirectionalStopId(StationDatabase.getGtfsIdForLine(station, line), direction);
        const stopTimeUpdates = await this.fetchTrainArrivalsFromFeed(
          feedUrl, 
          direction, 
          station.name, 
          line, 
          gtfsStopId
        );

        // Convert to TrainDeparture objects and limit to 5
        const dataFetchTime = new Date(); // Track when this data was fetched
        const departures = stopTimeUpdates
          .slice(0, 5) // Limit to next 5 trains per line
          .map(update => ({
            line,
            departureTime: new Date(update.departureTime! * 1000),
            relativeTime: this.formatRelativeTime(new Date(update.departureTime! * 1000), dataFetchTime),
            feedSource: this.getFeedSourceForLine(line)
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

  static async getDeparturesForConsolidatedStation(
    consolidatedStation: ConsolidatedStationResult, 
    direction: 'northbound' | 'southbound'
  ): Promise<DeparturesByLine> {
    const departuresByLine: DeparturesByLine = {};

    // Fetch departures for each line at this consolidated station
    for (const line of consolidatedStation.lines) {
      try {
        const feedUrl = this.getFeedUrlForLine(line);
        const gtfsStopId = this.getDirectionalStopId(consolidatedStation.stationIds[line], direction);
        const stopTimeUpdates = await this.fetchTrainArrivalsFromFeed(
          feedUrl, 
          direction, 
          consolidatedStation.name, 
          line, 
          gtfsStopId
        );

        // Convert to TrainDeparture objects and limit to 5
        const dataFetchTime = new Date(); // Track when this data was fetched
        const departures = stopTimeUpdates
          .slice(0, 5) // Limit to next 5 trains per line
          .map(update => ({
            line,
            departureTime: new Date(update.departureTime! * 1000),
            relativeTime: this.formatRelativeTime(new Date(update.departureTime! * 1000), dataFetchTime),
            feedSource: this.getFeedSourceForLine(line)
          }));

        departuresByLine[line] = departures;
      } catch (error) {
        console.error(`Failed to fetch departures for ${line} line:`, error);
        console.log(`[StationDepartureService] Continuing with other lines despite ${line} line failure`);
        // Continue processing other lines instead of throwing error
        // This allows partial success - show available trains even if some lines fail
      }
    }

    return departuresByLine;
  }

  static formatRelativeTime(departureTime: Date, dataFetchTime?: Date): string {
    const now = new Date();
    
    // Apply time drift compensation
    const compensatedDepartureTime = this.applyTimeDriftCompensation(departureTime, dataFetchTime);
    
    const diffInSeconds = (compensatedDepartureTime.getTime() - now.getTime()) / 1000;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    
    if (diffInSeconds <= 30) {
      return 'Now';
    }
    
    if (diffInSeconds <= 90) {
      return '1';
    }
    
    return `${diffInMinutes}`;
  }

  /**
   * Apply time drift compensation to account for data processing delays
   */
  private static applyTimeDriftCompensation(departureTime: Date, dataFetchTime?: Date): Date {
    const PROCESSING_DELAY_SECONDS = 30; // Account for 30s average processing delay
    const DATA_STALENESS_BUFFER = 15;    // Additional 15s buffer for data staleness
    
    const compensatedTime = new Date(departureTime.getTime());
    
    // If we know when data was fetched, account for elapsed time since fetch
    if (dataFetchTime) {
      const elapsedSinceFetch = (new Date().getTime() - dataFetchTime.getTime()) / 1000;
      compensatedTime.setSeconds(compensatedTime.getSeconds() - elapsedSinceFetch);
    }
    
    // Apply processing delay compensation
    compensatedTime.setSeconds(compensatedTime.getSeconds() - PROCESSING_DELAY_SECONDS);
    
    // Apply additional staleness buffer for safety
    compensatedTime.setSeconds(compensatedTime.getSeconds() - DATA_STALENESS_BUFFER);
    
    return compensatedTime;
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
    // Use centralized feed configuration
    return getFeedUrlForLine(line);
  }

  private static getFeedSourceForLine(line: string): string {
    // Map individual lines to their feed groups for display
    const lineLower = line.toLowerCase();
    
    const lineToFeedMap: { [key: string]: string } = {
      'b': 'bdfm', 'd': 'bdfm', 'f': 'bdfm', 'm': 'bdfm',
      'a': 'ace', 'c': 'ace', 'e': 'ace',
      'n': 'nqrw', 'q': 'nqrw', 'r': 'nqrw', 'w': 'nqrw',
      'l': 'l',
      'g': 'g',
      '1': '123456s', '2': '123456s', '3': '123456s', 
      '4': '123456s', '5': '123456s', '6': '123456s', 's': '123456s',
      '7': '7',
      'j': 'jz', 'z': 'jz'
    };
    
    return lineToFeedMap[lineLower] || 'unknown';
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
      const arrivals = this.parseGtfsBuffer(gtfsBuffer, line, stopId, direction);
      
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
      cache: 'no-cache',
      headers: getMTAApiHeaders()
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
  private static parseGtfsBuffer(gtfsBuffer: ArrayBuffer, line: string, stopId: string, direction: 'northbound' | 'southbound'): StopTimeUpdate[] {
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
          
          // Enhanced directional matching with robust fallback patterns
          const matches = [
            stopTimeUpdate.stopId === stopId, // Exact directional match (e.g., F20S)
            
            // Enhanced fallback patterns for various MTA GTFS naming conventions
            stopTimeUpdate.stopId === baseStopId, // Base station match (F20)
            stopTimeUpdate.stopId === `${baseStopId}_${direction === 'northbound' ? 'N' : 'S'}`, // Underscore format (F20_S)
            stopTimeUpdate.stopId === `${baseStopId}-${direction === 'northbound' ? 'N' : 'S'}`, // Dash format (F20-S)
            stopTimeUpdate.stopId === `${baseStopId} ${direction === 'northbound' ? 'N' : 'S'}`, // Space format (F20 S)
            
            // Prefix matching for complex station IDs
            stopTimeUpdate.stopId.startsWith(baseStopId) && stopTimeUpdate.stopId.includes(direction === 'northbound' ? 'N' : 'S'),
            
            // Additional fallback: if looking for directional and no exact matches, accept base ID as last resort
            stopId !== baseStopId && stopTimeUpdate.stopId === baseStopId
          ];
          
          // Debug logging for stop ID matching analysis
          const matchReasons = [];
          if (matches[0]) matchReasons.push('exact-match');
          if (matches[1]) matchReasons.push('base-match'); 
          if (matches[2]) matchReasons.push('underscore-format');
          if (matches[3]) matchReasons.push('dash-format');
          if (matches[4]) matchReasons.push('space-format');
          if (matches[5]) matchReasons.push('prefix-match');
          if (matches[6]) matchReasons.push('fallback-base');
          
          if (matches.some(match => match)) {
            console.log(`[StationDepartureService] MATCH FOUND! Looking for: ${stopId} (${direction}), Found: ${stopTimeUpdate.stopId}, Reason: ${matchReasons.join(', ')}`);
          } else {
            console.log(`[StationDepartureService] No match: Looking for: ${stopId} (${direction}), Found: ${stopTimeUpdate.stopId}`);
          }

          if (matches.some(match => match)) {
            
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