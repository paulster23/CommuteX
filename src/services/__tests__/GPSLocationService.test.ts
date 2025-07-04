import { GPSLocationProvider } from '../LocationService';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  LocationAccuracy: {
    High: 'High'
  }
}));

describe('GPSLocationProvider', () => {
  let gpsProvider: GPSLocationProvider;
  const mockLocation = Location as jest.Mocked<typeof Location>;

  beforeEach(() => {
    gpsProvider = new GPSLocationProvider();
    jest.clearAllMocks();
  });

  test('shouldRequestLocationPermissions', async () => {
    // Red: Test that GPS provider requests location permissions
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.688312,
        longitude: -73.990982,
        altitude: null,
        accuracy: 10,
        heading: null,
        speed: null,
        altitudeAccuracy: null
      },
      timestamp: Date.now()
    });

    const location = await gpsProvider.getCurrentLocation();

    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(location.lat).toBe(40.688312);
    expect(location.lng).toBe(-73.990982);
  });

  test('shouldThrowErrorWhenPermissionDenied', async () => {
    // Red: Test error handling when location permission is denied
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never'
    });

    await expect(gpsProvider.getCurrentLocation()).rejects.toThrow('Location permission denied');
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('shouldReturnAccurateGPSCoordinates', async () => {
    // Red: Test that GPS returns coordinates with proper precision
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.746021,
        longitude: -73.996736,
        altitude: null,
        accuracy: 5,
        heading: null,
        speed: null,
        altitudeAccuracy: null
      },
      timestamp: Date.now()
    });

    const location = await gpsProvider.getCurrentLocation();

    expect(location.lat).toBeCloseTo(40.746021, 6);
    expect(location.lng).toBeCloseTo(-73.996736, 6);
  });

  test('shouldHandleLocationServiceError', async () => {
    // Red: Test error handling when GPS service fails
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('Location service unavailable'));

    await expect(gpsProvider.getCurrentLocation()).rejects.toThrow('Location service unavailable');
  });

  test('shouldUseHighAccuracySetting', async () => {
    // Red: Test that GPS uses high accuracy settings
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.688312,
        longitude: -73.990982,
        altitude: null,
        accuracy: 3,
        heading: null,
        speed: null,
        altitudeAccuracy: null
      },
      timestamp: Date.now()
    });

    await gpsProvider.getCurrentLocation();

    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.LocationAccuracy.High,
      timeout: 15000,
      maximumAge: 10000
    });
  });

  test('shouldHandleTimeoutError', async () => {
    // Red: Test timeout handling
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('Location request timed out'));

    await expect(gpsProvider.getCurrentLocation()).rejects.toThrow('Location request timed out');
  });

  test('shouldReturnLocationInCorrectFormat', async () => {
    // Red: Test that location is returned in correct interface format
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never'
    });

    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.755477,
        longitude: -73.986754,
        altitude: null,
        accuracy: 8,
        heading: null,
        speed: null,
        altitudeAccuracy: null
      },
      timestamp: Date.now()
    });

    const location = await gpsProvider.getCurrentLocation();

    expect(location).toHaveProperty('lat');
    expect(location).toHaveProperty('lng');
    expect(typeof location.lat).toBe('number');
    expect(typeof location.lng).toBe('number');
  });
});