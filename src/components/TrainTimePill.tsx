import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../design/theme';

interface TrainTimePillProps {
  line: string;
  time: string;
  index: number;
}

export function TrainTimePill({ line, time, index }: TrainTimePillProps) {
  const backgroundColor = colors.subway[line as keyof typeof colors.subway] || '#666';
  
  return (
    <View 
      testID={`time-pill-${line}-${index}`}
      style={[styles.pill, { backgroundColor }]}
    >
      <Text style={styles.pillText}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10, // Reduced from 12 for wider pills
    paddingVertical: 4, // Reduced from 6 for compact density
    borderRadius: 12, // Reduced from 16 for compact appearance
    marginRight: 6, // Reduced from 8 for wider pills
    marginBottom: 4,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12, // Reduced from 14 for iPhone 13 mini
    fontWeight: '600',
  },
});