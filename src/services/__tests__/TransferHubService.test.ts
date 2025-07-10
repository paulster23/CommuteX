import { TransferHubService } from '../TransferHubService';

describe('TransferHubService', () => {
  beforeEach(() => {
    // Reset service state for each test
    (TransferHubService as any).hubs = new Map();
    (TransferHubService as any).initialized = false;
  });

  test('shouldIncludeUserPriorityHubs', () => {
    // Red: Test that user-specified priority hubs are included
    const hubs = TransferHubService.getAllHubs();
    
    const hubNames = hubs.map(hub => hub.name);
    
    // Should include all user-specified priority hubs
    expect(hubNames).toContain('Jay St-MetroTech');
    expect(hubNames).toContain('Broadway-Lafayette St');
    expect(hubNames).toContain('Carroll St');
    expect(hubNames).toContain('Hoyt-Schermerhorn Sts');
  });

  test('shouldPrioritizeUserSpecifiedHubs', () => {
    // Red: Test that user-specified hubs have highest priority
    const hubs = TransferHubService.getAllHubs();
    
    const jayStHub = hubs.find(hub => hub.name === 'Jay St-MetroTech');
    const carrollStHub = hubs.find(hub => hub.name === 'Carroll St');
    
    expect(jayStHub?.isUserPriority).toBe(true);
    expect(jayStHub?.priority).toBe(10);
    
    expect(carrollStHub?.isUserPriority).toBe(true);
    expect(carrollStHub?.priority).toBe(10);
  });

  test('shouldIncludeFAndATrainTransferPoints', () => {
    // Red: Test that F and A train transfer points are included
    const fTrainHubs = TransferHubService.getHubsForLine('F');
    const aTrainHubs = TransferHubService.getHubsForLine('A');
    
    const fHubNames = fTrainHubs.map(hub => hub.name);
    const aHubNames = aTrainHubs.map(hub => hub.name);
    
    // F train key transfer points
    expect(fHubNames).toContain('Jay St-MetroTech');
    expect(fHubNames).toContain('Broadway-Lafayette St');
    expect(fHubNames).toContain('Carroll St');
    
    // A train key transfer points  
    expect(aHubNames).toContain('Jay St-MetroTech');
    expect(aHubNames).toContain('Hoyt-Schermerhorn Sts');
  });

  test('shouldFindConnectingHubsBetweenLines', () => {
    // Red: Test finding hubs that connect F and A trains
    const connectingHubs = TransferHubService.getConnectingHubs('F', 'A');
    
    expect(connectingHubs.length).toBeGreaterThan(0);
    
    const hubNames = connectingHubs.map(hub => hub.name);
    expect(hubNames).toContain('Jay St-MetroTech');
    
    // Should be sorted by priority (user hubs first)
    const firstHub = connectingHubs[0];
    expect(firstHub.isUserPriority).toBe(true);
  });

  test('shouldCalculateTransferTimes', () => {
    // Red: Test that transfer times are calculated for Jay St-MetroTech
    const transferTime = TransferHubService.getTransferTime('Jay St-MetroTech', 'F', 'A');
    
    // F to A at Jay St should be 0 minutes (same platform)
    expect(transferTime).toBe(0);
    
    const reverseTransferTime = TransferHubService.getTransferTime('Jay St-MetroTech', 'A', 'F');
    expect(reverseTransferTime).toBe(0);
  });

  test('shouldFindBestConnectingHub', () => {
    // Red: Test finding best hub to connect F and G trains (should be Carroll St)
    const bestHub = TransferHubService.findBestConnectingHub(['F'], ['G']);
    
    expect(bestHub).not.toBeNull();
    expect(bestHub?.name).toBe('Carroll St');
    expect(bestHub?.isUserPriority).toBe(true);
  });

  test('shouldIncludeMajorSystemHubs', () => {
    // Red: Test that major system hubs are included even if not user-specified
    const hubs = TransferHubService.getAllHubs();
    const hubNames = hubs.map(hub => hub.name);
    
    // Should include major Manhattan hubs
    expect(hubNames.some(name => name.includes('Times Sq'))).toBe(true);
    expect(hubNames.some(name => name.includes('Union Sq'))).toBe(true);
    expect(hubNames.some(name => name.includes('Grand Central'))).toBe(true);
    
    // Should include major Brooklyn hubs
    expect(hubNames.some(name => name.includes('Atlantic'))).toBe(true);
  });

  test('shouldHandleStationComplexes', () => {
    // Red: Test that station complexes are properly consolidated
    const hubs = TransferHubService.getAllHubs();
    
    // Find Times Square complex
    const timesSquareHub = hubs.find(hub => hub.name.includes('Times Sq'));
    expect(timesSquareHub).toBeDefined();
    
    // Should have multiple lines consolidated
    expect(timesSquareHub?.lines.length).toBeGreaterThan(5);
  });

  test('shouldCalculateQuickTransferTimesForCarrollSt', () => {
    // Red: Test Carroll St F↔G transfer time
    const transferTime = TransferHubService.getTransferTime('Carroll St', 'F', 'G');
    
    // Should be quick cross-platform transfer
    expect(transferTime).toBeLessThanOrEqual(2);
  });

  test('shouldPrioritizeHubsByUserPreference', () => {
    // Red: Test that user hubs are prioritized in search results
    const fTrainHubs = TransferHubService.getHubsForLine('F');
    
    // User-specified hubs should appear first
    const firstFewHubs = fTrainHubs.slice(0, 3);
    const userHubCount = firstFewHubs.filter(hub => hub.isUserPriority).length;
    
    expect(userHubCount).toBeGreaterThan(0);
  });
});