import { StationMappingService } from '../StationMappingService';

describe('StationMappingService', () => {
  it('shouldReturnCorrectMappingForFTrain', () => {
    const mapping = StationMappingService.getStationMapping('F');
    
    expect(mapping.startingStation).toBe('Carroll St');
    expect(mapping.endingStation).toBe('23rd St');
    expect(mapping.finalWalkingDistance).toBe('0.4 mi');
    expect(mapping.finalWalkingTime).toBe(8);
  });

  it('shouldReturnCorrectMappingForRTrain', () => {
    const mapping = StationMappingService.getStationMapping('R');
    
    expect(mapping.startingStation).toBe('Union St');
    expect(mapping.endingStation).toBe('23rd St');
    expect(mapping.finalWalkingDistance).toBe('0.5 mi');
    expect(mapping.finalWalkingTime).toBe(10);
  });

  it('shouldReturnCorrectMappingFor4Train', () => {
    const mapping = StationMappingService.getStationMapping('4');
    
    expect(mapping.startingStation).toBe('Borough Hall');
    expect(mapping.endingStation).toBe('14th St-Union Sq');
    expect(mapping.finalWalkingDistance).toBe('1.2 mi');
    expect(mapping.finalWalkingTime).toBe(24);
  });

  it('shouldReturnDefaultMappingForUnknownRoute', () => {
    const mapping = StationMappingService.getStationMapping('X');
    
    expect(mapping.startingStation).toBe('Unknown Station');
    expect(mapping.endingStation).toBe('Unknown Station');
    expect(mapping.finalWalkingDistance).toBe('0.5 mi');
    expect(mapping.finalWalkingTime).toBe(10);
  });

  it('shouldIncludeFinalWalkingTimeForAllRoutes', () => {
    const routes = ['F', 'R', '4', 'N', 'Q', 'W'];
    
    routes.forEach(route => {
      const mapping = StationMappingService.getStationMapping(route);
      expect(mapping.finalWalkingTime).toBeGreaterThan(0);
      expect(mapping.finalWalkingDistance).toBeTruthy();
    });
  });
});
