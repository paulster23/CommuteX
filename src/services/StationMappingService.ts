export interface StationMapping {
  startingStation: string;
  endingStation: string;
  finalWalkingDistance: string;
  finalWalkingTime: number; // in minutes
  transferStation?: string;
  transferToLines?: string[];
  transferWalkingTime?: number; // time to walk between platforms during transfer
}

export class StationMappingService {
  // Work destination: 512 W 22nd St, Manhattan (between 10th and 11th Ave)
  private static readonly STATION_MAPPINGS: { [key: string]: StationMapping } = {
    // Direct routes
    'F': {
      startingStation: 'Carroll St',
      endingStation: '23rd St',
      finalWalkingDistance: '0.4 mi', // 23rd St station at 6th Ave to 512 W 22nd St
      finalWalkingTime: 8 // ~8 minute walk from 6th Ave to between 10th/11th Ave
    },
    'R': {
      startingStation: 'Union St',
      endingStation: '23rd St',
      finalWalkingDistance: '0.5 mi', // 23rd St station at Broadway to 512 W 22nd St
      finalWalkingTime: 10 // ~10 minute walk from Broadway to between 10th/11th Ave
    },
    '4': {
      startingStation: 'Borough Hall',
      endingStation: '14th St-Union Sq',
      finalWalkingDistance: '1.2 mi', // 14th St-Union Sq to 512 W 22nd St
      finalWalkingTime: 24 // ~24 minute walk from Union Sq to destination
    },
    'N': {
      startingStation: 'Union St',
      endingStation: '23rd St',
      finalWalkingDistance: '0.5 mi', // 23rd St station at Broadway to 512 W 22nd St
      finalWalkingTime: 10 // ~10 minute walk from Broadway to between 10th/11th Ave
    },
    'Q': {
      startingStation: 'DeKalb Ave',
      endingStation: '23rd St',
      finalWalkingDistance: '0.5 mi', // 23rd St station at Broadway to 512 W 22nd St
      finalWalkingTime: 10 // ~10 minute walk from Broadway to between 10th/11th Ave
    },
    'W': {
      startingStation: 'Union St',
      endingStation: '23rd St',
      finalWalkingDistance: '0.5 mi', // 23rd St station at Broadway to 512 W 22nd St
      finalWalkingTime: 10 // ~10 minute walk from Broadway to between 10th/11th Ave
    },
    
    // Transfer routes
    'F→A': {
      startingStation: 'Carroll St',
      transferStation: 'Jay St-MetroTech',
      transferToLines: ['A', 'C'],
      transferWalkingTime: 0.5, // 30 seconds to transfer between F and A/C platforms
      endingStation: '14th St-8th Ave',
      finalWalkingDistance: '0.6 mi', // 14th St-8th Ave to 512 W 22nd St
      finalWalkingTime: 12 // ~12 minute walk from 8th Ave to between 10th/11th Ave
    },
    'F→C': {
      startingStation: 'Carroll St',
      transferStation: 'Jay St-MetroTech',
      transferToLines: ['A', 'C'],
      transferWalkingTime: 0.5, // 30 seconds to transfer between F and A/C platforms
      endingStation: '23rd St-8th Ave',
      finalWalkingDistance: '0.3 mi', // 23rd St-8th Ave to 512 W 22nd St
      finalWalkingTime: 6 // ~6 minute walk from 8th Ave to between 10th/11th Ave
    },
    'F→L': {
      startingStation: 'Carroll St',
      transferStation: '14th St-Union Sq',
      transferToLines: ['L'],
      transferWalkingTime: 4, // ~4 min to transfer from F to L at Union Sq
      endingStation: '14th St-8th Ave',
      finalWalkingDistance: '0.6 mi',
      finalWalkingTime: 12
    },
    'R→L': {
      startingStation: 'Union St',
      transferStation: '14th St-Union Sq',
      transferToLines: ['L'],
      transferWalkingTime: 2, // ~2 min to transfer from R to L at Union Sq
      endingStation: '14th St-8th Ave',
      finalWalkingDistance: '0.6 mi',
      finalWalkingTime: 12
    },
    'F→N': {
      startingStation: 'Carroll St',
      transferStation: 'DeKalb Ave',
      transferToLines: ['N', 'Q', 'R', 'W'],
      transferWalkingTime: 2, // Same platform transfer
      endingStation: '23rd St',
      finalWalkingDistance: '0.5 mi',
      finalWalkingTime: 10
    },
    'F→A→C': {
      startingStation: 'Carroll St',
      transferStation: 'Jay St-MetroTech',
      transferToLines: ['A'],
      transferWalkingTime: 0, // Same platform transfer F to A
      endingStation: '23rd St-8th Ave',
      finalWalkingDistance: '0.3 mi', // 23rd St-8th Ave to 512 W 22nd St
      finalWalkingTime: 6 // ~6 minute walk from 8th Ave to between 10th/11th Ave
    }
  };

  static getStationMapping(routeId: string): StationMapping {
    return this.STATION_MAPPINGS[routeId] || {
      startingStation: 'Unknown Station',
      endingStation: 'Unknown Station',
      finalWalkingDistance: '0.5 mi',
      finalWalkingTime: 10
    };
  }

  static getAllRouteMappings(): { [key: string]: StationMapping } {
    return this.STATION_MAPPINGS;
  }

  static getTransferRoutes(): { [key: string]: StationMapping } {
    const transferRoutes: { [key: string]: StationMapping } = {};
    
    Object.entries(this.STATION_MAPPINGS).forEach(([key, mapping]) => {
      if (mapping.transferStation) {
        transferRoutes[key] = mapping;
      }
    });
    
    return transferRoutes;
  }
}
