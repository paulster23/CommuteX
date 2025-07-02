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

  const getSubwayColor = (line: string): string => {
    return colors.subway[line as keyof typeof colors.subway] || styles.theme.colors.textSecondary;
  };

  const renderTrainRow = (trains: NextTrainDeparture[], station: string) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ 
        fontSize: 12, 
        color: styles.theme.colors.textSecondary, 
        marginBottom: 6,
        textAlign: 'center'
      }}>
        Next {trains[0]?.trainLine} trains from {station}
      </Text>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 8 
      }}>
        {trains.slice(0, 3).map((departure, index) => (
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
            {/* Minutes away is now the main information */}
            <Text style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 1
            }}>
              {departure.minutesAway} min
            </Text>
            {/* Departure time is now secondary */}
            <Text style={{
              color: '#fff',
              fontSize: 10,
              opacity: 0.8
            }}>
              {departure.departureTime}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Use real GTFS data from props instead of hardcoded mock data
  if (!departures || departures.length === 0) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ 
          fontSize: 12, 
          color: styles.theme.colors.textSecondary, 
          marginBottom: 6,
          textAlign: 'center'
        }}>
          No departures available from {stationName}
        </Text>
      </View>
    );
  }

  // Group departures by train line
  const groupedDepartures = departures.reduce((acc, departure) => {
    if (!acc[departure.trainLine]) {
      acc[departure.trainLine] = [];
    }
    acc[departure.trainLine].push(departure);
    return acc;
  }, {} as { [key: string]: NextTrainDeparture[] });

  return (
    <View style={{ marginBottom: 12 }}>
      {Object.entries(groupedDepartures).map(([trainLine, trains]) => {
        // Use different station names for different train lines
        const displayStationName = trainLine === 'C' ? 'Jay St-MetroTech' : stationName;
        return (
          <View key={trainLine}>
            {renderTrainRow(trains, displayStationName)}
          </View>
        );
      })}
    </View>
  );
}