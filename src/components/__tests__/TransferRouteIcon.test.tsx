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

  it('shouldDisplayTwoIconsWithoutArrowForTransferRoute', () => {
    const { getByText, queryAllByTestId, queryByText } = render(
      <TransferRouteIcon routeLine="F→C" />
    );
    
    expect(getByText('F')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(queryByText('→')).toBeNull();
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
    expect(fText.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: '#FFFFFF' })
    ]));
    expect(cText.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: '#FFFFFF' })
    ]));
  });

  it('shouldUseSquaredShapeForBothSingleAndMultiStepTrips', () => {
    const { queryAllByTestId: singleIcons } = render(
      <TransferRouteIcon routeLine="F" />
    );
    const { queryAllByTestId: multiIcons } = render(
      <TransferRouteIcon routeLine="F→C" />
    );
    
    const singleIcon = singleIcons('subway-icon')[0];
    const multiIcon1 = multiIcons('subway-icon')[0];
    const multiIcon2 = multiIcons('subway-icon')[1];
    
    // All icons should have the same borderRadius (squared shape)
    expect(singleIcon.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderRadius: 12 })
    ]));
    expect(multiIcon1.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderRadius: 12 })
    ]));
    expect(multiIcon2.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ borderRadius: 12 })
    ]));
  });

  it('shouldHaveProperSpacingBetweenMultiStepIcons', () => {
    const { queryAllByTestId } = render(
      <TransferRouteIcon routeLine="F→C" />
    );
    
    const icons = queryAllByTestId('subway-icon');
    const secondIcon = icons[1];
    
    // Second icon should have 4px left margin for proper spacing
    expect(secondIcon.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ marginLeft: 4 })
    ]));
  });
});
