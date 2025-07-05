import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, RefreshControl, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation, Clock, AlertCircle, Train } from 'lucide-react-native';
import { GPSLocationProvider, Location } from '../services/LocationService';
import { NearestStationService, NearestStationResult } from '../services/NearestStationService';
import { StationDepartureService, DeparturesByLine } from '../services/StationDepartureService';
import { getThemeStyles } from '../design/components';
import { useColorScheme } from 'react-native';
import { TransferRouteIcon } from '../components/TransferRouteIcon';
import { TrainTimePill } from '../components/TrainTimePill';

interface LocationState {
  location: Location | null;
  nearestStation: NearestStationResult | null;
  loading: boolean;
  error: string | null;
}

interface DepartureState {
  departures: DeparturesByLine | null;
  loading: boolean;
  error: string | null;
}

interface HelpScreenProps {
  locationProvider?: any;
}

export function HelpScreen({ locationProvider }: HelpScreenProps = {}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    nearestStation: null,
    loading: true,
    error: null
  });

  const [direction, setDirection] = useState<'northbound' | 'southbound'>('northbound');
  
  const [departureState, setDepartureState] = useState<DepartureState>({
    departures: null,
    loading: false,
    error: null
  });

  const gpsProvider = locationProvider || new GPSLocationProvider();

  const fetchDepartures = useCallback(async (station: any, direction: 'northbound' | 'southbound') => {
    setDepartureState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const departures = await StationDepartureService.getDeparturesForStation(station, direction);
      setDepartureState({
        departures,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch departures:', error);
      setDepartureState({
        departures: null,
        loading: false,
        error: 'Unable to fetch train departures'
      });
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setLocationState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const location = await gpsProvider.getCurrentLocation();
      const nearestStation = NearestStationService.findNearestStation(location);

      setLocationState({
        location,
        nearestStation,
        loading: false,
        error: null
      });

      // Fetch departures for the nearest station
      if (nearestStation) {
        await fetchDepartures(nearestStation.station, direction);
      }
    } catch (error) {
      let errorMessage = 'Unable to get your current location. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
          errorMessage = 'Please enable location permissions to see nearby subway stations.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Location request timed out. Please try again.';
        }
      }

      setLocationState({
        location: null,
        nearestStation: null,
        loading: false,
        error: errorMessage
      });
    }
  }, [direction, fetchDepartures]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Handle direction changes
  useEffect(() => {
    if (locationState.nearestStation && !locationState.loading) {
      fetchDepartures(locationState.nearestStation.station, direction);
    }
  }, [direction, locationState.nearestStation, locationState.loading, fetchDepartures]);

  const handleDirectionChange = (newDirection: 'northbound' | 'southbound') => {
    setDirection(newDirection);
  };

  const formatTrainLines = (lines: string[]): string => {
    return `${lines.join(', ')} train${lines.length > 1 ? 's' : ''}`;
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(2)} miles away`;
  };

  const getErrorTitle = (error: string): string => {
    if (error.includes('permission')) {
      return 'Location Access Denied';
    }
    return 'Location Unavailable';
  };

  return (
    <SafeAreaView 
      style={[screenStyles.container, { backgroundColor: styles.theme.colors.background }]} 
      edges={Platform.OS === 'ios' ? ['top'] : ['top']}
    >
      <ScrollView
        style={screenStyles.content}
        refreshControl={
          <RefreshControl 
            refreshing={locationState.loading} 
            onRefresh={fetchLocation}
            tintColor={styles.theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header.container, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={styles.header.title}>Help & Location</Text>
            <Text style={styles.header.subtitle}>Your current location and nearby transit</Text>
          </View>
          <MapPin size={24} color={styles.theme.colors.primary} />
        </View>

        {/* Loading State */}
        {locationState.loading && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={screenStyles.loadingContent}>
              <Navigation size={24} color={styles.theme.colors.primary} />
              <Text style={[styles.routeCard.title, screenStyles.loadingText]}>
                Getting your location...
              </Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {locationState.error && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={screenStyles.errorContent}>
              <AlertCircle size={24} color={styles.theme.colors.error} />
              <Text style={[styles.routeCard.title, { color: styles.theme.colors.error }]}>
                {getErrorTitle(locationState.error)}
              </Text>
              <Text style={[styles.routeCard.subtitle, screenStyles.errorMessage]}>
                {locationState.error}
              </Text>
            </View>
          </View>
        )}

        {/* Location Information */}
        {locationState.location && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={styles.routeCard.header}>
              <View style={styles.routeCard.mainInfo}>
                <View style={[styles.routeCard.iconContainer, { backgroundColor: styles.theme.colors.primary }]}>
                  <MapPin size={20} color="#FFFFFF" />
                </View>
                <View style={styles.routeCard.textInfo}>
                  <Text style={styles.routeCard.title}>Your Location</Text>
                  <Text style={styles.routeCard.subtitle}>
                    {locationState.location.lat.toFixed(6)}, {locationState.location.lng.toFixed(6)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Nearest Station Information */}
        {locationState.nearestStation && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={styles.routeCard.header}>
              <View style={styles.routeCard.mainInfo}>
                <View style={[styles.routeCard.iconContainer, { backgroundColor: styles.theme.colors.success }]}>
                  <Clock size={20} color="#FFFFFF" />
                </View>
                <View style={styles.routeCard.textInfo}>
                  <Text style={styles.routeCard.title}>Nearest Subway Station</Text>
                  <Text style={[styles.routeCard.subtitle, screenStyles.stationName]}>
                    {locationState.nearestStation.station.name}
                  </Text>
                </View>
              </View>
              <View style={styles.routeCard.timeInfo}>
                <Text style={[styles.routeCard.arrivalTime, screenStyles.distance]}>
                  {formatDistance(locationState.nearestStation.distance)}
                </Text>
              </View>
            </View>
            
            {/* Train Lines */}
            <View style={screenStyles.trainsContainer}>
              <Text style={[styles.routeCard.subtitle, screenStyles.trainsText]}>
                {formatTrainLines(locationState.nearestStation.station.lines)}
              </Text>
            </View>
          </View>
        )}

        {/* Direction Toggle */}
        {locationState.nearestStation && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={screenStyles.directionToggleContainer}>
              <TouchableOpacity
                style={[
                  screenStyles.directionToggle,
                  direction === 'northbound' && screenStyles.directionToggleActive
                ]}
                onPress={() => handleDirectionChange('northbound')}
              >
                <Text style={[
                  screenStyles.directionToggleText,
                  direction === 'northbound' && screenStyles.directionToggleTextActive
                ]}>
                  Northbound
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  screenStyles.directionToggle,
                  direction === 'southbound' && screenStyles.directionToggleActive
                ]}
                onPress={() => handleDirectionChange('southbound')}
              >
                <Text style={[
                  screenStyles.directionToggleText,
                  direction === 'southbound' && screenStyles.directionToggleTextActive
                ]}>
                  Southbound
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Next Departures */}
        {locationState.nearestStation && departureState.departures && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={styles.routeCard.header}>
              <View style={styles.routeCard.mainInfo}>
                <View style={[styles.routeCard.iconContainer, { backgroundColor: styles.theme.colors.primary }]}>
                  <Train size={20} color="#FFFFFF" />
                </View>
                <View style={styles.routeCard.textInfo}>
                  <Text style={styles.routeCard.title}>Next Departures</Text>
                  <Text style={styles.routeCard.subtitle}>
                    {direction === 'northbound' ? 'Northbound' : 'Southbound'} trains
                  </Text>
                </View>
              </View>
            </View>

            {/* Departures by Line - Horizontal Layout */}
            {Object.entries(departureState.departures).map(([line, departures]) => (
              <View key={line} style={screenStyles.lineRow}>
                <View style={screenStyles.trainLogoContainer}>
                  <View testID={`train-logo-${line}`}>
                    <TransferRouteIcon routeLine={line} />
                  </View>
                </View>
                <View style={screenStyles.timePillsContainer}>
                  {departures.slice(0, 5).map((departure, index) => (
                    <TrainTimePill 
                      key={index}
                      line={line}
                      time={departure.relativeTime}
                      index={index}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Departures Loading */}
        {locationState.nearestStation && departureState.loading && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={screenStyles.loadingContent}>
              <Train size={24} color={styles.theme.colors.primary} />
              <Text style={[styles.routeCard.title, screenStyles.loadingText]}>
                Loading departures...
              </Text>
            </View>
          </View>
        )}

        {/* Departures Error */}
        {locationState.nearestStation && departureState.error && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={screenStyles.errorContent}>
              <AlertCircle size={24} color={styles.theme.colors.error} />
              <Text style={[styles.routeCard.title, { color: styles.theme.colors.error }]}>
                Departure Information Unavailable
              </Text>
              <Text style={[styles.routeCard.subtitle, screenStyles.errorMessage]}>
                {departureState.error}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginTop: 16,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 12,
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorMessage: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  stationName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 16,
  },
  trainsText: {
    fontWeight: '500',
    color: '#6B7280',
  },
  directionToggleContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    margin: 16,
  },
  directionToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  directionToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  directionToggleText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#6B7280',
  },
  directionToggleTextActive: {
    color: '#FFFFFF',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trainLogoContainer: {
    marginRight: 16,
    width: 50,
    alignItems: 'flex-start',
  },
  timePillsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  }
});