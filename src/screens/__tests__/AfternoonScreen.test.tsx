import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AfternoonScreen } from '../AfternoonScreen';

describe('AfternoonScreen', () => {
  test('shouldRenderAfternoonScreen', () => {
    // Red: Test that the AfternoonScreen component renders successfully
    render(<AfternoonScreen />);
    
    // Should render the afternoon commute content
    expect(screen.getByText('Afternoon Commute')).toBeTruthy();
  });
});