export interface Location {
  lat: number;
  lng: number;
}

// Utility function to calculate distance between two coordinates using Haversine formula
function calculateDistance(point1: Location, point2: Location): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  return distance;
}

// Calculate walking time with 25% speed increase (3.75 mph) and buffer time
function calculateWalkingTime(distanceMiles: number, addBuffer: boolean = true): number {
  const WALKING_SPEED_MPH = 3.75; // 25% faster than standard 3 mph
  const baseTimeMinutes = (distanceMiles / WALKING_SPEED_MPH) * 60;
  
  // Add buffer time for realistic conditions
  let bufferMinutes = 0;
  if (addBuffer) {
    bufferMinutes += 1; // Buffer for intersections and realistic conditions
  }
  
  return Math.round(baseTimeMinutes + bufferMinutes);
}

export interface TransitStop {
  id: string;
  name: string;
  lines: string[];
  walkingTimeMinutes: number;
  walkingDistanceMiles: number;
  coordinates: Location;
}

export interface LocationProvider {
  getCurrentLocation(): Promise<Location>;
  getWalkingTime(origin: Location, destination: TransitStop): Promise<number>;
  getWalkingTimeToTransit(transitLine: string): Promise<number>;
  getWalkingTimeFromTwentyThirdSt(): number;
  getWalkingTimeFromWorkToTwentyThirdSt(): Promise<number>;
  getWalkingTimeFromCarrollStToHome(): Promise<number>;
}

export class StaticLocationProvider implements LocationProvider {
  private readonly homeLocation: Location = {
    lat: 40.688312,
    lng: -73.990982
  };

  // Work destination coordinates (512 W 22nd St, Manhattan)
  private readonly workLocation: Location = {
    lat: 40.746021,
    lng: -73.996736
  };

  // 23rd St station coordinates (F train at 6th Ave)
  private readonly twentyThirdStLocation: Location = {
    lat: 40.742878,
    lng: -73.992821
  };

  private readonly transitStops: TransitStop[] = [
    // F train starting station (dynamic walking time calculation)
    {
      id: "f-carroll-st",
      name: "Carroll St",
      lines: ["F"],
      walkingTimeMinutes: 0, // Will be calculated dynamically
      walkingDistanceMiles: 0, // Will be calculated dynamically
      coordinates: { lat: 40.679371, lng: -73.995458 }
    },
    // Bus route (keeping for completeness)
    {
      id: "b61-court-atlantic",
      name: "Court St/Atlantic Av",
      lines: ["B61"],
      walkingTimeMinutes: 0, // Will be calculated dynamically
      walkingDistanceMiles: 0, // Will be calculated dynamically
      coordinates: { lat: 40.688873, lng: -73.990982 }
    }
  ];

  async getCurrentLocation(): Promise<Location> {
    return this.homeLocation;
  }

  async getWalkingTime(origin: Location, destination: TransitStop): Promise<number> {
    // Calculate real distance and walking time with 20% speed boost
    const distance = calculateDistance(origin, destination.coordinates);
    return calculateWalkingTime(distance, true);
  }

  async getWalkingTimeToTransit(transitLine: string): Promise<number> {
    // Find all stops that serve this transit line
    const availableStops = this.transitStops.filter(
      stop => stop.lines.includes(transitLine)
    );

    if (availableStops.length === 0) {
      throw new Error(`No transit stops found for line: ${transitLine}`);
    }

    // Calculate walking time to each stop and return the shortest
    const walkingTimes = await Promise.all(
      availableStops.map(stop => this.getWalkingTime(this.homeLocation, stop))
    );

    return Math.min(...walkingTimes);
  }

  getTransitStops(): TransitStop[] {
    return this.transitStops;
  }

  getClosestStopForLine(transitLine: string): TransitStop | null {
    const availableStops = this.transitStops.filter(
      stop => stop.lines.includes(transitLine)
    );

    if (availableStops.length === 0) {
      return null;
    }

    // Return the stop with shortest walking time (calculate dynamically)
    let closestStop = availableStops[0];
    let shortestTime = calculateWalkingTime(
      calculateDistance(this.homeLocation, closestStop.coordinates)
    );

    for (const stop of availableStops.slice(1)) {
      const walkingTime = calculateWalkingTime(
        calculateDistance(this.homeLocation, stop.coordinates)
      );
      if (walkingTime < shortestTime) {
        shortestTime = walkingTime;
        closestStop = stop;
      }
    }

    return closestStop;
  }

  // Get walking time from 23rd St station to work destination
  getWalkingTimeFromTwentyThirdSt(): number {
    const distance = calculateDistance(this.twentyThirdStLocation, this.workLocation);
    return calculateWalkingTime(distance, true);
  }

  // Get coordinates for specific locations
  getWorkLocation(): Location {
    return this.workLocation;
  }

  getTwentyThirdStLocation(): Location {
    return this.twentyThirdStLocation;
  }

  // Get walking time from work to 23rd St station (reverse of morning commute)
  async getWalkingTimeFromWorkToTwentyThirdSt(): Promise<number> {
    const distance = calculateDistance(this.workLocation, this.twentyThirdStLocation);
    return calculateWalkingTime(distance, true);
  }

  // Get walking time from Carroll St station to home (reverse of morning commute)
  async getWalkingTimeFromCarrollStToHome(): Promise<number> {
    // This should be the same as the morning commute walking time to Carroll St
    return await this.getWalkingTimeToTransit('F');
  }
}

// Future GPS implementation placeholder
export class GPSLocationProvider implements LocationProvider {
  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        error => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  async getWalkingTime(origin: Location, destination: TransitStop): Promise<number> {
    // TODO: Implement with Google Maps/Mapbox API
    throw new Error('GPS walking time calculation not implemented yet');
  }

  async getWalkingTimeToTransit(transitLine: string): Promise<number> {
    // TODO: Implement with real-time API calls
    throw new Error('GPS transit walking time calculation not implemented yet');
  }

  getWalkingTimeFromTwentyThirdSt(): number {
    // TODO: Implement with GPS-based calculation
    throw new Error('GPS walking time from 23rd St calculation not implemented yet');
  }

  async getWalkingTimeFromWorkToTwentyThirdSt(): Promise<number> {
    // TODO: Implement with GPS-based calculation
    throw new Error('GPS walking time from work to 23rd St calculation not implemented yet');
  }

  async getWalkingTimeFromCarrollStToHome(): Promise<number> {
    // TODO: Implement with GPS-based calculation
    throw new Error('GPS walking time from Carroll St to home calculation not implemented yet');
  }
}
