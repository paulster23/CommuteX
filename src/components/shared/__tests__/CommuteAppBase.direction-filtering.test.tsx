import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../CommuteAppBase';
import { RealMTAService } from '../../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../../services/RealMTAService');

const MockedRealMTAService = RealMTAService as jest.MockedClass<typeof RealMTAService>;

describe('CommuteAppBase - Direction Filtering Verification', () => {
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

  test('morningPageShouldRequestNorthboundAlerts', async () => {
    // Red: Morning page should request northbound (Manhattan-bound) alerts
    // Based on user requirement: "only uptown (northbound, manhattan bound) alerts show up on the morning page"
    
    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockMtaService.calculateAllRoutes
    };

    render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Morning commute: Brooklyn → Manhattan should request northbound alerts (direction 1)
      // This is currently wrong - it's requesting direction 0 (southbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
    });
  });

  test('afternoonPageShouldRequestSouthboundAlerts', async () => {
    // Red: Afternoon page should request southbound (Brooklyn-bound) alerts
    // Based on user requirement: "only downtown (southbound, brooklyn bound) alerts show up on the afternoon page"
    
    const afternoonConfig = {
      title: 'Afternoon Commute',
      origin: '512 W 22nd St, Manhattan',
      destination: '42 Woodhull St, Brooklyn',
      targetArrival: '7:00 PM',
      calculateRoutes: mockMtaService.calculateAllAfternoonRoutes
    };

    render(<CommuteAppBase config={afternoonConfig} />);

    await waitFor(() => {
      // Afternoon commute: Manhattan → Brooklyn should request southbound alerts (direction 0)
      // This is currently wrong - it's requesting direction 1 (northbound)
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 0);
    });
  });

  test('shouldFilterOnlyActiveAlerts', async () => {
    // Red: Should only show active alerts (within time window)
    
    const morningConfig = {
      title: 'Morning Commute',
      origin: '42 Woodhull St, Brooklyn',
      destination: '512 W 22nd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockMtaService.calculateAllRoutes
    };

    render(<CommuteAppBase config={morningConfig} />);

    await waitFor(() => {
      // Should call getServiceAlertsForCommute which handles active period filtering
      expect(mockMtaService.getServiceAlertsForCommute).toHaveBeenCalled();
      
      // Should NOT call the old method that doesn't filter by active period
      expect(mockMtaService.getServiceAlertsForLines).not.toHaveBeenCalled();
    });
  });
});