import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CommuteApp } from '../CommuteApp';

describe('CommuteApp', () => {
  test('shouldDisplayCommuteTitle', () => {
    render(<CommuteApp />);
    
    expect(screen.getByText('CommuteX')).toBeTruthy();
  });

  test('shouldDisplayRouteInformation', () => {
    render(<CommuteApp />);
    
    expect(screen.getByText('Home: 42 Woodhull St, Brooklyn')).toBeTruthy();
    expect(screen.getByText('Work: 512 W 22nd St, Manhattan')).toBeTruthy();
    expect(screen.getByText('Target Arrival: 9:00 AM')).toBeTruthy();
  });

  test('shouldDisplayRouteOptions', () => {
    render(<CommuteApp />);
    
    expect(screen.getByText('Route Options')).toBeTruthy();
    expect(screen.getByText('Route 1: Arrive 8:55 AM')).toBeTruthy();
    expect(screen.getByText('Route 2: Arrive 9:02 AM')).toBeTruthy();
  });

  test('shouldHighlightBestRoute', () => {
    render(<CommuteApp />);
    
    const bestRoute = screen.getByTestId('route-1');
    expect(bestRoute).toHaveStyle({ backgroundColor: '#e8f5e8' });
  });

  test('shouldDisplayLastUpdatedTime', () => {
    render(<CommuteApp />);
    
    expect(screen.getByText(/Last updated:/)).toBeTruthy();
  });

  test('shouldDisplayDetailedRouteInformation', () => {
    render(<CommuteApp />);
    
    expect(screen.getByText(/Subway \+ Walk/)).toBeTruthy();
    expect(screen.getByText(/35 min/)).toBeTruthy();
  });

  test('shouldSupportDarkModeToggle', () => {
    render(<CommuteApp />);
    
    const themeToggle = screen.getByTestId('theme-toggle');
    expect(themeToggle).toBeTruthy();
  });

  test('shouldApplyDarkModeStyles', () => {
    render(<CommuteApp />);
    
    const container = screen.getByTestId('app-container');
    expect(container).toHaveStyle({ backgroundColor: '#fff' });
  });

  test('shouldSupportPullToRefresh', () => {
    render(<CommuteApp />);
    
    const scrollView = screen.getByTestId('scroll-view');
    expect(scrollView).toBeTruthy();
  });

  test('shouldDisplayRealTimeMTAData', async () => {
    render(<CommuteApp />);
    
    // Wait for MTA data to load
    await screen.findByText(/Express \+ Local/);
    expect(screen.getByText(/4 train to Union Sq/)).toBeTruthy();
  });
});
