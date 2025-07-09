import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AfternoonCommuteApp } from '../AfternoonCommuteApp';
import { RealMTAService } from '../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../services/RealMTAService');

const MockedRealMTAService = RealMTAService as jest.MockedClass<typeof RealMTAService>;

describe('AfternoonCommuteApp - Unified Alert Logic', () => {
  let mockMtaService: jest.Mocked<RealMTAService>;

  beforeEach(() => {
    // Mock service with route that has alerts
    mockMtaService = {
      calculateAllRoutes: jest.fn().mockResolvedValue([]),
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
          steps: [
            { type: 'walk', description: 'Walk to 23rd St', duration: 2 },
            { type: 'transit', description: 'F train', duration: 15, line: 'F', fromStation: '23rd St', toStation: 'Carroll St' },
            { type: 'walk', description: 'Walk to destination', duration: 3 }
          ]
        }
      ]),
      getServiceAlertsForCommute: jest.fn().mockResolvedValue([
        {
          id: 'afternoon-alert-1',
          headerText: 'F trains skip 23rd St',
          descriptionText: 'Station-skipping alert for afternoon commute',
          affectedRoutes: ['F'],
          severity: 'severe' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F18', directionId: 1 }]
        }
      ]),
      getServiceAlertsForLines: jest.fn().mockResolvedValue([])
    } as jest.Mocked<RealMTAService>;
    
    // Mock the constructor to return our mock instance
    MockedRealMTAService.mockImplementation(() => mockMtaService);
  });

  test('shouldUseAfternoonDirectionForPageAlerts', async () => {
    // Red: Test that afternoon page uses direction 0 for page alerts (southbound)
    
    render(<AfternoonCommuteApp />);

    await waitFor(() => {
      // Should call getServiceAlertsForCommute with direction 0 (afternoon/southbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 0);
      
      // Should NOT call the old getServiceAlertsForLines method
      expect(mockMtaService.getServiceAlertsForLines).not.toHaveBeenCalled();
    });
  });

  test('shouldShowConsistentAlertsOnRoutesAndPage', async () => {
    // Red: Test that route alerts and page alerts are consistent
    
    const { getByText } = render(<AfternoonCommuteApp />);

    await waitFor(() => {
      // Should show the alert text on the page
      expect(getByText('F trains skip 23rd St')).toBeTruthy();
      expect(getByText('Station-skipping alert for afternoon commute')).toBeTruthy();
    });
  });

  test('shouldShowRouteWithAlertButton', async () => {
    // Red: Test that route has alert button when alerts are present
    
    const { getByText } = render(<AfternoonCommuteApp />);

    await waitFor(() => {
      // Should show route information
      expect(getByText('6:45 PM')).toBeTruthy();
      expect(getByText('30 min')).toBeTruthy();
      
      // Should show alert button (the route has hasServiceAlerts: true)
      expect(getByText('ALERT')).toBeTruthy();
    });
  });

  test('shouldShowAfternoonCommuteTitle', async () => {
    // Red: Test that page shows correct title
    
    const { getByText } = render(<AfternoonCommuteApp />);

    await waitFor(() => {
      // Should show afternoon commute title
      expect(getByText('Afternoon Commute')).toBeTruthy();
    });
  });
});