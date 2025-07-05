import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../design/theme';

interface TransferRouteIconProps {
  routeLine: string;
}

export function TransferRouteIcon({ routeLine }: TransferRouteIconProps) {
  const isTransfer = routeLine.includes('→');
  
  if (!isTransfer) {
    // Single route - use same container structure for consistency
    return (
      <View style={styles.singleRouteContainer}>
        <View 
          testID="subway-icon"
          style={[styles.singleRouteIcon, { backgroundColor: colors.subway[routeLine as keyof typeof colors.subway] || '#666' }]}
        >
          <Text style={styles.singleRouteIconText}>{routeLine}</Text>
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
      {lines.map((line, index) => (
        <View 
          key={index}
          testID="subway-icon"
          style={[
            styles.subwayIcon, 
            index > 0 && styles.secondIcon,
            { backgroundColor: colors.subway[line as keyof typeof colors.subway] || '#666' }
          ]}
        >
          <Text testID={`subway-icon-${line}`} style={styles.subwayIconText}>{line}</Text>
        </View>
      ))}
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
    color: '#fff',
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
    color: '#fff',
  },
});
