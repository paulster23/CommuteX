import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AfternoonCommuteApp } from '../AfternoonCommuteApp';

describe('AfternoonCommuteApp', () => {
  test('shouldDisplayAfternoonCommuteTitle', () => {
    // Red: Test that the AfternoonCommuteApp displays the correct title
    render(<AfternoonCommuteApp />);
    
    expect(screen.getByText('Afternoon Commute')).toBeTruthy();
  });

  test('shouldDisplayReverseRouteInformation', () => {
    // Red: Test that it shows the reverse route information  
    render(<AfternoonCommuteApp />);
    
    // Should show work to home direction (reverse of morning)
    expect(screen.getByText('512 W 22nd St → 42 Woodhull St')).toBeTruthy();
  });

  test('shouldDisplayAfternoonRoutes', () => {
    // Red: Test that afternoon routes are displayed
    render(<AfternoonCommuteApp />);
    
    // Should show routes with afternoon departure times and arrival at home
    // This will initially fail until we implement the full component
    expect(screen.getByTestId('afternoon-routes-container')).toBeTruthy();
  });
});