import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TrainTimePill } from '../TrainTimePill';

describe('TrainTimePill', () => {
  test('shouldRenderWithCorrectTime', () => {
    render(<TrainTimePill line="F" time="5m" index={0} />);
    
    expect(screen.getByText('5m')).toBeTruthy();
    expect(screen.getByTestId('time-pill-F-0')).toBeTruthy();
  });

  test('shouldUseCorrectMTAColorForLine', () => {
    const { getByTestId } = render(<TrainTimePill line="F" time="5m" index={0} />);
    
    const pill = getByTestId('time-pill-F-0');
    expect(pill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#FF6319' // F train orange
        })
      ])
    );
  });

  test('shouldHaveReducedMarginsForWiderPills', () => {
    // Red: Test that pills have reduced right margin for wider appearance
    const { getByTestId } = render(<TrainTimePill line="F" time="5m" index={0} />);
    
    const pill = getByTestId('time-pill-F-0');
    expect(pill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          marginRight: 6 // Reduced from 8
        })
      ])
    );
  });

  test('shouldHaveCompactPaddingForDensity', () => {
    // Red: Test that pills have compact padding for iPhone 13 mini density
    const { getByTestId } = render(<TrainTimePill line="F" time="5m" index={0} />);
    
    const pill = getByTestId('time-pill-F-0');
    expect(pill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paddingHorizontal: 10, // Reduced from 12
          paddingVertical: 4 // Reduced from 6
        })
      ])
    );
  });

  test('shouldHaveCompactBorderRadius', () => {
    // Red: Test that pills have reduced border radius for compact appearance
    const { getByTestId } = render(<TrainTimePill line="F" time="5m" index={0} />);
    
    const pill = getByTestId('time-pill-F-0');
    expect(pill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderRadius: 12 // Reduced from 16
        })
      ])
    );
  });

  test('shouldHaveCompactFontSize', () => {
    // Red: Test that pill text has compact font size for iPhone 13 mini
    const { getByText } = render(<TrainTimePill line="F" time="5m" index={0} />);
    
    const text = getByText('5m');
    expect(text.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fontSize: 12 // Reduced from 14
      })
    ]));
  });
});