import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// NYC Subway line colors (official MTA colors)
const SUBWAY_COLORS: { [key: string]: string } = {
  'R': '#FCCC0A', // Yellow
  'F': '#FF6319', // Orange
  '4': '#00933C', // Green
  '6': '#00933C', // Green
  'N': '#FCCC0A', // Yellow
  'Q': '#FCCC0A', // Yellow
  'W': '#FCCC0A', // Yellow
  'B': '#FF6319', // Orange
  'D': '#FF6319', // Orange
  'M': '#FF6319', // Orange
  'G': '#6CBE45', // Light Green
  'L': '#A7A9AC', // Gray
  'A': '#0039A6', // Blue
  'C': '#0039A6', // Blue
  'E': '#0039A6', // Blue
  'J': '#996633', // Brown
  'Z': '#996633', // Brown
  '1': '#EE352E', // Red
  '2': '#EE352E', // Red
  '3': '#EE352E', // Red
  '5': '#00933C', // Green
  '7': '#B933AD', // Purple
  'S': '#808183', // Gray
};

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
        style={[styles.subwayIcon, { backgroundColor: SUBWAY_COLORS[routeLine] || '#666' }]}
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
        style={[styles.subwayIcon, { backgroundColor: SUBWAY_COLORS[firstLine] || '#666' }]}
      >
        <Text testID={`subway-icon-${firstLine}`} style={styles.subwayIconText}>{firstLine}</Text>
      </View>
      <Text style={styles.transferArrow}>→</Text>
      <View 
        testID="subway-icon"
        style={[styles.subwayIcon, { backgroundColor: SUBWAY_COLORS[secondLine] || '#666' }]}
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
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subwayIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  transferArrow: {
    fontSize: 16,
    marginHorizontal: 6,
    color: '#666',
  },
});
