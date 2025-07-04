import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, RefreshControl, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation, Clock, AlertCircle } from 'lucide-react-native';
import { GPSLocationProvider, Location } from '../services/LocationService';
import { NearestStationService, NearestStationResult } from '../services/NearestStationService';
import { getThemeStyles } from '../design/components';
import { useColorScheme } from 'react-native';

interface LocationState {
  location: Location | null;
  nearestStation: NearestStationResult | null;
  loading: boolean;
  error: string | null;
}

export function HelpScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    nearestStation: null,
    loading: true,
    error: null
  });

  const gpsProvider = new GPSLocationProvider();

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
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

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
  }
});