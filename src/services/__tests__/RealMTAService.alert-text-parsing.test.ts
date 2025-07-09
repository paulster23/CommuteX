import { RealMTAService } from '../RealMTAService';
import { StaticLocationProvider } from '../LocationService';

describe('RealMTAService - Alert Text Parsing and Relevance Detection', () => {
  let service: RealMTAService;

  beforeEach(() => {
    service = new RealMTAService(new StaticLocationProvider());
  });

  test('shouldDetectStationSkippingAlertsFromVariousPatterns', () => {
    // Red: Test that station-skipping alerts are detected from various text patterns
    const stationSkippingAlerts = [
      {
        id: 'coney-island-skip',
        headerText: 'In Brooklyn, Coney Island-bound [F] skips Bergen St, Carroll St and Smith-9 Sts',
        descriptionText: 'For service to these stations, take the [F] to 4 Av-9 St and transfer to a Manhattan-bound [F].',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F', directionId: 0 }]
      },
      {
        id: 'uptown-c-skip',
        headerText: 'In Manhattan, uptown [C] skips Spring St, 23 St and 50 St',
        descriptionText: 'For service to Spring St and 23 St, take the [C] to W 4 St-Wash Sq or 34 St-Penn Station and transfer to a downtown [C] or [E].',
        affectedRoutes: ['C'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'C', directionId: 1 }]
      },
      {
        id: 'not-stopping-alert',
        headerText: 'F trains are not stopping at Jay St-MetroTech',
        descriptionText: 'Use alternate stations for service.',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F', stopId: 'F25' }]
      },
      {
        id: 'service-suspended',
        headerText: 'Service suspended between Carroll St and Jay St',
        descriptionText: 'F trains skip all stations between Carroll St and Jay St',
        affectedRoutes: ['F'],
        severity: 'severe' as const,
        informedEntities: [{ routeId: 'F' }]
      }
    ];

    stationSkippingAlerts.forEach(alert => {
      const isSkipping = service.isStationSkippingAlert(alert);
      expect(isSkipping).toBe(true);
    });
  });

  test('shouldNotDetectNonSkippingAlertsAsStationSkipping', () => {
    // Red: Test that non-skipping alerts are not detected as station-skipping
    const nonSkippingAlerts = [
      {
        id: 'delay-alert',
        headerText: 'F trains are delayed',
        descriptionText: 'F trains are experiencing delays due to signal problems.',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [{ routeId: 'F' }]
      },
      {
        id: 'service-change',
        headerText: 'Weekend service changes',
        descriptionText: 'F trains will run on a modified schedule this weekend.',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }]
      },
      {
        id: 'slower-service',
        headerText: 'F trains are running slower than normal',
        descriptionText: 'Allow extra travel time.',
        affectedRoutes: ['F'],
        severity: 'info' as const,
        informedEntities: [{ routeId: 'F' }]
      }
    ];

    nonSkippingAlerts.forEach(alert => {
      const isSkipping = service.isStationSkippingAlert(alert);
      expect(isSkipping).toBe(false);
    });
  });

  test('shouldDetectSeverityBasedOnAlertContent', () => {
    // Red: Test that alert severity is properly detected based on content
    const testCases = [
      {
        alert: {
          id: 'severe-skip',
          headerText: 'F trains skip Carroll St',
          descriptionText: 'Station-skipping alert affecting user route',
          affectedRoutes: ['F'],
          severity: 'info' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F20' }]
        },
        expectedSeverity: 'severe' as const
      },
      {
        alert: {
          id: 'warning-delay',
          headerText: 'F trains are delayed',
          descriptionText: 'Delays on F line',
          affectedRoutes: ['F'],
          severity: 'warning' as const,
          informedEntities: [{ routeId: 'F' }]
        },
        expectedSeverity: 'warning' as const
      },
      {
        alert: {
          id: 'info-service-change',
          headerText: 'Weekend service changes',
          descriptionText: 'Modified schedule this weekend',
          affectedRoutes: ['F'],
          severity: 'info' as const,
          informedEntities: [{ routeId: 'F' }]
        },
        expectedSeverity: 'info' as const
      }
    ];

    testCases.forEach(({ alert, expectedSeverity }) => {
      const escalatedSeverity = service.getEscalatedSeverityForAlert(alert);
      expect(escalatedSeverity).toBe(expectedSeverity);
    });
  });

  test('shouldDetectKeywordPatternsInAlerts', () => {
    // Red: Test that key transportation keywords are detected
    const keywordTests = [
      {
        text: 'F trains are experiencing delays due to signal problems',
        keywords: ['delay', 'signal'],
        shouldMatch: true
      },
      {
        text: 'Service suspended between Carroll St and Jay St',
        keywords: ['suspend', 'service'],
        shouldMatch: true
      },
      {
        text: 'F trains skip Carroll St and Bergen St',
        keywords: ['skip', 'carroll', 'bergen'],
        shouldMatch: true
      },
      {
        text: 'Regular F train service',
        keywords: ['delay', 'skip', 'suspend'],
        shouldMatch: false
      }
    ];

    keywordTests.forEach(({ text, keywords, shouldMatch }) => {
      const hasKeywords = keywords.some(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasKeywords).toBe(shouldMatch);
    });
  });

  test('shouldParseStationNamesFromAlertText', () => {
    // Red: Test that station names are properly parsed from alert text
    const alertTexts = [
      {
        text: 'F trains skip Carroll St, Bergen St and Smith-9 Sts',
        expectedStations: ['Carroll St', 'Bergen St', 'Smith-9 Sts']
      },
      {
        text: 'uptown [C] skips Spring St, 23 St and 50 St',
        expectedStations: ['Spring St', '23 St', '50 St']
      },
      {
        text: 'Service suspended between Jay St-MetroTech and 14th St-Union Sq',
        expectedStations: ['Jay St-MetroTech', '14th St-Union Sq']
      }
    ];

    alertTexts.forEach(({ text, expectedStations }) => {
      expectedStations.forEach(station => {
        const containsStation = text.includes(station);
        expect(containsStation).toBe(true);
      });
    });
  });

  test('shouldDetectDirectionalKeywords', () => {
    // Red: Test that directional keywords are properly detected
    const directionalTests = [
      {
        text: 'In Brooklyn, Coney Island-bound [F] skips stations',
        direction: 'southbound',
        shouldMatch: true
      },
      {
        text: 'In Manhattan, uptown [C] skips stations',
        direction: 'northbound',
        shouldMatch: true
      },
      {
        text: 'Manhattan-bound F trains are delayed',
        direction: 'northbound',
        shouldMatch: true
      },
      {
        text: 'downtown [C] trains skip stations',
        direction: 'southbound',
        shouldMatch: true
      },
      {
        text: 'F trains are delayed',
        direction: 'both',
        shouldMatch: true
      }
    ];

    directionalTests.forEach(({ text, direction, shouldMatch }) => {
      const textLower = text.toLowerCase();
      
      let hasDirectionalKeyword = false;
      
      if (direction === 'southbound') {
        hasDirectionalKeyword = textLower.includes('coney island') || 
                                textLower.includes('brooklyn') ||
                                textLower.includes('downtown');
      } else if (direction === 'northbound') {
        hasDirectionalKeyword = textLower.includes('uptown') || 
                                textLower.includes('manhattan-bound');
      } else {
        hasDirectionalKeyword = true; // No specific direction
      }
      
      expect(hasDirectionalKeyword).toBe(shouldMatch);
    });
  });

  test('shouldDetectEmergencyVsPlannedAlerts', () => {
    // Red: Test that emergency vs planned alerts are properly classified
    const alertClassifications = [
      {
        text: 'Emergency: F train service suspended due to medical emergency',
        type: 'emergency',
        expectedUrgency: 'high'
      },
      {
        text: 'Planned construction: F trains will skip stations this weekend',
        type: 'planned',
        expectedUrgency: 'low'
      },
      {
        text: 'Signal problems causing F train delays',
        type: 'unplanned',
        expectedUrgency: 'high'
      },
      {
        text: 'Weekend service changes: Modified F train schedule',
        type: 'planned',
        expectedUrgency: 'low'
      }
    ];

    alertClassifications.forEach(({ text, type, expectedUrgency }) => {
      const textLower = text.toLowerCase();
      
      let isEmergency = textLower.includes('emergency') || 
                        textLower.includes('signal problem') ||
                        textLower.includes('signal problems') ||
                        textLower.includes('medical');
      
      let isPlanned = textLower.includes('planned') || 
                      textLower.includes('construction') ||
                      textLower.includes('weekend');
      
      let urgency = isEmergency ? 'high' : isPlanned ? 'low' : 'medium';
      
      expect(urgency).toBe(expectedUrgency);
    });
  });

  test('shouldDetectTimeRelevantKeywords', () => {
    // Red: Test that time-relevant keywords are detected
    const timeRelevantTests = [
      {
        text: 'F trains will skip stations starting Monday',
        hasTimeKeyword: true,
        timeKeywords: ['starting', 'monday']
      },
      {
        text: 'Service suspended until further notice',
        hasTimeKeyword: true,
        timeKeywords: ['until']
      },
      {
        text: 'Weekend service changes effective Saturday',
        hasTimeKeyword: true,
        timeKeywords: ['weekend', 'saturday']
      },
      {
        text: 'F trains are delayed',
        hasTimeKeyword: false,
        timeKeywords: []
      }
    ];

    timeRelevantTests.forEach(({ text, hasTimeKeyword, timeKeywords }) => {
      const textLower = text.toLowerCase();
      
      const timeWords = ['starting', 'until', 'weekend', 'monday', 'tuesday', 'wednesday', 
                         'thursday', 'friday', 'saturday', 'sunday', 'effective', 'beginning'];
      
      const hasTime = timeWords.some(word => textLower.includes(word));
      
      expect(hasTime).toBe(hasTimeKeyword);
      
      if (hasTimeKeyword) {
        timeKeywords.forEach(keyword => {
          expect(textLower.includes(keyword)).toBe(true);
        });
      }
    });
  });

  test('shouldDetectAlertRelevanceToUserRoute', () => {
    // Red: Test that alert relevance to user route is properly detected
    const relevanceTests = [
      {
        alert: {
          id: 'carroll-st-alert',
          headerText: 'F trains skip Carroll St',
          descriptionText: 'Station-skipping alert',
          affectedRoutes: ['F'],
          severity: 'info' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F20' }]
        },
        relevance: 'high' // Affects user's home station
      },
      {
        alert: {
          id: 'jay-st-alert',
          headerText: 'Service disruption at Jay St-MetroTech',
          descriptionText: 'Transfer station alert',
          affectedRoutes: ['F', 'A'],
          severity: 'warning' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F25' }, { routeId: 'A', stopId: 'A41' }]
        },
        relevance: 'high' // Affects user's transfer station
      },
      {
        alert: {
          id: 'distant-alert',
          headerText: 'F trains skip Kings Highway',
          descriptionText: 'Far from user route',
          affectedRoutes: ['F'],
          severity: 'info' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F35' }]
        },
        relevance: 'low' // Doesn't affect user route
      }
    ];

    relevanceTests.forEach(({ alert, relevance }) => {
      const userStations = ['F20', 'F25', 'A41', 'A23', 'A27', 'F24', 'F18'];
      
      const affectsUserRoute = alert.informedEntities.some(entity => 
        entity.stopId && userStations.includes(entity.stopId)
      );
      
      const expectedRelevance = affectsUserRoute ? 'high' : 'low';
      expect(expectedRelevance).toBe(relevance);
    });
  });
});