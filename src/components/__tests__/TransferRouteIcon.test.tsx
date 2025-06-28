import React from 'react';
import { render } from '@testing-library/react-native';
import { TransferRouteIcon } from '../TransferRouteIcon';

describe('TransferRouteIcon', () => {
  it('shouldDisplaySingleIconForDirectRoute', () => {
    const { getByText, queryAllByTestId } = render(
      <TransferRouteIcon routeLine="F" />
    );
    
    expect(getByText('F')).toBeTruthy();
    expect(queryAllByTestId('subway-icon')).toHaveLength(1);
  });

  it('shouldDisplayTwoIconsWithArrowForTransferRoute', () => {
    const { getByText, queryAllByTestId } = render(
      <TransferRouteIcon routeLine="F→C" />
    );
    
    expect(getByText('F')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(getByText('→')).toBeTruthy();
    expect(queryAllByTestId('subway-icon')).toHaveLength(2);
  });

  it('shouldApplyCorrectColorsToSubwayIcons', () => {
    const { queryAllByTestId, getByText } = render(
      <TransferRouteIcon routeLine="F→C" />
    );
    
    const icons = queryAllByTestId('subway-icon');
    
    // Check background colors
    expect(icons[0].props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: '#FF6319' }) // Orange for F train
    ]));
    expect(icons[1].props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: '#0039A6' }) // Blue for C train
    ]));
    
    // Check text color is white
    const fText = getByText('F');
    const cText = getByText('C');
    expect(fText.props.style).toMatchObject({ color: '#fff' });
    expect(cText.props.style).toMatchObject({ color: '#fff' });
  });
});
