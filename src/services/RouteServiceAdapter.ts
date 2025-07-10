/**
 * Route Service Adapter
 * Bridges RouteFinderService with existing UI Route interface
 * Converts dynamic route finding to the format expected by UI components
 */

import { RouteFinderService, SubwayRoute, RouteRequest } from './RouteFinderService';
import { NearestStationService, ConsolidatedStationResult } from './NearestStationService';
import { Route, RouteStep as UIRouteStep } from './RealMTAService';

export interface TripRequest {
  fromAddress: string;
  toAddress: string;
  departureTime?: Date;
  maxTransfers?: number;
  preferDirect?: boolean;
  useRealTimeData?: boolean;
}

export class RouteServiceAdapter {
  private static initialized = false;

  /**
   * Initialize the adapter
   */
  private static initialize(): void {
    if (this.initialized) return;
    
    RouteFinderService.initialize();
    this.initialized = true;
  }

  /**
   * Get routes for a trip between two addresses
   */
  static async getRoutesForTrip(request: TripRequest): Promise<Route[]> {
    this.initialize();

    try {
      // Find nearest stations for addresses
      const fromStation = this.findNearestStation(request.fromAddress);
      const toStation = this.findNearestStation(request.toAddress);

      if (!fromStation || !toStation) {
        console.warn('[RouteServiceAdapter] Could not find stations for addresses');
        return [];
      }

      // Build RouteFinderService request
      const routeRequest: RouteRequest = {
        fromStation: fromStation.name,
        toStation: toStation.name,
        departureTime: request.departureTime || new Date(),
        maxTransfers: request.maxTransfers,
        fallbackToEstimated: true
      };

      console.log('[RouteServiceAdapter] Route request:', {
        from: routeRequest.fromStation,
        to: routeRequest.toStation,
        maxTransfers: routeRequest.maxTransfers
      });

      // Get routes from RouteFinderService
      let subwayRoutes: SubwayRoute[];
      if (request.useRealTimeData !== false) {
        console.log('[RouteServiceAdapter] Using real-time data route finding');
        subwayRoutes = await RouteFinderService.findRoutesWithRealTimeData(routeRequest);
      } else {
        console.log('[RouteServiceAdapter] Using basic route finding');
        subwayRoutes = RouteFinderService.findRoutes(routeRequest);
      }

      console.log('[RouteServiceAdapter] Found subway routes:', subwayRoutes.length, subwayRoutes.map(r => r.lines.join('→')));

      // Convert to UI Route format
      const routes = await Promise.all(
        subwayRoutes.map((route, index) => 
          this.convertSubwayRouteToUIRoute(route, index, fromStation, toStation, request)
        )
      );

      return routes.sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes);

    } catch (error) {
      console.error('[RouteServiceAdapter] Error getting routes:', error);
      return [];
    }
  }

  /**
   * Find nearest station to an address
   */
  static findNearestStation(address: string): ConsolidatedStationResult | null {
    try {
      // For known addresses, use direct coordinate mappings
      if (address.includes('42 Woodhull St') || address.includes('Carroll')) {
        // Closer to Carroll St station
        const result = NearestStationService.findNearestStationConsolidated({
          lat: 40.6806,
          lng: -73.9950
        });
        console.log('[RouteServiceAdapter] Found station for home address:', result?.name, 'lines:', result?.lines);
        return result;
      }
      
      if (address.includes('512 W 22nd St') || address.includes('23rd')) {
        // Closer to 23rd St stations
        const result = NearestStationService.findNearestStationConsolidated({
          lat: 40.7462,
          lng: -74.0014
        });
        console.log('[RouteServiceAdapter] Found station for work address:', result?.name, 'lines:', result?.lines);
        return result;
      }

      // For other addresses, we'd need geocoding integration
      // For now, return null to indicate we can't resolve the address
      console.warn('[RouteServiceAdapter] Address resolution not implemented for:', address);
      return null;

    } catch (error) {
      console.error('[RouteServiceAdapter] Error finding nearest station:', error);
      return null;
    }
  }

  /**
   * Convert SubwayRoute to UI Route format
   */
  private static async convertSubwayRouteToUIRoute(
    subwayRoute: SubwayRoute,
    index: number,
    fromStation: ConsolidatedStationResult,
    toStation: ConsolidatedStationResult,
    request: TripRequest
  ): Promise<Route> {
    const departureTime = request.departureTime || new Date();
    const arrivalTime = new Date(departureTime.getTime() + subwayRoute.totalTimeMinutes * 60000);
    
    // Extract route information
    const transferCount = subwayRoute.transferCount;
    const lines = subwayRoute.lines;
    const isDirect = subwayRoute.isDirect;
    
    // Generate method description
    const method = this.generateMethodDescription(subwayRoute);
    
    // Generate route details
    const details = this.generateRouteDetails(subwayRoute, fromStation.name, toStation.name);
    
    // Convert route steps
    const uiSteps = await this.convertRouteSteps(subwayRoute.steps, fromStation, toStation);
    
    // Calculate walking times (using existing pattern)
    const walkingToTransit = 3; // minutes to walk to starting station
    const finalWalkingTime = 8; // minutes from ending station to destination
    
    // Find transfer station for transfer routes
    const transferStation = transferCount > 0 ? 
      subwayRoute.steps.find(step => step.type === 'transfer')?.station : 
      undefined;

    return {
      id: index + 1,
      arrivalTime: this.formatTime(arrivalTime),
      duration: `${subwayRoute.totalTimeMinutes} min`,
      method,
      details,
      transfers: transferCount,
      walkingToTransit,
      isRealTimeData: subwayRoute.isRealTimeData || false,
      confidence: this.convertConfidence(subwayRoute.confidence),
      startingStation: fromStation.name,
      endingStation: toStation.name,
      waitTime: this.getInitialWaitTime(subwayRoute),
      nextTrainDeparture: this.getNextDepartureTime(subwayRoute, departureTime),
      finalWalkingTime,
      transitTime: subwayRoute.totalTimeMinutes - walkingToTransit - finalWalkingTime,
      steps: uiSteps,
      
      // Additional properties for transfer routes
      transferCount,
      transferStation,
      lines,
      totalTimeMinutes: subwayRoute.totalTimeMinutes
    } as Route & {
      transferCount: number;
      transferStation?: string;
      lines: string[];
      totalTimeMinutes: number;
    };
  }

  /**
   * Generate method description for route
   */
  private static generateMethodDescription(route: SubwayRoute): string {
    if (route.isDirect) {
      return `Direct ${route.lines[0]} train`;
    } else if (route.transferCount === 1) {
      return `${route.lines.join('→')} trains (1 transfer)`;
    } else {
      return `${route.lines.join('→')} trains (${route.transferCount} transfers)`;
    }
  }

  /**
   * Generate detailed route description
   */
  private static generateRouteDetails(
    route: SubwayRoute, 
    fromStation: string, 
    toStation: string
  ): string {
    if (route.isDirect) {
      return `Take ${route.lines[0]} train from ${fromStation} to ${toStation}, then walk to destination`;
    } else {
      const steps = route.steps
        .filter(step => step.type === 'board' || step.type === 'transfer')
        .map(step => {
          if (step.type === 'board') {
            return `Take ${step.line} train from ${step.station}`;
          } else {
            return `transfer to ${step.line} train at ${step.station}`;
          }
        });
      
      return `${steps.join(', ')}, then walk to destination`;
    }
  }

  /**
   * Convert RouteFinderService steps to UI RouteStep format
   */
  private static async convertRouteSteps(
    steps: import('./RouteFinderService').RouteStep[],
    fromStation: ConsolidatedStationResult,
    toStation: ConsolidatedStationResult
  ): Promise<UIRouteStep[]> {
    const uiSteps: UIRouteStep[] = [];

    // Add initial walking step
    uiSteps.push({
      type: 'walk',
      description: `Walk to ${fromStation.name}`,
      duration: 3,
      dataSource: 'estimate',
      walkingTime: 3,
      instruction: `Walk 3 minutes to ${fromStation.name} station`
    } as UIRouteStep & { walkingTime: number; instruction: string });

    // Convert route steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (step.type === 'board') {
        uiSteps.push({
          type: 'wait',
          description: `Wait for ${step.line} train`,
          duration: step.waitTimeMinutes || 2,
          dataSource: step.nextDeparture ? 'realtime' : 'estimate',
          line: step.line,
          waitTime: step.waitTimeMinutes || 2,
          instruction: step.instructions,
          nextDeparture: step.nextDeparture
        } as UIRouteStep & { waitTime: number; instruction: string; nextDeparture?: Date });

        // Find the destination for this transit segment
        // Look for the next transfer or arrive step
        let destination = toStation.name; // Default to final destination
        for (let j = i + 1; j < steps.length; j++) {
          if (steps[j].type === 'transfer' || steps[j].type === 'arrive') {
            destination = steps[j].station;
            break;
          }
        }

        uiSteps.push({
          type: 'transit',
          description: `${step.line} train to ${destination}`,
          duration: 5, // Will be calculated based on next step
          dataSource: 'estimate',
          line: step.line,
          instruction: step.instructions
        } as UIRouteStep & { instruction: string });

      } else if (step.type === 'transfer') {
        uiSteps.push({
          type: 'transfer',
          description: `Transfer to ${step.line} train`,
          duration: step.transferTimeMinutes || 2,
          dataSource: 'estimate',
          line: step.line,
          transferTime: step.transferTimeMinutes || 2,
          transferStation: step.station,
          instruction: step.instructions
        } as UIRouteStep & { 
          transferTime: number; 
          transferStation: string; 
          instruction: string 
        });

        uiSteps.push({
          type: 'wait',
          description: `Wait for ${step.line} train`,
          duration: step.waitTimeMinutes || 2,
          dataSource: step.nextDeparture ? 'realtime' : 'estimate',
          line: step.line,
          waitTime: step.waitTimeMinutes || 2,
          instruction: `Wait for the ${step.line} train`,
          nextDeparture: step.nextDeparture
        } as UIRouteStep & { waitTime: number; instruction: string; nextDeparture?: Date });

        // Add transit step after transfer
        // Find the destination for this transit segment
        let destination = toStation.name; // Default to final destination
        for (let j = i + 1; j < steps.length; j++) {
          if (steps[j].type === 'transfer' || steps[j].type === 'arrive') {
            destination = steps[j].station;
            break;
          }
        }

        uiSteps.push({
          type: 'transit',
          description: `${step.line} train to ${destination}`,
          duration: 5, // Will be calculated based on next step
          dataSource: 'estimate',
          line: step.line,
          instruction: step.instructions
        } as UIRouteStep & { instruction: string });
      }
    }

    // Add final walking step
    uiSteps.push({
      type: 'walk',
      description: `Walk to destination`,
      duration: 8,
      dataSource: 'estimate',
      walkingTime: 8,
      instruction: `Walk 8 minutes from ${toStation.name} to destination`
    } as UIRouteStep & { walkingTime: number; instruction: string });

    return uiSteps;
  }

  /**
   * Convert confidence score to UI confidence level
   */
  private static convertConfidence(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  /**
   * Get initial wait time from route
   */
  private static getInitialWaitTime(route: SubwayRoute): number {
    const firstBoardStep = route.steps.find(step => step.type === 'board');
    return firstBoardStep?.waitTimeMinutes || 2;
  }

  /**
   * Get next departure time formatted as string
   */
  private static getNextDepartureTime(route: SubwayRoute, departureTime: Date): string {
    const firstBoardStep = route.steps.find(step => step.type === 'board');
    
    if (firstBoardStep?.nextDeparture) {
      return this.formatTime(firstBoardStep.nextDeparture);
    }
    
    // Fallback to estimated departure time
    const waitTime = firstBoardStep?.waitTimeMinutes || 2;
    const estimatedDeparture = new Date(departureTime.getTime() + waitTime * 60000);
    return this.formatTime(estimatedDeparture);
  }

  /**
   * Format time as string (e.g., "2:45:00 PM")
   */
  private static formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}