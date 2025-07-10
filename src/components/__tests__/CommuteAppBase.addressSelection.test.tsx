import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CommuteAppBase } from '../shared/CommuteAppBase';

// Mock RealMTAService to avoid actual network calls
jest.mock('../../services/RealMTAService');

describe('CommuteAppBase Address Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shouldShowEditAddressesButton', () => {
    // Red: Test that CommuteAppBase shows an "Edit Addresses" button
    const mockCalculateRoutes = jest.fn().mockResolvedValue([]);
    
    const { getByTestId } = render(
      <CommuteAppBase 
        config={{
          title: 'Morning Commute',
          origin: '42 Woodhull St, Brooklyn',
          destination: '512 W 22nd St, Manhattan',
          targetArrival: '9:00 AM',
          calculateRoutes: mockCalculateRoutes
        }}
      />
    );

    expect(getByTestId('edit-addresses-button')).toBeDefined();
  });

  test('shouldOpenAddressSelectionModal', () => {
    // Red: Test that tapping Edit Addresses opens the modal
    const mockCalculateRoutes = jest.fn().mockResolvedValue([]);
    
    const { getByTestId } = render(
      <CommuteAppBase 
        config={{
          title: 'Morning Commute',
          origin: '42 Woodhull St, Brooklyn',
          destination: '512 W 22nd St, Manhattan',
          targetArrival: '9:00 AM',
          calculateRoutes: mockCalculateRoutes
        }}
      />
    );

    const editButton = getByTestId('edit-addresses-button');
    fireEvent.press(editButton);

    // Modal should be visible
    expect(getByTestId('origin-input')).toBeDefined();
    expect(getByTestId('destination-input')).toBeDefined();
  });

  test('shouldUpdateAddressesAndRefreshRoutes', async () => {
    // Red: Test that saving new addresses updates the display and refreshes routes
    const mockCalculateRoutes = jest.fn().mockResolvedValue([]);
    
    const { getByTestId } = render(
      <CommuteAppBase 
        config={{
          title: 'Morning Commute',
          origin: '42 Woodhull St, Brooklyn',
          destination: '512 W 22nd St, Manhattan',
          targetArrival: '9:00 AM',
          calculateRoutes: mockCalculateRoutes
        }}
      />
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockCalculateRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        '42 Woodhull St, Brooklyn',
        '512 W 22nd St, Manhattan',
        '9:00 AM'
      );
    });

    // Clear the mock to focus on the new call
    mockCalculateRoutes.mockClear();

    // Open modal
    const editButton = getByTestId('edit-addresses-button');
    fireEvent.press(editButton);

    // Change addresses
    const originInput = getByTestId('origin-input');
    const destinationInput = getByTestId('destination-input');
    fireEvent.changeText(originInput, '123 New St, Brooklyn');
    fireEvent.changeText(destinationInput, '456 Other Ave, Manhattan');

    // Save
    const saveButton = getByTestId('save-addresses-button');
    fireEvent.press(saveButton);

    // Wait for routes to be recalculated with new addresses
    await waitFor(() => {
      expect(mockCalculateRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        '123 New St, Brooklyn',
        '456 Other Ave, Manhattan',
        '9:00 AM'
      );
    });

    // Check that the display is updated
    const subtitleElement = getByTestId('route-subtitle');
    expect(subtitleElement.props.children).toContain('123 New St');
    expect(subtitleElement.props.children).toContain('456 Other Ave');
  });
});