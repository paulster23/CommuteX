import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../CommuteAppBase';
import { RealMTAService } from '../../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../../services/RealMTAService');

const mockMTAService = {
  getServiceAlertsForLines: jest.fn(),
};

jest.mock('lucide-react-native', () => ({
  Zap: () => null,
  Clock: () => null,
  AlertTriangle: () => null,
  ArrowUp: () => null,
  ArrowDown: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
}));

describe('CommuteAppBase Service Alerts', () => {
  const mockConfig = {
    title: 'Morning Commute',
    origin: 'Carroll St, Brooklyn',
    destination: '23rd St, Manhattan',
    targetArrival: '9:00 AM',
    calculateRoutes: jest.fn().mockResolvedValue([
      {
        id: 1,
        arrivalTime: '8:45 AM',
        duration: '45 mins',
        method: 'F train direct',
        steps: []
      }
    ])
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (RealMTAService as jest.Mock).mockImplementation(() => mockMTAService);
  });

  test('shouldDisplayNoServiceAlertsWhenNoneExist', async () => {
    // Red: Test that "No active service alerts" is shown when no alerts exist
    mockMTAService.getServiceAlertsForLines.mockResolvedValue([]);
    
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(screen.getByText('Service Alerts')).toBeTruthy();
      expect(screen.getByText('No active service alerts for this route')).toBeTruthy();
    });
  });

  test('shouldDisplayActiveServiceAlerts', async () => {
    // Red: Test that active service alerts are displayed when they exist
    const mockAlerts = [
      {
        id: 'alert-1',
        headerText: 'F Train Service Change',
        descriptionText: 'F trains are delayed due to signal problems',
        affectedRoutes: ['F'],
        severity: 'warning' as const
      }
    ];
    
    mockMTAService.getServiceAlertsForLines.mockResolvedValue(mockAlerts);
    
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(screen.getByText('Service Alerts')).toBeTruthy();
      expect(screen.getByText('F Train Service Change')).toBeTruthy();
      expect(screen.getByText('F trains are delayed due to signal problems')).toBeTruthy();
    });
  });

  test('shouldFilterAlertsForRelevantLines', async () => {
    // Red: Test that alerts are filtered for F, C, A lines only
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(mockMTAService.getServiceAlertsForLines).toHaveBeenCalledWith(['F', 'C', 'A']);
    });
  });
});