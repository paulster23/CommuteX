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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});