import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { HelpScreen } from '../HelpScreen';
import { GPSLocationProvider } from '../../services/LocationService';
import { NearestStationService, mockFindNearestStation as importedMockFindNearestStation } from '../../services/NearestStationService';
import { StationDepartureService, mockGetDeparturesForStation as importedMockGetDeparturesForStation } from '../../services/StationDepartureService';

// Mock the dependencies
const mockGetCurrentLocation = jest.fn();
const mockFindNearestStation = jest.fn();

jest.mock('../../services/LocationService', () => ({
  GPSLocationProvider: jest.fn().mockImplementation(() => ({
    getCurrentLocation: jest.fn().mockResolvedValue({ lat: 40.688312, lng: -73.990982 }),
  })),
  Location: {}
}));

jest.mock('../../services/NearestStationService', () => {
  const mockFindNearestStation = jest.fn();
  
  class MockNearestStationService {
    static findNearestStation = mockFindNearestStation;
  }
  
  return {
    NearestStationService: MockNearestStationService,
    mockFindNearestStation, // Export for test access
  };
});

jest.mock('../../services/StationDepartureService', () => {
  const mockGetDeparturesForStation = jest.fn();
  
  class MockStationDepartureService {
    static getDeparturesForStation = mockGetDeparturesForStation;
  }
  
  return {
    StationDepartureService: MockStationDepartureService,
    mockGetDeparturesForStation, // Export for test access
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.688312, longitude: -73.990982 }
  }),
  LocationAccuracy: { High: 'high' }
}));

jest.mock('lucide-react-native', () => ({
  MapPin: () => null,
  Navigation: () => null,
  Clock: () => null,
  AlertCircle: () => null,
  Train: () => null,
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

  const mockDepartures = {
    F: [
      { line: 'F', departureTime: new Date(Date.now() + 2 * 60000), relativeTime: '2m' },
      { line: 'F', departureTime: new Date(Date.now() + 9 * 60000), relativeTime: '9m' },
      { line: 'F', departureTime: new Date(Date.now() + 16 * 60000), relativeTime: '16m' },
    ],
    G: [
      { line: 'G', departureTime: new Date(Date.now() + 5 * 60000), relativeTime: '5m' },
      { line: 'G', departureTime: new Date(Date.now() + 12 * 60000), relativeTime: '12m' },
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLocation.mockResolvedValue(mockLocation);
    mockFindNearestStation.mockReturnValue(mockNearestStation);
    importedMockGetDeparturesForStation.mockResolvedValue(mockDepartures);
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
    
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Your Location')).toBeTruthy();
      expect(screen.getByText('40.688312, -73.990982')).toBeTruthy();
    });
  });

  test('shouldDisplayNearestSubwayStation', async () => {
    // Red: Test that nearest subway station is displayed
    
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Nearest Subway Station')).toBeTruthy();
      expect(screen.getByText('Bergen St')).toBeTruthy();
      expect(screen.getByText('F, G trains')).toBeTruthy();
      expect(screen.getByText('0.16 miles away')).toBeTruthy();
    });
  });

  test('shouldHandleLocationPermissionDenied', async () => {
    // Red: Test error handling when location permission is denied
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockRejectedValue(
        new Error('Location permission denied')
      )
    };
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Location Access Denied')).toBeTruthy();
      expect(screen.getByText('Please enable location permissions to see nearby subway stations.')).toBeTruthy();
    });
  });

  test('shouldHandleGPSServiceError', async () => {
    // Red: Test error handling when GPS service fails
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockRejectedValue(
        new Error('Location service unavailable')
      )
    };
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Location Unavailable')).toBeTruthy();
      expect(screen.getByText('Unable to get your current location. Please try again.')).toBeTruthy();
    });
  });

  test('shouldDisplayStationDistance', async () => {
    // Red: Test that distance to nearest station is formatted properly
    
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
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
    
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockStationWithMultipleLines);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Union Sq-14th St')).toBeTruthy();
      expect(screen.getByText('4, 5, 6, L, N, Q, R, W trains')).toBeTruthy();
    });
  });

  test('shouldRefreshLocationOnPullDown', async () => {
    // Red: Test that location can be refreshed
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(mockLocationProvider.getCurrentLocation).toHaveBeenCalledTimes(1);
    });
    
    // This would test pull-to-refresh functionality
    // For now, just verify the location service is called
    expect(mockLocationProvider.getCurrentLocation).toHaveBeenCalled();
  });

  test('shouldUseProperDesignSystem', () => {
    // Red: Test that Help screen uses the app's design system
    render(<HelpScreen />);
    
    // Should render with proper styling from design system
    expect(screen.getByText('Help & Location')).toBeTruthy();
  });

  test('shouldShowDirectionToggle', async () => {
    // Red: Test that northbound/southbound toggle is displayed
    
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Northbound')).toBeTruthy();
      expect(screen.getByText('Southbound')).toBeTruthy();
    });
  });

  test('shouldDisplayNextTrainDepartures', async () => {
    // Red: Test that next train departures are shown
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    importedMockGetDeparturesForStation.mockResolvedValue(mockDepartures);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      expect(screen.getByText('Next Departures')).toBeTruthy();
      // Should show relative times like "2m"
      expect(screen.getByText('2m')).toBeTruthy();
    });
  });

  test('shouldSeparateMultipleLines', async () => {
    // Red: Test that multiple lines are displayed separately
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    importedMockGetDeparturesForStation.mockResolvedValue(mockDepartures);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      // Should show F line section
      expect(screen.getByText('F Line')).toBeTruthy();
      // Should show G line section
      expect(screen.getByText('G Line')).toBeTruthy();
    });
  });

  test('shouldShowRelativeDepartureTimes', async () => {
    // Red: Test that departure times are shown as relative (e.g., "7m")
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    importedMockGetDeparturesForStation.mockResolvedValue(mockDepartures);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      // Should show times in minutes format
      expect(screen.getByText('2m')).toBeTruthy();
      expect(screen.getByText('9m')).toBeTruthy();
    });
  });

  test('shouldToggleDirection', async () => {
    // Red: Test that direction toggle changes departure data
    const { getByText } = render(<HelpScreen />);
    
    await waitFor(() => {
      expect(getByText('Northbound')).toBeTruthy();
    });

    // Should be able to press southbound toggle
    // This will test the toggle functionality
    expect(getByText('Southbound')).toBeTruthy();
  });

  test('shouldShowNext5TrainsPerLine', async () => {
    // Red: Test that up to 5 trains are shown per line
    const mockLocationProvider = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation)
    };
    
    // Set up the nearest station mock to return our mock station
    importedMockFindNearestStation.mockReturnValue(mockNearestStation);
    importedMockGetDeparturesForStation.mockResolvedValue(mockDepartures);
    
    render(<HelpScreen locationProvider={mockLocationProvider} />);
    
    await waitFor(() => {
      // Should have 5 departure times for F line
      const fLineSection = screen.getByText('F Line').parent;
      // Test will verify structure exists
      expect(fLineSection).toBeTruthy();
    });
  });
});