import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, RefreshControl, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation, Clock, AlertCircle, Train, Zap } from 'lucide-react-native';
import { GPSLocationProvider, Location } from '../services/LocationService';
import { NearestStationService, NearestStationResult, ConsolidatedStationResult } from '../services/NearestStationService';
import { StationDepartureService, DeparturesByLine } from '../services/StationDepartureService';
import { RealMTAService, ServiceAlert } from '../services/RealMTAService';
import { getThemeStyles } from '../design/components';
import { useColorScheme } from 'react-native';
import { TransferRouteIcon } from '../components/TransferRouteIcon';
import { TrainTimePill } from '../components/TrainTimePill';
import { CriticalAlertPill } from '../components/shared/CriticalAlertPill';

interface LocationState {
  location: Location | null;
  nearestStation: ConsolidatedStationResult | null;
  loading: boolean;
  error: string | null;
}

interface DepartureState {
  departures: DeparturesByLine | null;
  loading: boolean;
  error: string | null;
}

interface AlertState {
  alerts: ServiceAlert[];
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
  const [directionChanging, setDirectionChanging] = useState(false);
  const hasInitiallyLoaded = useRef(false);
  
  const [departureState, setDepartureState] = useState<DepartureState>({
    departures: null,
    loading: false,
    error: null
  });

  const [alertState, setAlertState] = useState<AlertState>({
    alerts: [],
    loading: false,
    error: null
  });

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [webPullToRefresh, setWebPullToRefresh] = useState({
    startY: 0,
    currentY: 0,
    isDragging: false,
    threshold: 80 // pixels to trigger refresh
  });

  const gpsProvider = useRef(locationProvider || new GPSLocationProvider()).current;
  const mtaService = useRef(new RealMTAService()).current;

  const fetchDepartures = useCallback(async (station: ConsolidatedStationResult, direction: 'northbound' | 'southbound', silent = false) => {
    if (!silent) {
      setDepartureState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const departures = await StationDepartureService.getDeparturesForConsolidatedStation(station, direction);
      setDepartureState({
        departures,
        loading: false,
        error: null
      });
      // Mark that we've successfully loaded departures at least once
      hasInitiallyLoaded.current = true;
      
      // Check if we have any departures, if not, fetch alerts for this station
      const hasAnyDepartures = departures && Object.keys(departures).length > 0 && 
        Object.values(departures).some(lineDeparts => lineDeparts.length > 0);
      
      if (!hasAnyDepartures) {
        // Fetch alerts inline to avoid callback dependency issues
        setAlertState(prev => ({ ...prev, loading: true, error: null }));
        try {
          const stationLines = station.lines;
          const directionId = direction === 'northbound' ? 1 : 0;
          const allAlerts = await mtaService.getServiceAlertsForCommute(stationLines, directionId);
          
          const relevantAlerts = allAlerts.filter(alert => {
            if (alert.severity === 'info') return false;
            if (alert.activePeriod) {
              const now = new Date();
              const { start, end } = alert.activePeriod;
              if (start && start.getTime() > now.getTime()) return false;
              if (end && end.getTime() < now.getTime()) return false;
            }
            return true;
          });

          setAlertState({ alerts: relevantAlerts, loading: false, error: null });
        } catch (error) {
          console.error('Failed to fetch station alerts:', error);
          setAlertState({ alerts: [], loading: false, error: 'Unable to fetch service alerts' });
        }
      } else {
        // Clear alerts if we have departures
        setAlertState({ alerts: [], loading: false, error: null });
      }
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
      const nearestStation = NearestStationService.findNearestStationConsolidated(location);

      setLocationState({
        location,
        nearestStation,
        loading: false,
        error: null
      });

      setLastUpdated(new Date());

      // Fetch departures for the nearest station
      if (nearestStation) {
        // Inline departures fetching to avoid dependency issues
        setDepartureState(prev => ({ ...prev, loading: true, error: null }));
        try {
          const departures = await StationDepartureService.getDeparturesForConsolidatedStation(nearestStation, direction);
          setDepartureState({ departures, loading: false, error: null });
          hasInitiallyLoaded.current = true;
          
          // Check for alerts if no departures
          const hasAnyDepartures = departures && Object.keys(departures).length > 0 && 
            Object.values(departures).some(lineDeparts => lineDeparts.length > 0);
          
          if (!hasAnyDepartures) {
            setAlertState(prev => ({ ...prev, loading: true, error: null }));
            try {
              const stationLines = nearestStation.lines;
              const directionId = direction === 'northbound' ? 1 : 0;
              
              console.log(`[HelpScreen] 🚨 NO DEPARTURES DETECTED for ${nearestStation.name}`);
              console.log(`[HelpScreen] Station lines: ${stationLines.join(', ')}`);
              console.log(`[HelpScreen] Direction: ${direction} (directionId: ${directionId})`);
              
              const allAlerts = await mtaService.getServiceAlertsForCommute(stationLines, directionId);
              
              console.log(`[HelpScreen] Raw alerts from getServiceAlertsForCommute: ${allAlerts.length}`);
              allAlerts.forEach((alert, index) => {
                console.log(`[HelpScreen] Alert ${index + 1}: "${alert.headerText}" (severity: ${alert.severity}, routes: ${alert.affectedRoutes.join(',')})`);
                console.log(`[HelpScreen]   Description: "${alert.descriptionText}"`);
                console.log(`[HelpScreen]   Informed entities: ${JSON.stringify(alert.informedEntities.map(e => ({ routeId: e.routeId, directionId: e.directionId, stopId: e.stopId })))}`);
                if (alert.activePeriod) {
                  console.log(`[HelpScreen]   Active period: ${alert.activePeriod.start} to ${alert.activePeriod.end}`);
                }
              });
              
              const relevantAlerts = allAlerts.filter((alert, index) => {
                console.log(`[HelpScreen] 🔍 Filtering alert ${index + 1}: "${alert.headerText}"`);
                
                // Check if this is a station-skipping alert first
                const isStationSkipping = mtaService.isStationSkippingAlert(alert);
                
                if (alert.severity === 'info' && !isStationSkipping) {
                  console.log(`[HelpScreen]   ❌ Filtered out: info severity (not station-skipping)`);
                  return false;
                }
                
                if (isStationSkipping) {
                  console.log(`[HelpScreen]   ✅ Station-skipping alert - severity filter bypassed`);
                }
                
                if (alert.activePeriod && !isStationSkipping) {
                  const now = new Date();
                  const { start, end } = alert.activePeriod;
                  if (start && start.getTime() > now.getTime()) {
                    console.log(`[HelpScreen]   ❌ Filtered out: starts in future (${start})`);
                    return false;
                  }
                  if (end && end.getTime() < now.getTime()) {
                    console.log(`[HelpScreen]   ❌ Filtered out: ended in past (${end})`);
                    return false;
                  }
                } else if (alert.activePeriod && isStationSkipping) {
                  console.log(`[HelpScreen]   ✅ Station-skipping alert - time filter bypassed`);
                }
                
                console.log(`[HelpScreen]   ✅ Alert passed all filters`);
                return true;
              });

              console.log(`[HelpScreen] Final relevant alerts: ${relevantAlerts.length}`);
              setAlertState({ alerts: relevantAlerts, loading: false, error: null });
            } catch (error) {
              console.error('Failed to fetch station alerts:', error);
              setAlertState({ alerts: [], loading: false, error: 'Unable to fetch service alerts' });
            }
          } else {
            setAlertState({ alerts: [], loading: false, error: null });
          }
        } catch (error) {
          console.error('Failed to fetch departures:', error);
          setDepartureState({ departures: null, loading: false, error: 'Unable to fetch train departures' });
        }
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
  }, [direction]);

  const onRefresh = useCallback(async () => {
    console.log('[HelpScreen] Pull-to-refresh triggered');
    console.log('[HelpScreen] Platform info:', {
      OS: Platform.OS,
      Version: Platform.Version,
      isWeb: Platform.OS === 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    });
    
    setRefreshing(true);
    setDebugMessage('Refreshing location...');
    console.log('[HelpScreen] Refresh state set to true');
    
    // Ensure minimum refresh duration for visual feedback
    const startTime = Date.now();
    const minRefreshDuration = 500; // 500ms minimum
    
    try {
      console.log('[HelpScreen] Starting fetchLocation...');
      await fetchLocation();
      console.log('[HelpScreen] fetchLocation completed successfully');
      setDebugMessage('Refresh complete!');
    } catch (error) {
      console.error('[HelpScreen] Error during refresh:', error);
      setDebugMessage('Refresh failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    // Ensure minimum refresh duration
    const elapsed = Date.now() - startTime;
    if (elapsed < minRefreshDuration) {
      await new Promise(resolve => setTimeout(resolve, minRefreshDuration - elapsed));
    }
    
    console.log('[HelpScreen] Refresh completed, setting state to false');
    setRefreshing(false);
    
    // Clear debug message after 2 seconds
    setTimeout(() => setDebugMessage(''), 2000);
  }, [fetchLocation]);

  useEffect(() => {
    fetchLocation();
    
    // Auto-refresh every 30 seconds to keep departure times current
    const interval = setInterval(() => {
      fetchLocation();
    }, 30000); // Update every 30 seconds

    // Add touch event debugging for web platforms
    if (Platform.OS === 'web') {
      console.log('[HelpScreen] Setting up touch event debugging for web');
      
      const handleTouchStart = (e: TouchEvent) => {
        console.log('[HelpScreen] TouchStart detected:', {
          touches: e.touches.length,
          type: e.type,
          target: e.target?.tagName
        });
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        console.log('[HelpScreen] TouchMove detected:', {
          touches: e.touches.length,
          deltaY: e.touches[0]?.clientY
        });
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        console.log('[HelpScreen] TouchEnd detected');
      };
      
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }

    return () => clearInterval(interval);
  }, [fetchLocation]);

  // Web-specific pull-to-refresh handlers
  const handleWebTouchStart = useCallback((e: any) => {
    if (Platform.OS === 'web' && e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      setWebPullToRefresh(prev => ({
        ...prev,
        startY: touch.clientY,
        currentY: touch.clientY,
        isDragging: true
      }));
      console.log('[HelpScreen] Web pull-to-refresh started at Y:', touch.clientY);
    }
  }, []);

  const handleWebTouchMove = useCallback((e: any) => {
    if (Platform.OS === 'web' && webPullToRefresh.isDragging && e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaY = touch.clientY - webPullToRefresh.startY;
      
      if (deltaY > 0) { // Only track downward pulls
        setWebPullToRefresh(prev => ({
          ...prev,
          currentY: touch.clientY
        }));
        
        const pullDistance = Math.max(0, deltaY);
        console.log('[HelpScreen] Web pull distance:', pullDistance);
        
        if (pullDistance > webPullToRefresh.threshold) {
          setDebugMessage(`Pull to refresh (${Math.round(pullDistance)}px)`);
        }
      }
    }
  }, [webPullToRefresh.isDragging, webPullToRefresh.startY, webPullToRefresh.threshold]);

  const handleWebTouchEnd = useCallback(async () => {
    if (Platform.OS === 'web' && webPullToRefresh.isDragging) {
      const pullDistance = webPullToRefresh.currentY - webPullToRefresh.startY;
      
      console.log('[HelpScreen] Web pull-to-refresh ended, distance:', pullDistance);
      
      if (pullDistance > webPullToRefresh.threshold) {
        console.log('[HelpScreen] Web pull-to-refresh threshold reached, triggering refresh');
        setDebugMessage('Web pull-to-refresh triggered!');
        await onRefresh();
      } else {
        setDebugMessage('');
      }
      
      setWebPullToRefresh(prev => ({
        ...prev,
        isDragging: false,
        startY: 0,
        currentY: 0
      }));
    }
  }, [webPullToRefresh, onRefresh]);

  // Handle direction changes
  useEffect(() => {
    if (locationState.nearestStation && !locationState.loading) {
      // Use silent mode for direction changes to prevent UI flashing
      const isDirectionChange = hasInitiallyLoaded.current;
      
      const fetchDeparturesForDirection = async (silent: boolean = false) => {
        if (!silent) {
          setDepartureState(prev => ({ ...prev, loading: true, error: null }));
        }

        try {
          const departures = await StationDepartureService.getDeparturesForConsolidatedStation(locationState.nearestStation!, direction);
          setDepartureState({ departures, loading: false, error: null });
          hasInitiallyLoaded.current = true;
          
          // Check for alerts if no departures
          const hasAnyDepartures = departures && Object.keys(departures).length > 0 && 
            Object.values(departures).some(lineDeparts => lineDeparts.length > 0);
          
          if (!hasAnyDepartures) {
            setAlertState(prev => ({ ...prev, loading: true, error: null }));
            try {
              const stationLines = locationState.nearestStation!.lines;
              const directionId = direction === 'northbound' ? 1 : 0;
              
              console.log(`[HelpScreen Direction] 🚨 NO DEPARTURES for ${locationState.nearestStation!.name}`);
              console.log(`[HelpScreen Direction] Lines: ${stationLines.join(', ')}, Direction: ${direction} (${directionId})`);
              
              const allAlerts = await mtaService.getServiceAlertsForCommute(stationLines, directionId);
              
              console.log(`[HelpScreen Direction] Raw alerts: ${allAlerts.length}`);
              allAlerts.forEach((alert, index) => {
                console.log(`[HelpScreen Direction] Alert ${index + 1}: "${alert.headerText}" (${alert.severity}, routes: ${alert.affectedRoutes.join(',')})`);
              });
              
              const relevantAlerts = allAlerts.filter(alert => {
                // Station-skipping alerts bypass severity filtering
                const isStationSkipping = mtaService.isStationSkippingAlert(alert);
                if (alert.severity === 'info' && !isStationSkipping) return false;
                if (alert.activePeriod && !isStationSkipping) {
                  const now = new Date();
                  const { start, end } = alert.activePeriod;
                  if (start && start.getTime() > now.getTime()) return false;
                  if (end && end.getTime() < now.getTime()) return false;
                }
                return true;
              });

              console.log(`[HelpScreen Direction] Final alerts: ${relevantAlerts.length}`);
              setAlertState({ alerts: relevantAlerts, loading: false, error: null });
            } catch (error) {
              console.error('Failed to fetch station alerts:', error);
              setAlertState({ alerts: [], loading: false, error: 'Unable to fetch service alerts' });
            }
          } else {
            setAlertState({ alerts: [], loading: false, error: null });
          }
        } catch (error) {
          console.error('Failed to fetch departures:', error);
          setDepartureState({ departures: null, loading: false, error: 'Unable to fetch train departures' });
        }
      };

      if (isDirectionChange) {
        setDirectionChanging(true);
        fetchDeparturesForDirection(true).finally(() => {
          setDirectionChanging(false);
        });
      } else {
        // Initial load - use normal mode
        fetchDeparturesForDirection(false);
      }
    }
  }, [direction, locationState.nearestStation, locationState.loading]);

  const handleDirectionChange = (newDirection: 'northbound' | 'southbound') => {
    setDirection(newDirection);
  };

  const formatTrainLines = (lines: string[]): string => {
    return `${lines.join(', ')} train${lines.length > 1 ? 's' : ''}`;
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(2)} miles away`;
  };

  const hasAnyDepartures = (departures: DeparturesByLine | null): boolean => {
    return departures && Object.keys(departures).length > 0 && 
      Object.values(departures).some(lineDeparts => lineDeparts.length > 0);
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
        contentContainerStyle={{ paddingBottom: locationState.nearestStation ? 100 : 20 }}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {
                console.log('[HelpScreen] RefreshControl onRefresh callback triggered');
                onRefresh();
              }}
              tintColor={isDarkMode ? styles.theme.colors.success : styles.theme.colors.primary}
              colors={[styles.theme.colors.success, styles.theme.colors.primary]}
              progressBackgroundColor={styles.theme.colors.surface}
              progressViewOffset={20}
            />
          ) : undefined
        }
        onTouchStart={Platform.OS === 'web' ? handleWebTouchStart : undefined}
        onTouchMove={Platform.OS === 'web' ? handleWebTouchMove : undefined}
        onTouchEnd={Platform.OS === 'web' ? handleWebTouchEnd : undefined}
      >
        {/* Header */}
        <View style={styles.header.container}>
          <View style={{ flex: 1 }}>
            {/* LIVE Status moved above title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={[styles.indicator.container, styles.indicator.live, { marginRight: 8 }]}>
                <Zap size={10} color={styles.theme.colors.success} style={{ marginRight: 4 }} />
                <Text style={[styles.indicator.text, styles.indicator.liveText, { fontSize: 10 }]}>LIVE</Text>
              </View>
              <Text style={{ fontSize: 10, color: styles.theme.colors.textSecondary }}>
                {lastUpdated.toLocaleTimeString()}
              </Text>
              
              {/* Debug message for mobile PWA debugging */}
              {Platform.OS === 'web' && debugMessage && (
                <Text style={{ fontSize: 10, color: styles.theme.colors.success, marginLeft: 8 }}>
                  {debugMessage}
                </Text>
              )}
              
              {/* Manual refresh button for web/PWA debugging */}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  onPress={async () => {
                    console.log('[HelpScreen] Manual refresh button pressed');
                    try {
                      await onRefresh();
                      console.log('[HelpScreen] Manual refresh completed successfully');
                    } catch (error) {
                      console.error('[HelpScreen] Manual refresh failed:', error);
                    }
                  }}
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: refreshing ? styles.theme.colors.success : styles.theme.colors.primary,
                    borderRadius: 4
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10 }}>
                    {refreshing ? '⟳ Loading...' : '↻ Refresh'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={[styles.header.title, { fontSize: 24 }]}>Nearest Station</Text>
            <Text style={[styles.header.subtitle, { fontSize: 13 }]}>
              Your current location and nearby transit
            </Text>
          </View>
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




        {/* Next Departures */}
        {locationState.nearestStation && departureState.departures && hasAnyDepartures(departureState.departures) && (
          <View style={[styles.routeCard.container, screenStyles.card, { opacity: directionChanging ? 0.7 : 1.0 }]}>
            <View style={styles.routeCard.header}>
              <View style={styles.routeCard.mainInfo}>
                <View style={[styles.routeCard.iconContainer, { backgroundColor: styles.theme.colors.primary }]}>
                  <Train size={20} color="#FFFFFF" />
                </View>
                <View style={styles.routeCard.textInfo}>
                  <Text style={styles.routeCard.title}>{locationState.nearestStation.name}</Text>
                  <Text style={styles.routeCard.subtitle}>
                    {formatDistance(locationState.nearestStation.distance)} • {direction === 'northbound' ? 'North' : 'South'} trains
                  </Text>
                </View>
              </View>
            </View>

            {/* Departures by Line - Horizontal Layout */}
            {Object.entries(departureState.departures).map(([line, departures]) => (
              <View key={line} style={[screenStyles.lineRow, { borderTopColor: styles.theme.colors.border }]}>
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

        {/* No Departures State */}
        {locationState.nearestStation && departureState.departures && !hasAnyDepartures(departureState.departures) && (
          <View style={[styles.routeCard.container, screenStyles.card]}>
            <View style={styles.routeCard.header}>
              <View style={styles.routeCard.mainInfo}>
                <View style={[styles.routeCard.iconContainer, { backgroundColor: styles.theme.colors.warning || '#F59E0B' }]}>
                  <AlertCircle size={20} color="#FFFFFF" />
                </View>
                <View style={styles.routeCard.textInfo}>
                  <Text style={styles.routeCard.title}>{locationState.nearestStation.name}</Text>
                  <Text style={styles.routeCard.subtitle}>
                    {formatDistance(locationState.nearestStation.distance)} • {direction === 'northbound' ? 'North' : 'South'} trains
                  </Text>
                </View>
              </View>
            </View>

            {/* No Departures Message */}
            <View style={[screenStyles.lineRow, { borderTopColor: styles.theme.colors.border }]}>
              <Text style={[styles.routeCard.title, { color: styles.theme.colors.textSecondary, textAlign: 'center', flex: 1 }]}>
                No current departures
              </Text>
            </View>

            {/* Service Alerts for this station */}
            {alertState.alerts.length > 0 && (
              <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
                <Text style={{ 
                  color: styles.theme.colors.text, 
                  fontSize: 16, 
                  fontWeight: '600', 
                  marginBottom: 8,
                  paddingHorizontal: 8
                }}>
                  Service Alerts
                </Text>
                {alertState.alerts.map((alert) => (
                  <CriticalAlertPill
                    key={alert.id}
                    alert={alert}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </View>
            )}
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

        {/* Departures Loading - Only show during initial load, not direction changes */}
        {locationState.nearestStation && departureState.loading && !directionChanging && (
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
      
      {/* Fixed Direction Toggle - Pinned above bottom navigation */}
      {locationState.nearestStation && (
        <View style={[screenStyles.fixedToggleContainer, { backgroundColor: styles.theme.colors.background }]}>
          <View style={[screenStyles.directionToggleContainer, { backgroundColor: styles.theme.colors.surfaceSecondary }]}>
            <TouchableOpacity
              style={[
                screenStyles.directionToggle,
                { backgroundColor: styles.theme.colors.surface, borderColor: styles.theme.colors.border },
                direction === 'northbound' && [screenStyles.directionToggleActive, { backgroundColor: styles.theme.colors.primary, borderColor: styles.theme.colors.primary }]
              ]}
              onPress={() => handleDirectionChange('northbound')}
              disabled={directionChanging}
            >
              {directionChanging && direction === 'northbound' ? (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <Text style={[
                screenStyles.directionToggleText,
                { color: styles.theme.colors.textSecondary },
                direction === 'northbound' && [screenStyles.directionToggleTextActive, { color: '#FFFFFF' }]
              ]}>
                North
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                screenStyles.directionToggle,
                { backgroundColor: styles.theme.colors.surface, borderColor: styles.theme.colors.border },
                direction === 'southbound' && [screenStyles.directionToggleActive, { backgroundColor: styles.theme.colors.primary, borderColor: styles.theme.colors.primary }]
              ]}
              onPress={() => handleDirectionChange('southbound')}
              disabled={directionChanging}
            >
              {directionChanging && direction === 'southbound' ? (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <Text style={[
                screenStyles.directionToggleText,
                { color: styles.theme.colors.textSecondary },
                direction === 'southbound' && [screenStyles.directionToggleTextActive, { color: '#FFFFFF' }]
              ]}>
                South
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8, // Match padding with Morning/Afternoon pages
  },
  card: {
    marginTop: 12, // Reduced from 16 for compact spacing
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Reduced from 16
  },
  loadingText: {
    marginLeft: 8, // Reduced from 12
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 12, // Reduced from 16
  },
  errorMessage: {
    textAlign: 'center',
    marginTop: 6, // Reduced from 8
    lineHeight: 16, // Reduced from 20
  },
  stationName: {
    fontWeight: '600',
    // Color now applied inline using theme
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainsContainer: {
    paddingHorizontal: 16, // Reduced from 24
    paddingBottom: 12, // Reduced from 16
    borderTopWidth: 1,
    marginTop: 6, // Reduced from 8
    paddingTop: 12, // Reduced from 16
  },
  trainsText: {
    fontWeight: '500',
    // Color now applied inline using theme
  },
  directionToggleContainer: {
    flexDirection: 'row',
    padding: 12, // Reduced from 16
    borderRadius: 6, // Reduced from 8
    margin: 12, // Reduced from 16
  },
  directionToggle: {
    flex: 1,
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 12, // Reduced from 16
    borderRadius: 4, // Reduced from 6
    marginHorizontal: 3, // Reduced from 4
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionToggleActive: {
    // Colors now applied inline using theme
  },
  directionToggleText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  directionToggleTextActive: {
    // Colors now applied inline using theme
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, // Reduced from 24
    paddingVertical: 8, // Reduced from 12
    borderTopWidth: 1,
    // borderTopColor now applied inline using theme
  },
  trainLogoContainer: {
    marginRight: 12, // Reduced from 16
    width: 40, // Reduced from 50
    alignItems: 'flex-start',
  },
  timePillsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  fixedToggleContainer: {
    position: 'absolute',
    bottom: 8, // Position just above bottom navigation with small gap
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  }
});