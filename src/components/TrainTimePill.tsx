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
  feedSource?: string;
}

export function TrainTimePill({ line, time, index, feedSource }: TrainTimePillProps) {
  const lineColors = getLineColors(line);
  
  return (
    <View 
      testID={`time-pill-${line}-${index}`}
      style={[styles.pill, { backgroundColor: lineColors.backgroundColor }]}
    >
      <Text style={[styles.pillText, { color: lineColors.color }]}>{time}</Text>
      {feedSource && (
        <Text style={[styles.feedSourceText, { color: lineColors.color }]}>
          {feedSource}
        </Text>
      )}
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
    width: 40, // Fixed width to prevent layout jumping
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12, // Reduced from 14 for iPhone 13 mini
    fontWeight: '600',
  },
  feedSourceText: {
    fontSize: 7,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 1,
  },
});