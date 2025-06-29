import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { NextTrainDeparture } from '../services/RealMTAService';
import { getThemeStyles } from '../design/components';
import { colors } from '../design/theme';

interface TrainDeparturePillsProps {
  departures: NextTrainDeparture[];
  stationName: string;
}

export function TrainDeparturePills({ departures, stationName }: TrainDeparturePillsProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  if (!departures || departures.length === 0) {
    return null;
  }

  const getSubwayColor = (line: string): string => {
    return colors.subway[line as keyof typeof colors.subway] || styles.theme.colors.textSecondary;
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ 
        fontSize: 12, 
        color: styles.theme.colors.textSecondary, 
        marginBottom: 6,
        textAlign: 'center'
      }}>
        Next trains from {stationName}
      </Text>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 8 
      }}>
        {departures.slice(0, 3).map((departure, index) => (
          <View
            key={index}
            style={{
              backgroundColor: getSubwayColor(departure.trainLine),
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              alignItems: 'center',
              minWidth: 80
            }}
          >
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 2
            }}>
              {departure.trainLine}
            </Text>
            <Text style={{
              color: '#fff',
              fontSize: 11,
              opacity: 0.9
            }}>
              {departure.departureTime}
            </Text>
            <Text style={{
              color: '#fff',
              fontSize: 10,
              opacity: 0.8
            }}>
              {departure.minutesAway} min
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}