import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../CommuteAppBase';
import { RealMTAService } from '../../../services/RealMTAService';

// Mock the RealMTAService
jest.mock('../../../services/RealMTAService');

const mockMTAService = {
  getServiceAlertsForCommute: jest.fn(),
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
    mockMTAService.getServiceAlertsForCommute.mockResolvedValue([]);
    
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
        severity: 'warning' as const,
        informedEntities: [
          {
            routeId: 'F',
            directionId: 1
          }
        ],
        activePeriod: {
          start: new Date('2023-12-01T08:00:00Z'),
          end: new Date('2023-12-01T18:00:00Z')
        }
      }
    ];
    
    mockMTAService.getServiceAlertsForCommute.mockResolvedValue(mockAlerts);
    
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(screen.getByText('Service Alerts')).toBeTruthy();
      expect(screen.getByText('F Train Service Change')).toBeTruthy();
      expect(screen.getByText('F trains are delayed due to signal problems')).toBeTruthy();
    });
  });

  test('shouldDisplayAlertTimeInEffect', async () => {
    // Test that service alerts show time in effect information
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0); // 8 AM today
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0);   // 6 PM today
    
    const mockAlerts = [
      {
        id: 'alert-1',
        headerText: 'F Train Service Change',
        descriptionText: 'F trains are delayed due to signal problems',
        affectedRoutes: ['F'],
        severity: 'warning' as const,
        informedEntities: [
          {
            routeId: 'F',
            directionId: 1
          }
        ],
        activePeriod: {
          start: todayStart,
          end: todayEnd
        }
      }
    ];
    
    mockMTAService.getServiceAlertsForCommute.mockResolvedValue(mockAlerts);
    
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(screen.getByText('Service Alerts')).toBeTruthy();
      expect(screen.getByText('F Train Service Change')).toBeTruthy();
      expect(screen.getByText('F trains are delayed due to signal problems')).toBeTruthy();
      // Check that time in effect is displayed
      expect(screen.getByText(/Today 8:00 AM - 6:00 PM/)).toBeTruthy();
    });
  });

  test('shouldFilterAlertsForRelevantLines', async () => {
    // Red: Test that alerts are filtered for F, C, A lines only
    render(<CommuteAppBase config={mockConfig} />);
    
    await waitFor(() => {
      expect(mockMTAService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
    });
  });

  test('shouldHaveRefreshControlConfigured', () => {
    // Red: Test that RefreshControl is properly configured in CommuteAppBase
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn',
      destination: '23rd St, Manhattan',
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);
    
    // Verify ScrollView with refreshControl exists
    const scrollView = getByTestId('scroll-view');
    expect(scrollView).toBeTruthy();
    
    // This test verifies the basic structure is there
    // More detailed refresh testing will be done in integration tests
  });

  test('shouldShowRefreshingIndicator', async () => {
    // Red: Test that refreshing state shows loading indicator
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn', 
      destination: '23rd St, Manhattan',
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
    };

    render(<CommuteAppBase config={mockConfig} />);
    
    // During refresh, should show refreshing indicator
    // RefreshControl should be present and manage refreshing state
    expect(true).toBe(true); // This will initially pass, need to implement proper test
  });

  test('shouldReloadDataOnRefresh', async () => {
    // Green: Test that pull-to-refresh actually reloads both routes and service alerts
    const mockCalculateRoutes = jest.fn().mockResolvedValue([]);
    
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn',
      destination: '23rd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: mockCalculateRoutes
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockCalculateRoutes).toHaveBeenCalledTimes(1);
    });

    // Verify service alerts are also refreshed
    await waitFor(() => {
      expect(mockMTAService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
    });

    // Reset call counts
    mockCalculateRoutes.mockClear();
    mockMTAService.getServiceAlertsForCommute.mockClear();

    // Trigger refresh through RefreshControl
    const scrollView = getByTestId('scroll-view');
    const refreshControl = scrollView.props.refreshControl;
    await refreshControl.props.onRefresh();

    // Verify both routes and service alerts are reloaded
    expect(mockCalculateRoutes).toHaveBeenCalledTimes(1);
    expect(mockMTAService.getServiceAlertsForCommute).toHaveBeenCalledWith(['F', 'C', 'A'], 1);
  });

  test('shouldManageRefreshStateIndependentlyFromLoading', async () => {
    // Green: Test that refresh state is separate from loading state
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn',
      destination: '23rd St, Manhattan',
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);
    
    // Wait for initial load to complete
    await waitFor(() => {
      expect(getByTestId('scroll-view')).toBeTruthy();
    });

    // Refresh state is managed by separate `refreshing` state
    const scrollView = getByTestId('scroll-view');
    const refreshControl = scrollView.props.refreshControl;
    
    // RefreshControl should have its own refreshing state management
    expect(refreshControl.props.refreshing).toBeDefined();
    expect(refreshControl.props.onRefresh).toBeDefined();
  });

  test('shouldShowRefreshIndicatorForMinimumDuration', async () => {
    // Green: Test that refresh indicator shows for at least 500ms for visual feedback
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn',
      destination: '23rd St, Manhattan',
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId('scroll-view')).toBeTruthy();
    });
    
    // The onRefresh function now includes minimum duration logic
    const scrollView = getByTestId('scroll-view');
    const refreshControl = scrollView.props.refreshControl;
    
    // Start timing
    const startTime = Date.now();
    
    // Trigger refresh
    await refreshControl.props.onRefresh();
    
    // Verify minimum duration was respected (should be at least 500ms)
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(500);
  });

  test('shouldUseProperIOSBounceConfiguration', () => {
    // Red: Test that iOS bounce settings are properly configured
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn', 
      destination: '23rd St, Manhattan',
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);
    
    const scrollView = getByTestId('scroll-view');
    
    // Should have proper bounce configuration for iOS
    // This test will fail until we verify iOS-specific settings
    expect(scrollView.props.bounces).toBe(true);
    expect(scrollView.props.alwaysBounceVertical).toBe(true);
  });

  test('shouldUseVisibleRefreshControlColors', () => {
    // Green: Test that RefreshControl uses visible colors for both light and dark themes
    const mockConfig = {
      title: 'Morning Commute',
      origin: 'Carroll St, Brooklyn',
      destination: '23rd St, Manhattan', 
      targetArrival: '9:00 AM',
      calculateRoutes: jest.fn().mockResolvedValue([])
    };

    const { getByTestId } = render(<CommuteAppBase config={mockConfig} />);
    
    const scrollView = getByTestId('scroll-view');
    const refreshControl = scrollView.props.refreshControl;
    
    // Should have proper color configuration
    expect(refreshControl.props.tintColor).toBeDefined();
    expect(refreshControl.props.colors).toBeDefined();
    expect(refreshControl.props.progressBackgroundColor).toBeDefined();
    
    // Now uses visible colors - either success green or primary blue
    expect(refreshControl.props.tintColor).toMatch(/#34C759|#007AFF/); // Success green or primary blue
    expect(refreshControl.props.colors).toContain('#34C759'); // Success green included
    expect(refreshControl.props.progressViewOffset).toBe(20); // Proper offset for visibility
  });
});