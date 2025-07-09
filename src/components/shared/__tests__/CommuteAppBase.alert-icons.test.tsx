import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../CommuteAppBase';
import { RealMTAService } from '../../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../../services/RealMTAService');

const MockedRealMTAService = RealMTAService as jest.MockedClass<typeof RealMTAService>;

describe('CommuteAppBase - Alert Icons and Direction Indicators', () => {
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
      calculateAllAfternoonRoutes: jest.fn().mockResolvedValue([]),
      getServiceAlertsForCommute: jest.fn().mockResolvedValue([
        {
          id: 'alert-1',
          headerText: 'F trains skip Carroll St',
          descriptionText: 'Station-skipping alert for morning commute',
          affectedRoutes: ['F'],
          severity: 'severe' as const,
          informedEntities: [{ routeId: 'F', stopId: 'F20', directionId: 0 }]
        },
        {
          id: 'alert-2',
          headerText: 'C trains delayed',
          descriptionText: 'Delays due to signal problems',
          affectedRoutes: ['C'],
          severity: 'warning' as const,
          informedEntities: [{ routeId: 'C', stopId: 'C10', directionId: 1 }]
        }
      ]),
      getServiceAlertsForLines: jest.fn().mockResolvedValue([])
    } as jest.Mocked<RealMTAService>;
    
    // Mock the constructor to return our mock instance
    MockedRealMTAService.mockImplementation(() => mockMtaService);
  });

  test('shouldShowSubwayLineIconsForEachAlert', async () => {
    // Red: Test that each alert shows subway line icons
    
    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockMtaService.calculateAllRoutes
    };

    const { getAllByText } = render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Should show F train icon for F train alert (may be multiple F's from routes and alerts)
      expect(getAllByText('F').length).toBeGreaterThan(0);
      
      // Should show C train icon for C train alert
      expect(getAllByText('C').length).toBeGreaterThan(0);
    });
  });

  test('shouldShowDirectionArrowsForEachAlert', async () => {
    // Red: Test that each alert shows direction arrows based on directionId
    
    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockMtaService.calculateAllRoutes
    };

    const { getByText } = render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Should show southbound arrow for directionId 0
      expect(getByText('↓')).toBeTruthy();
      
      // Should show northbound arrow for directionId 1
      expect(getByText('↑')).toBeTruthy();
    });
  });

  test('shouldShowMultipleLineIconsForMultiLineAlerts', async () => {
    // Red: Test that alerts affecting multiple lines show multiple icons
    
    mockMtaService.getServiceAlertsForCommute = jest.fn().mockResolvedValue([
      {
        id: 'alert-multiline',
        headerText: 'F and C trains delayed',
        descriptionText: 'Service disruption affecting both lines',
        affectedRoutes: ['F', 'C'],
        severity: 'warning' as const,
        informedEntities: [
          { routeId: 'F', stopId: 'F20', directionId: 0 },
          { routeId: 'C', stopId: 'C10', directionId: 0 }
        ]
      }
    ]);

    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockMtaService.calculateAllRoutes
    };

    const { getAllByText } = render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Should show both F and C train icons
      expect(getAllByText('F')).toBeTruthy();
      expect(getAllByText('C')).toBeTruthy();
    });
  });
});