export interface StationMapping {
  startingStation: string;
  endingStation: string;
  finalWalkingDistance: string;
  finalWalkingTime: number; // in minutes
}

export class StationMappingService {
  // Work destination: 512 W 22nd St, Manhattan (between 10th and 11th Ave)
  private static readonly STATION_MAPPINGS: { [key: string]: StationMapping } = {
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
}
