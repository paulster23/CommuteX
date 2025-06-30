import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { NextTrainDeparture } from '../services/RealMTAService';
import { getThemeStyles } from '../design/components';
import { colors } from '../design/theme';

interface TrainDeparturePillsProps {
  departures: NextTrainDeparture[];
  stationName: string;
}

// Mock data for F trains at Carroll St and C trains at Jay St-MetroTech
const getFTrainDepartures = (): NextTrainDeparture[] => {
  const now = new Date();
  return [
    {
      trainLine: 'F',
      departureTime: new Date(now.getTime() + 3 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 3
    },
    {
      trainLine: 'F',
      departureTime: new Date(now.getTime() + 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 8
    },
    {
      trainLine: 'F',
      departureTime: new Date(now.getTime() + 14 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 14
    }
  ];
};

const getCTrainDepartures = (): NextTrainDeparture[] => {
  const now = new Date();
  return [
    {
      trainLine: 'C',
      departureTime: new Date(now.getTime() + 5 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 5
    },
    {
      trainLine: 'C',
      departureTime: new Date(now.getTime() + 12 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 12
    },
    {
      trainLine: 'C',
      departureTime: new Date(now.getTime() + 18 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minutesAway: 18
    }
  ];
};

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

  const fTrains = getFTrainDepartures();
  const cTrains = getCTrainDepartures();

  return (
    <View style={{ marginBottom: 12 }}>
      {/* F trains at Carroll St */}
      {renderTrainRow(fTrains, 'Carroll St')}
      
      {/* C trains at Jay St-MetroTech */}
      {renderTrainRow(cTrains, 'Jay St-MetroTech')}
    </View>
  );
}