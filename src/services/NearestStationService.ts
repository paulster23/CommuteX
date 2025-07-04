import { StationDatabase, SubwayStation } from './StationDatabase';
import { Location } from './LocationService';

export interface NearestStationResult {
  station: SubwayStation;
  distance: number; // in miles
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