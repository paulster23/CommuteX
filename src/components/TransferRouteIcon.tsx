import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../design/theme';

const getLineColors = (line: string) => {
  const colorMap: { [key: string]: { backgroundColor: string; color: string } } = {
    'F': { backgroundColor: colors.subway.F, color: '#FFFFFF' },
    'R': { backgroundColor: colors.subway.R, color: '#000000' },
    'Q': { backgroundColor: colors.subway.Q, color: '#000000' },
    'N': { backgroundColor: colors.subway.N, color: '#000000' },
    'W': { backgroundColor: colors.subway.W, color: '#000000' },
    'A': { backgroundColor: colors.subway.A, color: '#FFFFFF' },
    'C': { backgroundColor: colors.subway.C, color: '#FFFFFF' },
    'E': { backgroundColor: colors.subway.E, color: '#FFFFFF' },
    'G': { backgroundColor: colors.subway.G, color: '#FFFFFF' },
    'L': { backgroundColor: colors.subway.L, color: '#000000' },
    '4': { backgroundColor: colors.subway['4'], color: '#FFFFFF' },
    '5': { backgroundColor: colors.subway['5'], color: '#FFFFFF' },
    '6': { backgroundColor: colors.subway['6'], color: '#FFFFFF' },
    'B': { backgroundColor: colors.subway.B, color: '#FFFFFF' },
    'D': { backgroundColor: colors.subway.D, color: '#FFFFFF' },
    'M': { backgroundColor: colors.subway.M, color: '#FFFFFF' },
    'J': { backgroundColor: colors.subway.J, color: '#FFFFFF' },
    'Z': { backgroundColor: colors.subway.Z, color: '#FFFFFF' },
    '1': { backgroundColor: colors.subway['1'], color: '#FFFFFF' },
    '2': { backgroundColor: colors.subway['2'], color: '#FFFFFF' },
    '3': { backgroundColor: colors.subway['3'], color: '#FFFFFF' },
    '7': { backgroundColor: colors.subway['7'], color: '#FFFFFF' },
    'S': { backgroundColor: colors.subway.S, color: '#FFFFFF' },
  };
  
  return colorMap[line] || { backgroundColor: '#666', color: '#FFFFFF' };
};

interface TransferRouteIconProps {
  routeLine: string;
}

export function TransferRouteIcon({ routeLine }: TransferRouteIconProps) {
  const isTransfer = routeLine.includes('→');
  
  if (!isTransfer) {
    // Single route - use same container structure for consistency
    const lineColors = getLineColors(routeLine);
    return (
      <View style={styles.singleRouteContainer}>
        <View 
          testID="subway-icon"
          style={[styles.singleRouteIcon, { backgroundColor: lineColors.backgroundColor }]}
        >
          <Text style={[styles.singleRouteIconText, { color: lineColors.color }]}>{routeLine}</Text>
        </View>
      </View>
    );
  }
  
  // Transfer route - can be 2 or 3 lines
  const lines = routeLine.split('→');
  
  // Use different container style based on number of transfers
  const containerStyle = lines.length === 3 ? styles.tripleTransferContainer : styles.transferContainer;
  
  return (
    <View style={containerStyle}>
      {lines.map((line, index) => {
        const lineColors = getLineColors(line);
        return (
          <View 
            key={index}
            testID="subway-icon"
            style={[
              styles.subwayIcon, 
              index > 0 && styles.secondIcon,
              { backgroundColor: lineColors.backgroundColor }
            ]}
          >
            <Text testID={`subway-icon-${line}`} style={[styles.subwayIconText, { color: lineColors.color }]}>{line}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  singleRouteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Consistent left alignment with other route types
    minWidth: 40, // Minimum width to match iconContainer
    height: 40,
  },
  transferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to left for consistent positioning
    minWidth: 40, // Minimum width, but can expand
    height: 40,
  },
  tripleTransferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to left for consistent positioning
    minWidth: 40, // Minimum width like others, can expand naturally
    height: 40,
  },
  singleRouteIcon: {
    width: 32, // Original size for single routes
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleRouteIconText: {
    fontSize: 16, // Original font size for single routes
    fontWeight: '700',
  },
  subwayIcon: {
    width: 28, // Smaller to fit multiple icons
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondIcon: {
    marginLeft: 4, // Proper spacing between icons
  },
  subwayIconText: {
    fontSize: 14, // Smaller font for better fit
    fontWeight: '700',
  },
});
