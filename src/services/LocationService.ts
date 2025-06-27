export interface Location {
  lat: number;
  lng: number;
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
}

export class StaticLocationProvider implements LocationProvider {
  private readonly homeLocation: Location = {
    lat: 40.688312,
    lng: -73.990982
  };

  private readonly transitStops: TransitStop[] = [
    {
      id: "f-4av-9st",
      name: "4 Av-9 St (F/G)",
      lines: ["F", "G"],
      walkingTimeMinutes: 15,
      walkingDistanceMiles: 0.7,
      coordinates: { lat: 40.670272, lng: -73.988593 }
    },
    {
      id: "b61-court-atlantic",
      name: "Court St/Atlantic Av",
      lines: ["B61"],
      walkingTimeMinutes: 5,
      walkingDistanceMiles: 0.3,
      coordinates: { lat: 40.688873, lng: -73.990982 }
    },
    {
      id: "atlantic-barclays",
      name: "Atlantic Av-Barclays Ctr",
      lines: ["N", "Q", "R", "W", "B", "D", "2", "3", "4", "5"],
      walkingTimeMinutes: 30,
      walkingDistanceMiles: 1.2,
      coordinates: { lat: 40.684359, lng: -73.977666 }
    }
  ];

  async getCurrentLocation(): Promise<Location> {
    return this.homeLocation;
  }

  async getWalkingTime(origin: Location, destination: TransitStop): Promise<number> {
    // For static provider, we ignore the origin and use pre-calculated times
    return destination.walkingTimeMinutes;
  }

  async getWalkingTimeToTransit(transitLine: string): Promise<number> {
    // Find all stops that serve this transit line
    const availableStops = this.transitStops.filter(
      stop => stop.lines.includes(transitLine)
    );

    if (availableStops.length === 0) {
      throw new Error(`No transit stops found for line: ${transitLine}`);
    }

    // Return the shortest walking time to any stop serving this line
    return Math.min(...availableStops.map(stop => stop.walkingTimeMinutes));
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

    // Return the stop with shortest walking time
    return availableStops.reduce((closest, current) => 
      current.walkingTimeMinutes < closest.walkingTimeMinutes ? current : closest
    );
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
}
