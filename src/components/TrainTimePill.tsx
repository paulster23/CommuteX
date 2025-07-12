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

interface TrainTimePillProps {
  line: string;
  time: string;
  index: number;
}

export function TrainTimePill({ line, time, index }: TrainTimePillProps) {
  const lineColors = getLineColors(line);
  
  return (
    <View 
      testID={`time-pill-${line}-${index}`}
      style={[styles.pill, { backgroundColor: lineColors.backgroundColor }]}
    >
      <Text style={[styles.pillText, { color: lineColors.color }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12, // Increased for larger text
    paddingVertical: 8, // Increased for larger text
    borderRadius: 16, // Increased for larger appearance
    marginRight: 8, // Increased spacing
    marginBottom: 4,
    width: 80, // Doubled width for larger text
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 24, // Doubled from 12 for better accessibility
    fontWeight: '600',
  },
});