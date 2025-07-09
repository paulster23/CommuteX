#!/usr/bin/env node

/**
 * Script to generate comprehensive station database from MTA GTFS data
 * Downloads MTA GTFS data and converts it to our SubwayStation format
 */

const fs = require('fs');
const path = require('path');

// Read and parse the GTFS data
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

// Read GTFS stops, routes, and trips data
console.log('Reading GTFS data...');
const stops = parseCSV(path.join(__dirname, '..', 'stops.txt'));
const routes = parseCSV(path.join(__dirname, '..', 'routes.txt'));
const trips = parseCSV(path.join(__dirname, '..', 'trips.txt'));

// Create a map of route_id to route_short_name (train line)
const routeMap = new Map();
routes.forEach(route => {
  if (route.route_short_name) {
    routeMap.set(route.route_id, route.route_short_name);
  }
});

// Create a map of trip_id to route_id
const tripRouteMap = new Map();
trips.forEach(trip => {
  tripRouteMap.set(trip.trip_id, trip.route_id);
});

// We need to get stop_times to know which routes serve which stops
console.log('Reading stop times data (this may take a moment)...');
const stopTimes = parseCSV(path.join(__dirname, '..', 'stop_times.txt'));

// Create a map of stop_id to the routes that serve it
const stopRoutes = new Map();
stopTimes.forEach(stopTime => {
  const stopId = stopTime.stop_id;
  const tripId = stopTime.trip_id;
  
  // Get route_id from trip_id using trips.txt mapping
  const routeId = tripRouteMap.get(tripId);
  const routeName = routeMap.get(routeId);
  
  if (routeName && stopId) {
    if (!stopRoutes.has(stopId)) {
      stopRoutes.set(stopId, new Set());
    }
    stopRoutes.get(stopId).add(routeName);
  }
});

// Filter to get only parent stations (location_type = 1) or stations without parent
const parentStations = stops.filter(stop => 
  stop.location_type === '1' || (stop.location_type === '' && stop.parent_station === '')
);

console.log(`Found ${parentStations.length} parent stations`);

// Convert to our SubwayStation format
const subwayStations = [];

parentStations.forEach(stop => {
  // Get all platform stops for this parent station
  const platformStops = stops.filter(s => s.parent_station === stop.stop_id);
  
  // Collect all routes serving this station
  const allRoutes = new Set();
  
  // Add routes from parent station
  if (stopRoutes.has(stop.stop_id)) {
    stopRoutes.get(stop.stop_id).forEach(route => allRoutes.add(route));
  }
  
  // Add routes from platform stops
  platformStops.forEach(platform => {
    if (stopRoutes.has(platform.stop_id)) {
      stopRoutes.get(platform.stop_id).forEach(route => allRoutes.add(route));
    }
  });
  
  // Skip stations with no routes (likely not in service)
  if (allRoutes.size === 0) {
    return;
  }
  
  // Create GTFS IDs mapping
  const gtfsIds = {};
  Array.from(allRoutes).forEach(route => {
    // For now, use the parent station ID as default
    gtfsIds[route] = stop.stop_id;
  });
  
  // Skip Staten Island Railway stations (start with 'S')
  if (stop.stop_id.startsWith('S')) {
    return;
  }
  
  const station = {
    id: stop.stop_id,
    name: stop.stop_name,
    lines: Array.from(allRoutes).sort(),
    lat: parseFloat(stop.stop_lat),
    lng: parseFloat(stop.stop_lon),
    gtfsIds: gtfsIds
  };
  
  subwayStations.push(station);
});

// Sort stations by ID for consistency
subwayStations.sort((a, b) => a.id.localeCompare(b.id));

console.log(`Generated ${subwayStations.length} subway stations`);

// Generate TypeScript file content
const tsContent = `export interface SubwayStation {
  id: string;
  name: string;
  lines: string[];
  lat: number;
  lng: number;
  gtfsIds?: { [line: string]: string }; // Maps train lines to their GTFS station IDs
}

// NYC Subway Station Database
// Generated from MTA GTFS static data
// Contains all ${subwayStations.length} active subway stations
const SUBWAY_STATIONS: SubwayStation[] = ${JSON.stringify(subwayStations, null, 2)};

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

  static getGtfsIdForLine(station: SubwayStation, line: string): string {
    // If station has specific GTFS IDs mapping, use it
    if (station.gtfsIds && station.gtfsIds[line]) {
      return station.gtfsIds[line];
    }
    // Otherwise, use the default station ID
    return station.id;
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

  static getNearestStations(lat: number, lng: number, radiusMiles: number = 0.15): Array<{ station: SubwayStation; distance: number }> {
    if (SUBWAY_STATIONS.length === 0) return [];

    const stationsWithDistances: Array<{ station: SubwayStation; distance: number }> = [];

    for (const station of SUBWAY_STATIONS) {
      const distance = this.calculateDistance(lat, lng, station.lat, station.lng);
      if (distance <= radiusMiles) {
        stationsWithDistances.push({ station, distance });
      }
    }

    // Sort by distance
    return stationsWithDistances.sort((a, b) => a.distance - b.distance);
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
`;

// Write the generated database
const outputPath = path.join(__dirname, '..', 'src', 'services', 'StationDatabase.generated.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`Generated station database saved to: ${outputPath}`);

// Print some stats
console.log('\n=== Station Database Statistics ===');
console.log(`Total stations: ${subwayStations.length}`);

const lineStats = {};
subwayStations.forEach(station => {
  station.lines.forEach(line => {
    lineStats[line] = (lineStats[line] || 0) + 1;
  });
});

console.log('\n=== Stations per line ===');
Object.entries(lineStats).sort().forEach(([line, count]) => {
  console.log(`${line}: ${count} stations`);
});

// Show some example stations
console.log('\n=== Sample stations ===');
subwayStations.slice(0, 10).forEach(station => {
  console.log(`${station.name} (${station.id}): ${station.lines.join(', ')}`);
});

console.log('\n✅ Station database generation complete!');