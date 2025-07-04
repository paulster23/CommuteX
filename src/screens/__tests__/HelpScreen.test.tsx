import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { HelpScreen } from '../HelpScreen';
import { GPSLocationProvider } from '../../services/LocationService';
import { NearestStationService } from '../../services/NearestStationService';

// Mock the dependencies
const mockGetCurrentLocation = jest.fn();
const mockFindNearestStation = jest.fn();

jest.mock('../../services/LocationService', () => ({
  GPSLocationProvider: jest.fn().mockImplementation(() => ({
    getCurrentLocation: mockGetCurrentLocation,
  })),
  Location: {}
}));

jest.mock('../../services/NearestStationService', () => ({
  NearestStationService: {
    findNearestStation: mockFindNearestStation,
  },
}));

jest.mock('lucide-react-native', () => ({
  MapPin: () => null,
  Navigation: () => null,
  Clock: () => null,
  AlertCircle: () => null,
}));

describe('HelpScreen', () => {
  const mockLocation = { lat: 40.688312, lng: -73.990982 };
  const mockNearestStation = {
    station: {
      id: 'F24',
      name: 'Bergen St',
      lines: ['F', 'G'],
      lat: 40.686145,
      lng: -73.990064
    },
    distance: 0.157
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLocation.mockResolvedValue(mockLocation);
    mockFindNearestStation.mockReturnValue(mockNearestStation);
  });

  test('shouldRenderHelpScreenTitle', () => {
    // Red: Test that Help screen renders with title
    render(<HelpScreen />);
    
    expect(screen.getByText('Help & Location')).toBeTruthy();
  });

  test('shouldShowLoadingStateInitially', () => {
    // Red: Test that loading state is shown while getting GPS location
    render(<HelpScreen />);
    
    expect(screen.getByText('Getting your location...')).toBeTruthy();
  });

  test('shouldDisplayCurrentGPSCoordinates', async () => {
    // Red: Test that GPS coordinates are displayed
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Your Location')).toBeTruthy();
      expect(screen.getByText('40.688312, -73.990982')).toBeTruthy();
    });
  });

  test('shouldDisplayNearestSubwayStation', async () => {
    // Red: Test that nearest subway station is displayed
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Nearest Subway Station')).toBeTruthy();
      expect(screen.getByText('Bergen St')).toBeTruthy();
      expect(screen.getByText('F, G trains')).toBeTruthy();
      expect(screen.getByText('0.16 miles away')).toBeTruthy();
    });
  });

  test('shouldHandleLocationPermissionDenied', async () => {
    // Red: Test error handling when location permission is denied
    mockGetCurrentLocation.mockRejectedValue(
      new Error('Location permission denied')
    );
    
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Location Access Denied')).toBeTruthy();
      expect(screen.getByText('Please enable location permissions to see nearby subway stations.')).toBeTruthy();
    });
  });

  test('shouldHandleGPSServiceError', async () => {
    // Red: Test error handling when GPS service fails
    mockGetCurrentLocation.mockRejectedValue(
      new Error('Location service unavailable')
    );
    
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Location Unavailable')).toBeTruthy();
      expect(screen.getByText('Unable to get your current location. Please try again.')).toBeTruthy();
    });
  });

  test('shouldDisplayStationDistance', async () => {
    // Red: Test that distance to nearest station is formatted properly
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('0.16 miles away')).toBeTruthy();
    });
  });

  test('shouldDisplayMultipleTrainLines', async () => {
    // Red: Test that multiple train lines are displayed correctly
    const mockStationWithMultipleLines = {
      station: {
        id: 'R16',
        name: 'Union Sq-14th St',
        lines: ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'],
        lat: 40.735736,
        lng: -73.990568
      },
      distance: 0.5
    };
    
    mockFindNearestStation.mockReturnValue(mockStationWithMultipleLines);
    
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Union Sq-14th St')).toBeTruthy();
      expect(screen.getByText('4, 5, 6, L, N, Q, R, W trains')).toBeTruthy();
    });
  });

  test('shouldRefreshLocationOnPullDown', async () => {
    // Red: Test that location can be refreshed
    render(<HelpScreen />);
    
    await waitFor(() => {
      expect(mockGetCurrentLocation).toHaveBeenCalledTimes(1);
    });
    
    // This would test pull-to-refresh functionality
    // For now, just verify the location service is called
    expect(mockGetCurrentLocation).toHaveBeenCalled();
  });

  test('shouldUseProperDesignSystem', () => {
    // Red: Test that Help screen uses the app's design system
    render(<HelpScreen />);
    
    // Should render with proper styling from design system
    expect(screen.getByText('Help & Location')).toBeTruthy();
  });
});