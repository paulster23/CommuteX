import '@testing-library/jest-native/extend-expect';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  LocationAccuracy: {
    High: 'High'
  }
}));
