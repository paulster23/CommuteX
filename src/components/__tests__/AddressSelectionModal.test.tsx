import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddressSelectionModal } from '../shared/AddressSelectionModal';

describe('AddressSelectionModal', () => {
  test('shouldShowAddressInputFields', () => {
    // Red: Test that the modal displays input fields for origin and destination
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    
    const { getByTestId } = render(
      <AddressSelectionModal
        visible={true}
        initialOrigin="42 Woodhull St, Brooklyn"
        initialDestination="512 W 22nd St, Manhattan"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(getByTestId('origin-input')).toBeDefined();
    expect(getByTestId('destination-input')).toBeDefined();
    expect(getByTestId('save-addresses-button')).toBeDefined();
    expect(getByTestId('cancel-button')).toBeDefined();
  });

  test('shouldSwapOriginAndDestination', () => {
    // Red: Test that swap button exchanges origin and destination
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    
    const { getByTestId } = render(
      <AddressSelectionModal
        visible={true}
        initialOrigin="42 Woodhull St, Brooklyn"
        initialDestination="512 W 22nd St, Manhattan"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const originInput = getByTestId('origin-input');
    const destinationInput = getByTestId('destination-input');
    const swapButton = getByTestId('swap-addresses-button');

    // Verify initial values
    expect(originInput.props.value).toBe('42 Woodhull St, Brooklyn');
    expect(destinationInput.props.value).toBe('512 W 22nd St, Manhattan');

    // Tap swap button
    fireEvent.press(swapButton);

    // Values should be swapped
    expect(originInput.props.value).toBe('512 W 22nd St, Manhattan');
    expect(destinationInput.props.value).toBe('42 Woodhull St, Brooklyn');
  });

  test('shouldCallOnSaveWithUpdatedAddresses', () => {
    // Red: Test that save callback is called with new addresses
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    
    const { getByTestId } = render(
      <AddressSelectionModal
        visible={true}
        initialOrigin="42 Woodhull St, Brooklyn"
        initialDestination="512 W 22nd St, Manhattan"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const originInput = getByTestId('origin-input');
    const destinationInput = getByTestId('destination-input');
    const saveButton = getByTestId('save-addresses-button');

    // Change addresses
    fireEvent.changeText(originInput, '123 Main St, Brooklyn');
    fireEvent.changeText(destinationInput, '456 Broadway, Manhattan');

    // Tap save
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      origin: '123 Main St, Brooklyn',
      destination: '456 Broadway, Manhattan'
    });
  });

  test('shouldCallOnCancelWhenCancelPressed', () => {
    // Red: Test that cancel callback is called
    const mockOnSave = jest.fn();
    const mockOnCancel = jest.fn();
    
    const { getByTestId } = render(
      <AddressSelectionModal
        visible={true}
        initialOrigin="42 Woodhull St, Brooklyn"
        initialDestination="512 W 22nd St, Manhattan"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});