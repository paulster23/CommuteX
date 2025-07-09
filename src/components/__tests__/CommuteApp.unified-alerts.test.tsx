import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CommuteApp } from '../CommuteApp';
import { RealMTAService } from '../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../services/RealMTAService');

const MockedRealMTAService = RealMTAService as jest.MockedClass<typeof RealMTAService>;

describe('CommuteApp (Morning) - Unified Alert Logic', () => {
  let mockMtaService: jest.Mocked<RealMTAService>;

  beforeEach(() => {
    // Mock service with route that has alerts
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
          steps: [
            { type: 'walk', description: 'Walk to Carroll St', duration: 3 },
            { type: 'transit', description: 'F train', duration: 15, line: 'F', fromStation: 'Carroll St', toStation: '23rd St' },
            { type: 'walk', description: 'Walk to destination', duration: 2 }
          ]
        }
      ]),
      calculateAllAfternoonRoutes: jest.fn().mockResolvedValue([]),
      getServiceAlertsForCommute: jest.fn().mockResolvedValue([
        {
          id: 'morning-alert-1',
          headerText: 'F trains skip Carroll St',
          descriptionText: 'Station-skipping alert for morning commute',
          affectedRoutes: ['F'],
          severity: 'severe' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F20', directionId: 0 }]
        }
      ]),
      getServiceAlertsForLines: jest.fn().mockResolvedValue([])
    } as jest.Mocked<RealMTAService>;
    
    // Mock the constructor to return our mock instance
    MockedRealMTAService.mockImplementation(() => mockMtaService);
  });

  test('shouldUseMorningDirectionForPageAlerts', async () => {
    // Red: Test that morning page uses direction 1 for page alerts (northbound)
    
    render(<CommuteApp />);

    await waitFor(() => {
      // Should call getServiceAlertsForCommute with direction 1 (morning/northbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
      
      // Should NOT call the old getServiceAlertsForLines method
      expect(mockMtaService.getServiceAlertsForLines).not.toHaveBeenCalled();
    });
  });

  test('shouldShowConsistentAlertsOnRoutesAndPage', async () => {
    // Red: Test that route alerts and page alerts are consistent
    
    const { getByText } = render(<CommuteApp />);

    await waitFor(() => {
      // Should show the alert text on the page
      expect(getByText('F trains skip Carroll St')).toBeTruthy();
      expect(getByText('Station-skipping alert for morning commute')).toBeTruthy();
    });
  });

  test('shouldShowRouteWithAlertButton', async () => {
    // Red: Test that route has alert button when alerts are present
    
    const { getByText } = render(<CommuteApp />);

    await waitFor(() => {
      // Should show route information
      expect(getByText('8:45 AM')).toBeTruthy();
      expect(getByText('30 min')).toBeTruthy();
      
      // Should show alert button (the route has hasServiceAlerts: true)
      expect(getByText('ALERT')).toBeTruthy();
    });
  });
});