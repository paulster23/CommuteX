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
  
  // Transfer route - can be 2 or 3 lines
  const lines = routeLine.split('→');
  
  return (
    <View style={styles.transferContainer}>
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
