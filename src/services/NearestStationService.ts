import { StationDatabase, SubwayStation } from './StationDatabase';
import { Location } from './LocationService';

export interface NearestStationResult {
  station: SubwayStation;
  distance: number; // in miles
}

export interface ConsolidatedStationResult {
  name: string;
  lines: string[];
  lat: number;
  lng: number;
  distance: number; // in miles
  stationIds: { [line: string]: string }; // Maps train lines to their GTFS station IDs
}

export class NearestStationService {
  static findNearestStation(location: Location): NearestStationResult | null {
    const result = StationDatabase.getNearestStation(location.lat, location.lng);
    
    if (!result) {
      return null;
    }

    return {
      station: result.station,
      distance: result.distance
    };
  }

  static findNearestStationsForLine(location: Location, line: string, limit: number = 3): NearestStationResult[] {
    const lineStations = StationDatabase.getStationsForLine(line);
    
    if (lineStations.length === 0) {
      return [];
    }

    // Calculate distances for all stations on the line
    const stationsWithDistance = lineStations.map(station => ({
      station,
      distance: this.calculateDistance(location.lat, location.lng, station.lat, station.lng)
    }));

    // Sort by distance and return top results
    return stationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  static findNearestStationConsolidated(location: Location): ConsolidatedStationResult | null {
    // Try to find stations within 0.15 miles first
    let nearbyStations = StationDatabase.getNearestStations(location.lat, location.lng, 0.15);
    
    // If no stations found within 0.15 miles, try a larger radius
    if (nearbyStations.length === 0) {
      nearbyStations = StationDatabase.getNearestStations(location.lat, location.lng, 0.5);
    }
    
    // If still no stations found, fall back to the single nearest station approach
    if (nearbyStations.length === 0) {
      const singleResult = StationDatabase.getNearestStation(location.lat, location.lng);
      if (!singleResult) {
        return null;
      }
      
      // Convert single station result to consolidated format
      const station = singleResult.station;
      const stationIds: { [line: string]: string } = {};
      for (const line of station.lines) {
        stationIds[line] = StationDatabase.getGtfsIdForLine(station, line);
      }
      
      return {
        name: station.name,
        lines: [...station.lines],
        lat: station.lat,
        lng: station.lng,
        distance: singleResult.distance,
        stationIds
      };
    }

    // Group stations by name and location (same physical station)
    const stationGroups = new Map<string, Array<{ station: SubwayStation; distance: number }>>();
    
    for (const stationWithDistance of nearbyStations) {
      const key = `${stationWithDistance.station.name}-${stationWithDistance.station.lat}-${stationWithDistance.station.lng}`;
      if (!stationGroups.has(key)) {
        stationGroups.set(key, []);
      }
      stationGroups.get(key)!.push(stationWithDistance);
    }

    // Find the closest station group
    let closestGroup: Array<{ station: SubwayStation; distance: number }> | null = null;
    let shortestDistance = Infinity;

    for (const group of stationGroups.values()) {
      const minDistance = Math.min(...group.map(s => s.distance));
      if (minDistance < shortestDistance) {
        shortestDistance = minDistance;
        closestGroup = group;
      }
    }

    if (!closestGroup) {
      return null;
    }

    // Consolidate all lines and station IDs from the closest group
    const consolidatedLines = new Set<string>();
    const stationIds: { [line: string]: string } = {};
    
    for (const { station } of closestGroup) {
      // Add all lines from this station
      for (const line of station.lines) {
        consolidatedLines.add(line);
        // Map line to appropriate GTFS station ID
        stationIds[line] = StationDatabase.getGtfsIdForLine(station, line);
      }
    }

    // Use the first station as the base for name and location
    const baseStation = closestGroup[0].station;
    
    return {
      name: baseStation.name,
      lines: Array.from(consolidatedLines).sort(),
      lat: baseStation.lat,
      lng: baseStation.lng,
      distance: shortestDistance,
      stationIds
    };
  }

  // Haversine formula for calculating distance between two coordinates
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in miles
  }
}