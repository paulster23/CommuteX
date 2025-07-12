import { StaticLocationProvider, LocationProvider } from './LocationService';
import { getFeedUrlForLine, getMTAApiKey } from '../config/MTAFeedConfig';

export interface Route {
  id: number;
  arrivalTime: string;
  duration: string;
  method: string;
  details: string;
  transfers?: number;
  walkingDistance?: string;
  walkingToTransit?: number;
  realTimeDelay?: number;
}

export interface GTFSData {
  routes: Route[];
  lastUpdated: Date;
  serviceAlerts?: string[];
}

export class MTAService {
  private readonly MTA_API_KEY = getMTAApiKey() || 'demo-key';
  private readonly GTFS_REALTIME_URL = getFeedUrlForLine('F');
  private readonly locationProvider: LocationProvider;

  constructor(locationProvider?: LocationProvider) {
    this.locationProvider = locationProvider || new StaticLocationProvider();
  }
  
  async fetchRealTimeData(): Promise<GTFSData> {
    try {
      // In a real implementation, this would fetch from MTA GTFS-RT API
      // For now, we'll simulate real-time data with F train only
      const routes = await this.generateRealisticRoutes();
      
      return {
        routes,
        lastUpdated: new Date(),
        serviceAlerts: [
          'F train: Normal service',
          'B61 bus: Normal service'
        ]
      };
    } catch (error) {
      console.error('Failed to fetch MTA data:', error);
      // Fallback to cached/offline data
      return this.getFallbackData();
    }
  }

  async calculateRoutes(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    // Simplified algorithm for F train only
    const routes = await this.runTransitAlgorithm(origin, destination, targetArrival);
    
    // Sort by arrival time (best routes first)
    return routes.sort((a, b) => {
      const timeA = this.parseTime(a.arrivalTime);
      const timeB = this.parseTime(b.arrivalTime);
      return timeA.getTime() - timeB.getTime();
    });
  }

  private async runTransitAlgorithm(
    origin: string,
    destination: string,
    targetArrival: string
  ): Promise<Route[]> {
    // Simplified routing algorithm for F train + B61 bus only
    const currentTime = new Date();
    const targetTime = this.parseTime(targetArrival);
    
    // Calculate route options using only supported transit
    const routes: Route[] = [];
    
    // Get walking times to each transit option
    const b61Walk = await this.locationProvider.getWalkingTimeToTransit('B61');
    const fTrainWalk = await this.locationProvider.getWalkingTimeToTransit('F');
    
    // Route 1: B61 bus + Walk
    const b61TotalTime = b61Walk + 42; // walking to transit + transit time
    routes.push({
      id: 1,
      arrivalTime: this.calculateArrivalTime(currentTime, b61TotalTime, 2),
      duration: `${b61TotalTime} min`,
      method: 'Bus + Walk',
      details: `Walk ${b61Walk} min to B61 bus, B61 to Atlantic Ave-Barclays Ctr, walk 12 min to destination`,
      transfers: 0,
      walkingDistance: '0.6 mi',
      walkingToTransit: b61Walk,
      realTimeDelay: this.getRandomDelay()
    });

    // Route 2: F train direct
    const fTotalTime = fTrainWalk + 34; // walking to transit + F train to 23rd St + final walk
    routes.push({
      id: 2,
      arrivalTime: this.calculateArrivalTime(currentTime, fTotalTime, -2),
      duration: `${fTotalTime} min`,
      method: 'F train + Walk',
      details: `Walk ${fTrainWalk} min to F train, F train to 23rd St, walk 8 min to destination`,
      transfers: 0,
      walkingDistance: '0.4 mi',
      walkingToTransit: fTrainWalk,
      realTimeDelay: this.getRandomDelay()
    });

    return routes;
  }

  private async generateRealisticRoutes(): Promise<Route[]> {
    // Generate routes with real-time variations
    const baseRoutes = await this.runTransitAlgorithm(
      '42 Woodhull St, Brooklyn',
      '512 W 22nd St, Manhattan',
      '9:00 AM'
    );

    // Apply real-time delays and service changes
    return baseRoutes.map(route => ({
      ...route,
      arrivalTime: this.applyRealTimeDelay(route.arrivalTime, route.realTimeDelay || 0),
      details: this.addServiceAlerts(route.details, route.method)
    }));
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

  private calculateArrivalTime(startTime: Date, durationMinutes: number, offsetMinutes: number): string {
    const arrivalTime = new Date(startTime.getTime() + (durationMinutes + offsetMinutes) * 60000);
    return arrivalTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private getRandomDelay(): number {
    // Simulate realistic NYC transit delays (0-5 minutes)
    return Math.floor(Math.random() * 6);
  }

  private applyRealTimeDelay(arrivalTime: string, delayMinutes: number): string {
    const time = this.parseTime(arrivalTime);
    time.setMinutes(time.getMinutes() + delayMinutes);
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private addServiceAlerts(details: string, method: string): string {
    if (method.includes('F train') && Math.random() > 0.8) {
      return `${details} • Service alert: Minor delays`;
    }
    return details;
  }

  private getFallbackData(): GTFSData {
    return {
      routes: [
        {
          id: 1,
          arrivalTime: '8:55 AM',
          duration: '42 min',
          method: 'F train + Walk',
          details: 'F train to 23rd St, then walk (Offline data)',
          transfers: 0,
          walkingDistance: '0.4 mi'
        },
        {
          id: 2,
          arrivalTime: '9:02 AM',
          duration: '47 min',
          method: 'Bus + Walk',
          details: 'B61 to Atlantic Ave, then walk (Offline data)',
          transfers: 0,
          walkingDistance: '0.6 mi'
        }
      ],
      lastUpdated: new Date(),
      serviceAlerts: ['Using offline data - limited real-time information']
    };
  }
}