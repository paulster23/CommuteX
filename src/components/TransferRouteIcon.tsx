import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../design/theme';

interface TransferRouteIconProps {
  routeLine: string;
}

export function TransferRouteIcon({ routeLine }: TransferRouteIconProps) {
  const isTransfer = routeLine.includes('→');
  
  if (!isTransfer) {
    // Single route
    return (
      <View 
        testID="subway-icon"
        style={[styles.subwayIcon, { backgroundColor: colors.subway[routeLine as keyof typeof colors.subway] || '#666' }]}
      >
        <Text style={styles.subwayIconText}>{routeLine}</Text>
      </View>
    );
  }
  
  // Transfer route
  const [firstLine, secondLine] = routeLine.split('→');
  
  return (
    <View style={styles.transferContainer}>
      <View 
        testID="subway-icon"
        style={[styles.subwayIcon, { backgroundColor: colors.subway[firstLine as keyof typeof colors.subway] || '#666' }]}
      >
        <Text testID={`subway-icon-${firstLine}`} style={styles.subwayIconText}>{firstLine}</Text>
      </View>
      <View 
        testID="subway-icon"
        style={[styles.subwayIcon, styles.secondIcon, { backgroundColor: colors.subway[secondLine as keyof typeof colors.subway] || '#666' }]}
      >
        <Text testID={`subway-icon-${secondLine}`} style={styles.subwayIconText}>{secondLine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subwayIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondIcon: {
    marginLeft: 4,
  },
  subwayIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
