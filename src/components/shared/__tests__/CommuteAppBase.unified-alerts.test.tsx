import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../CommuteAppBase';
import { RealMTAService } from '../../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../../services/RealMTAService');

const MockedRealMTAService = RealMTAService as jest.MockedClass<typeof RealMTAService>;

describe('CommuteAppBase - Unified Alert Logic', () => {
  let mockMtaService: jest.Mocked<RealMTAService>;

  beforeEach(() => {
    mockMtaService = {
      calculateAllRoutes: jest.fn().mockResolvedValue([
        {
          id: 1,
          arrivalTime: '8:45 AM',
          duration: '30 min',
          method: 'F train direct',
          details: 'F train from Carroll St to 23rd St',
          transfers: 0,
          hasServiceAlerts: true,
          alertSeverity: 'severe',
          steps: []
        }
      ]),
      calculateAllAfternoonRoutes: jest.fn().mockResolvedValue([
        {
          id: 2,
          arrivalTime: '6:45 PM',
          duration: '30 min',
          method: 'F train direct',
          details: 'F train from 23rd St to Carroll St',
          transfers: 0,
          hasServiceAlerts: true,
          alertSeverity: 'severe',
          steps: []
        }
      ]),
      getServiceAlertsForCommute: jest.fn().mockResolvedValue([]),
      getServiceAlertsForLines: jest.fn().mockResolvedValue([])
    } as jest.Mocked<RealMTAService>;
    
    // Mock the constructor to return our mock instance
    MockedRealMTAService.mockImplementation(() => mockMtaService);
  });

  test('shouldUseSameAlertsForRoutesAndPageInMorningCommute', async () => {
    // Red: Test that morning commute page alerts match route alerts (direction 1 - northbound)
    
    const mockRouteAlerts = [
      {
        id: 'route-alert-1',
        headerText: 'F trains skip Carroll St',
        descriptionText: 'Station-skipping alert for morning commute',
        affectedRoutes: ['F'],
        severity: 'severe' as const,
        informedEntities: [{ routeId: 'F', stopId: 'F20', directionId: 0 }]
      }
    ];

    // Mock getServiceAlertsForCommute (used by routes)
    mockMtaService.getServiceAlertsForCommute = jest.fn().mockResolvedValue(mockRouteAlerts);
    
    // Mock the old method (should not be called after fix)
    mockMtaService.getServiceAlertsForLines = jest.fn().mockResolvedValue([]);

    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Should call getServiceAlertsForCommute with direction 1 (morning/northbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
      
      // Should NOT call the old getServiceAlertsForLines method
      expect(mockMtaService.getServiceAlertsForLines).not.toHaveBeenCalled();
    });
  });

  test('shouldUseSameAlertsForRoutesAndPageInAfternoonCommute', async () => {
    // Red: Test that afternoon commute page alerts match route alerts (direction 0 - southbound)
    
    const mockRouteAlerts = [
      {
        id: 'route-alert-2', 
        headerText: 'F trains skip 23rd St',
        descriptionText: 'Station-skipping alert for afternoon commute',
        affectedRoutes: ['F'],
        severity: 'severe' as const,
        informedEntities: [{ routeId: 'F', stopId: 'F18', directionId: 1 }]
      }
    ];

    // Mock getServiceAlertsForCommute (used by routes)
    mockMtaService.getServiceAlertsForCommute = jest.fn().mockResolvedValue(mockRouteAlerts);
    
    // Mock the old method (should not be called after fix)
    mockMtaService.getServiceAlertsForLines = jest.fn().mockResolvedValue([]);

    const afternoonConfig = {
      title: 'Afternoon Commute',
      origin: '512 W 22nd St, Manhattan',
      destination: '42 Woodhull St, Brooklyn',
      targetArrival: '7:00 PM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    render(<CommuteAppBase config={afternoonConfig} />);

    await waitFor(() => {
      // Should call getServiceAlertsForCommute with direction 0 (afternoon/southbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 0);
      
      // Should NOT call the old getServiceAlertsForLines method
      expect(mockMtaService.getServiceAlertsForLines).not.toHaveBeenCalled();
    });
  });


  test('shouldFallbackToDirection1ForUnknownCommutes', async () => {
    // Red: Test that unknown commute types default to direction 1 (northbound)
    
    mockMtaService.getServiceAlertsForCommute = jest.fn().mockResolvedValue([]);

    const unknownConfig = {
      title: 'Custom Commute',
      origin: 'Unknown Origin',
      destination: 'Unknown Destination', 
      targetArrival: '12:00 PM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    render(<CommuteAppBase config={unknownConfig} />);

    await waitFor(() => {
      // Should default to direction 1 (northbound) for unknown commute types
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
    });
  });
});