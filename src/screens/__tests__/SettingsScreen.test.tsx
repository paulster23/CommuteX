import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SettingsScreen } from '../SettingsScreen';
import { CacheUtility } from '../../services/CacheUtility';

// Mock CacheUtility
jest.mock('../../services/CacheUtility');
const mockCacheUtility = CacheUtility as jest.Mocked<typeof CacheUtility>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock icons
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => null,
  Bell: () => null,
  MapPin: () => null,
  Clock: () => null,
  Info: () => null,
  Trash2: () => null,
  AlertTriangle: () => null,
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shouldRenderSettingsTitle', () => {
    render(<SettingsScreen />);
    
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Customize your CommuteX experience')).toBeTruthy();
  });

  test('shouldRenderAllSettingsOptions', () => {
    render(<SettingsScreen />);
    
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Service alerts and updates')).toBeTruthy();
    
    expect(screen.getByText('Default Locations')).toBeTruthy();
    expect(screen.getByText('Home and work addresses')).toBeTruthy();
    
    expect(screen.getByText('Preferred Times')).toBeTruthy();
    expect(screen.getByText('Commute schedule preferences')).toBeTruthy();
    
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('App version and information')).toBeTruthy();
  });

  test('shouldRenderClearCacheButton', () => {
    render(<SettingsScreen />);
    
    expect(screen.getByText('Clear Cache')).toBeTruthy();
    expect(screen.getByText('Clear all cached data and refresh app')).toBeTruthy();
  });

  test('shouldShowConfirmationDialogWhenClearCachePressed', () => {
    render(<SettingsScreen />);
    
    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.press(clearCacheButton);
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear Cache',
      'This will clear all cached data including route information, service worker caches, and browser storage. The app will refresh with the latest data.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Clear Cache', style: 'destructive' })
      ])
    );
  });

  test('shouldCallCacheUtilityWhenConfirmed', async () => {
    // Mock successful cache clear
    mockCacheUtility.clearAllCaches.mockResolvedValue({
      success: true,
      message: 'All caches cleared successfully!'
    });

    render(<SettingsScreen />);
    
    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.press(clearCacheButton);
    
    // Get the confirmation dialog callback
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2][1]; // Second button (Clear Cache)
    
    // Execute the confirmation callback
    await confirmButton.onPress();
    
    expect(mockCacheUtility.clearAllCaches).toHaveBeenCalled();
  });

  test('shouldShowSuccessMessageAfterClearCache', async () => {
    // Mock successful cache clear
    mockCacheUtility.clearAllCaches.mockResolvedValue({
      success: true,
      message: 'All caches cleared successfully!'
    });

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(<SettingsScreen />);
    
    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.press(clearCacheButton);
    
    // Get and execute the confirmation callback
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2][1];
    await confirmButton.onPress();
    
    // Wait for the success alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cache Cleared',
        'All caches cleared successfully!',
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' })
        ])
      );
    });
  });

  test('shouldShowErrorMessageOnClearCacheFailure', async () => {
    // Mock failed cache clear
    mockCacheUtility.clearAllCaches.mockResolvedValue({
      success: false,
      message: 'Failed to clear some caches.'
    });

    render(<SettingsScreen />);
    
    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.press(clearCacheButton);
    
    // Get and execute the confirmation callback
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2][1];
    await confirmButton.onPress();
    
    // Wait for the error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Cache Failed',
        'Failed to clear some caches.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' })
        ])
      );
    });
  });

  test('shouldHandleCacheUtilityException', async () => {
    // Mock exception thrown by CacheUtility
    mockCacheUtility.clearAllCaches.mockRejectedValue(new Error('Network error'));

    render(<SettingsScreen />);
    
    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.press(clearCacheButton);
    
    // Get and execute the confirmation callback
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2][1];
    await confirmButton.onPress();
    
    // Wait for the error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred while clearing the cache.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' })
        ])
      );
    });
  });
});