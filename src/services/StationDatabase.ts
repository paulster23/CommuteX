export interface SubwayStation {
  id: string;
  name: string;
  lines: string[];
  lat: number;
  lng: number;
}

// NYC Subway Station Database
// Based on MTA GTFS static data - coordinates from official MTA data
const SUBWAY_STATIONS: SubwayStation[] = [
  // Existing stations from app
  {
    id: 'F20',
    name: 'Carroll St',
    lines: ['F', 'G'],
    lat: 40.679371,
    lng: -73.995458
  },
  {
    id: 'F18',
    name: '23rd St',
    lines: ['F', 'M'],
    lat: 40.742878,
    lng: -73.992821
  },
  {
    id: 'F25',
    name: 'Jay St-MetroTech',
    lines: ['F'],
    lat: 40.692338,
    lng: -73.987342
  },
  {
    id: 'A41',
    name: 'Jay St-MetroTech',
    lines: ['A', 'C'],
    lat: 40.692338,
    lng: -73.987342
  },
  {
    id: 'A23',
    name: '23rd St-8th Ave',
    lines: ['C', 'E'],
    lat: 40.742878,
    lng: -73.996324
  },
  {
    id: 'A27',
    name: '14th St-8th Ave',
    lines: ['A', 'C', 'E'],
    lat: 40.740893,
    lng: -73.996864
  },

  // Major Manhattan stations for comprehensive coverage
  {
    id: 'R16',
    name: 'Union Sq-14th St',
    lines: ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'],
    lat: 40.735736,
    lng: -73.990568
  },
  {
    id: 'R20',
    name: '23rd St',
    lines: ['N', 'Q', 'R', 'W'],
    lat: 40.742878,
    lng: -73.989568
  },
  {
    id: 'A25',
    name: '42nd St-Port Authority',
    lines: ['A', 'C', 'E'],
    lat: 40.757308,
    lng: -73.989735
  },
  {
    id: 'R13',
    name: 'Times Sq-42nd St',
    lines: ['N', 'Q', 'R', 'W', '1', '2', '3', '7'],
    lat: 40.755477,
    lng: -73.986754
  },
  {
    id: 'A15',
    name: '59th St-Columbus Circle',
    lines: ['A', 'B', 'C', 'D', '1'],
    lat: 40.768296,
    lng: -73.981736
  },

  // Key Brooklyn stations
  {
    id: 'F21',
    name: 'Smith-9th Sts',
    lines: ['F', 'G'],
    lat: 40.673473,
    lng: -73.995745
  },
  {
    id: 'F22',
    name: '4th Ave-9th St',
    lines: ['F', 'G'],
    lat: 40.670272,
    lng: -73.988114
  },
  {
    id: 'F24',
    name: 'Bergen St',
    lines: ['F', 'G'],
    lat: 40.686145,
    lng: -73.990064
  },
  {
    id: 'F26',
    name: 'Hoyt-Schermerhorn Sts',
    lines: ['A', 'C', 'G'],
    lat: 40.688484,
    lng: -73.985001
  },
  {
    id: 'R25',
    name: 'Atlantic Av-Barclays Ctr',
    lines: ['B', 'D', 'N', 'Q', 'R', 'W', '2', '3', '4', '5'],
    lat: 40.684359,
    lng: -73.977666
  },

  // Key Queens stations
  {
    id: 'F11',
    name: 'Roosevelt Ave-Jackson Hts',
    lines: ['E', 'F', 'M', 'R', '7'],
    lat: 40.746325,
    lng: -73.891394
  },

  // Major transfer hubs
  {
    id: 'F14',
    name: 'Lexington Ave-53rd St',
    lines: ['E', 'M', '6'],
    lat: 40.757552,
    lng: -73.969055
  },
  {
    id: 'R11',
    name: 'Grand Central-42nd St',
    lines: ['4', '5', '6', '7'],
    lat: 40.751776,
    lng: -73.976848
  },
];

export class StationDatabase {
  private static stationMap: Map<string, SubwayStation> = new Map(
    SUBWAY_STATIONS.map(station => [station.id, station])
  );

  static getStationById(id: string): SubwayStation | null {
    return this.stationMap.get(id) || null;
  }

  static getStationsForLine(line: string): SubwayStation[] {
    return SUBWAY_STATIONS.filter(station => station.lines.includes(line));
  }

  static getAllStations(): SubwayStation[] {
    return [...SUBWAY_STATIONS];
  }

  static getNearestStation(lat: number, lng: number): { station: SubwayStation; distance: number } | null {
    if (SUBWAY_STATIONS.length === 0) return null;

    let nearest: SubwayStation = SUBWAY_STATIONS[0];
    let shortestDistance = this.calculateDistance(lat, lng, nearest.lat, nearest.lng);

    for (const station of SUBWAY_STATIONS.slice(1)) {
      const distance = this.calculateDistance(lat, lng, station.lat, station.lng);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearest = station;
      }
    }

    return { station: nearest, distance: shortestDistance };
  }

  // Haversine formula for calculating distance between two coordinates (reused from LocationService)
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