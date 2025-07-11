import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, useColorScheme, Platform } from 'react-native';
import { Zap } from 'lucide-react-native';
import { RealMTAService, Route, ServiceAlert } from '../../services/RealMTAService';
import { RouteCard } from './RouteCard';
import { CriticalAlertPill } from './CriticalAlertPill';
import { getThemeStyles } from '../../design/components';
import { colors } from '../../design/theme';
import { useWebPullToRefresh } from '../../hooks/useWebPullToRefresh';
import { ClockSyncService, TimeValidationResult } from '../../services/ClockSyncService';

interface CommuteConfig {
  title: string;
  origin: string;
  destination: string;
  targetArrival: string;
  calculateRoutes: (service: RealMTAService, origin: string, destination: string, targetArrival: string) => Promise<Route[]>;
  testId?: string;
}

interface CommuteAppBaseProps {
  config: CommuteConfig;
}

/**
 * Format data freshness indicator
 */
function formatDataFreshness(lastUpdated: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
  
  if (secondsAgo < 30) {
    return 'Just updated';
  } else if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  } else if (secondsAgo < 120) {
    return '1m ago';
  } else {
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo}m ago`;
  }
}

/**
 * Format service alert active period for display
 */
function formatAlertTimePeriod(activePeriod?: { start?: Date; end?: Date }): string {
  if (!activePeriod) {
    return ''; // No timing information available
  }

  const now = new Date();
  const { start, end } = activePeriod;

  // Format time for display (e.g., "2:30 PM")
  const formatTime = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('[CommuteAppBase] Error formatting time:', date, error);
      return 'Invalid Time';
    }
  };

  // Format date for display (e.g., "Dec 25")
  const formatDate = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('[CommuteAppBase] Error formatting date:', date, error);
      return 'Invalid Date';
    }
  };

  // Check if date is today
  const isToday = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return false;
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // Check if date is tomorrow
  const isTomorrow = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return date.getDate() === tomorrow.getDate() &&
             date.getMonth() === tomorrow.getMonth() &&
             date.getFullYear() === tomorrow.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // Validate dates before processing
  const isValidDate = (date: Date | undefined) => {
    return date && !isNaN(date.getTime());
  };

  // Build time period string
  if (isValidDate(start) && isValidDate(end)) {
    // Both start and end times
    if (isToday(start!) && isToday(end!)) {
      return `Today ${formatTime(start!)} - ${formatTime(end!)}`;
    } else if (isToday(start!) && isTomorrow(end!)) {
      return `Today ${formatTime(start!)} - Tomorrow ${formatTime(end!)}`;
    } else if (start!.getDate() === end!.getDate() && start!.getMonth() === end!.getMonth() && start!.getFullYear() === end!.getFullYear()) {
      // Same day but not today
      return `${formatDate(start!)} ${formatTime(start!)} - ${formatTime(end!)}`;
    } else {
      // Different days
      return `${formatDate(start!)} ${formatTime(start!)} - ${formatDate(end!)} ${formatTime(end!)}`;
    }
  } else if (isValidDate(start)) {
    // Only start time
    if (isToday(start!)) {
      return `Starting today at ${formatTime(start!)}`;
    } else if (isTomorrow(start!)) {
      return `Starting tomorrow at ${formatTime(start!)}`;
    } else {
      return `Starting ${formatDate(start!)} at ${formatTime(start!)}`;
    }
  } else if (isValidDate(end)) {
    // Only end time
    if (isToday(end!)) {
      return `Until today at ${formatTime(end!)}`;
    } else if (isTomorrow(end!)) {
      return `Until tomorrow at ${formatTime(end!)}`;
    } else {
      return `Until ${formatDate(end!)} at ${formatTime(end!)}`;
    }
  }

  return '';
}

export function CommuteAppBase({ config }: CommuteAppBaseProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
  const [serviceAlerts, setServiceAlerts] = useState<ServiceAlert[]>([]);
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [clockValidation, setClockValidation] = useState<TimeValidationResult | null>(null);
  
  const mtaService = new RealMTAService();

  // Filter alerts to only show warning and severe, and only currently active alerts
  const filteredServiceAlerts = serviceAlerts.filter(alert => {
    // Only show warning and severe alerts
    if (alert.severity === 'info') {
      return false;
    }
    
    // Only show currently active alerts
    if (alert.activePeriod) {
      const now = new Date();
      const { start, end } = alert.activePeriod;
      
      // If alert has start time and it's in the future, don't show
      if (start && start.getTime() > now.getTime()) {
        return false;
      }
      
      // If alert has end time and it's in the past, don't show
      if (end && end.getTime() < now.getTime()) {
        return false;
      }
    }
    
    return true;
  });


  const setDebugMessageCallback = useCallback((message: string) => {
    setDebugMessage(message);
  }, []);

  useEffect(() => {
    loadRoutes();
    loadServiceAlerts();
    validateClockAccuracy();
    
    // Use smart refresh intervals based on next departure proximity
    const refreshInterval = setSmartRefreshInterval();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const setSmartRefreshInterval = () => {
    let currentInterval: NodeJS.Timeout | null = null;
    
    const scheduleNextRefresh = () => {
      const refreshIntervalMs = calculateRefreshInterval();
      
      currentInterval = setTimeout(() => {
        loadRoutes();
        loadServiceAlerts();
        scheduleNextRefresh(); // Schedule next refresh with updated interval
      }, refreshIntervalMs);
    };
    
    // Start the smart refresh cycle
    scheduleNextRefresh();
    
    // Return cleanup function
    return () => {
      if (currentInterval) {
        clearTimeout(currentInterval);
      }
    };
  };

  const calculateRefreshInterval = (): number => {
    if (routes.length === 0) {
      return 30000; // Default 30s when no routes
    }
    
    // Find the next departure time
    const now = new Date();
    const nextDepartures = routes
      .map(route => {
        // Parse arrival time to find the earliest upcoming time
        const arrivalTime = parseTime(route.arrivalTime);
        return arrivalTime.getTime() - now.getTime();
      })
      .filter(diff => diff > 0) // Only future times
      .sort((a, b) => a - b);
    
    if (nextDepartures.length === 0) {
      return 30000; // Default 30s if no upcoming departures
    }
    
    const nextDepartureMs = nextDepartures[0];
    const nextDepartureMinutes = nextDepartureMs / (60 * 1000);
    
    // Adaptive refresh intervals based on proximity to next departure
    if (nextDepartureMinutes <= 2) {
      return 10000; // 10 seconds when train is very close
    } else if (nextDepartureMinutes <= 5) {
      return 15000; // 15 seconds when train is close
    } else if (nextDepartureMinutes <= 10) {
      return 20000; // 20 seconds when train is moderately close
    } else {
      return 30000; // 30 seconds for distant trains
    }
  };

  // Helper function to parse time strings (reuse existing logic)
  const parseTime = (timeStr: string): Date => {
    const today = new Date();
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minutes);
    
    // If time is in the past, assume next day
    if (targetDate.getTime() < Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    return targetDate;
  };

  const validateClockAccuracy = async () => {
    try {
      const validation = await ClockSyncService.validateClockAccuracy();
      setClockValidation(validation);
      
      if (!validation.isAccurate) {
        console.warn('[CommuteAppBase] Clock drift detected:', validation.offsetSeconds, 'seconds');
      }
    } catch (error) {
      console.warn('[CommuteAppBase] Clock validation failed:', error);
    }
  };

  const loadRoutes = async () => {
    try {
      setError(null);
      console.log(`[DEBUG ${config.title}] Loading routes...`);
      const routeData = await config.calculateRoutes(
        mtaService,
        config.origin,
        config.destination,
        config.targetArrival
      );
      console.log(`[DEBUG ${config.title}] Received route data:`, routeData);
      console.log(`[DEBUG ${config.title}] Number of routes:`, routeData.length);
      
      // Log details about routes
      routeData.forEach((route, index) => {
        console.log(`[DEBUG ${config.title}] Route ${index + 1} (${route.method}):`, {
          finalWalkingTime: route.finalWalkingTime,
          walkingDistance: route.walkingDistance,
          endingStation: route.endingStation,
          totalDuration: route.duration
        });
      });
      
      setRoutes(routeData);
      setLastUpdated(new Date()); // Update timestamp when routes are loaded
      
      // Expand the first route (earliest arrival time) by default
      if (routeData.length > 0) {
        setExpandedRoutes(new Set([routeData[0].id]));
      }
    } catch (error) {
      console.error(`[DEBUG ${config.title}] Failed to load routes:`, error);
      setError(error instanceof Error ? error.message : `Unable to load ${config.title.toLowerCase()} MTA data`);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceAlerts = async () => {
    try {
      // Determine direction based on config.title
      // Morning: Brooklyn → Manhattan = northbound = direction 1
      // Afternoon: Manhattan → Brooklyn = southbound = direction 0
      const direction = config.title.toLowerCase().includes('afternoon') ? 0 : 1;
      
      const alerts = await mtaService.getServiceAlertsForCommute(['F', 'C', 'A'], direction);
      setServiceAlerts(alerts);
    } catch (error) {
      console.error(`[${config.title}] Failed to load service alerts:`, error);
      setServiceAlerts([]);
    }
  };

  const onRefresh = async () => {
    console.log('[CommuteAppBase] Pull-to-refresh triggered for', config.title);
    console.log('[CommuteAppBase] Platform info:', {
      OS: Platform.OS,
      Version: Platform.Version,
      isWeb: Platform.OS === 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    });
    
    setRefreshing(true);
    setDebugMessage('Refreshing data...');
    console.log('[CommuteAppBase] Refresh state set to true');
    
    // Ensure minimum refresh duration for visual feedback
    const startTime = Date.now();
    const minRefreshDuration = 500; // 500ms minimum
    
    try {
      console.log('[CommuteAppBase] Starting data refresh...');
      await Promise.all([
        loadRoutes(),
        loadServiceAlerts()
      ]);
      console.log('[CommuteAppBase] Data refresh completed successfully');
      setDebugMessage('Refresh complete!');
    } catch (error) {
      console.error('[CommuteAppBase] Error during refresh:', error);
      setDebugMessage('Refresh failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    // Ensure minimum refresh duration
    const elapsed = Date.now() - startTime;
    if (elapsed < minRefreshDuration) {
      await new Promise(resolve => setTimeout(resolve, minRefreshDuration - elapsed));
    }
    
    console.log('[CommuteAppBase] Refresh completed, setting state to false');
    setRefreshing(false);
    // Clear debug message after 2 seconds
    setTimeout(() => setDebugMessage(''), 2000);
  };

  const { touchHandlers } = useWebPullToRefresh({
    onRefresh,
    threshold: 80,
    onDebugMessage: setDebugMessageCallback
  });

  const toggleRouteExpansion = (routeId: number) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };


  // Parse origin and destination for display
  const originDisplay = config.origin.split(',')[0];
  const destinationDisplay = config.destination.split(',')[0];

  return (
    <View 
      testID={config.title === 'Morning Commute' ? 'app-container' : 'afternoon-app-container'}
      style={{ flex: 1, backgroundColor: styles.theme.colors.background }}
    >
      {/* Header */}
      <View style={styles.header.container}>
        <View style={{ flex: 1 }}>
          {/* LIVE Status moved above title */}
          <View testID="compact-status-widget" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[styles.indicator.container, styles.indicator.live, { marginRight: 8 }]}>
              <Zap size={10} color={styles.theme.colors.success} style={{ marginRight: 4 }} />
              <Text style={[styles.indicator.text, styles.indicator.liveText, { fontSize: 10 }]}>LIVE</Text>
            </View>
            <Text style={{ fontSize: 10, color: styles.theme.colors.textSecondary }}>
              {formatDataFreshness(lastUpdated)}
            </Text>
            
            {/* Debug message for web/PWA debugging */}
            {debugMessage && (
              <Text style={{ fontSize: 10, color: styles.theme.colors.success, marginLeft: 8 }}>
                {debugMessage}
              </Text>
            )}
            
            {/* Manual refresh button for web/PWA debugging */}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                onPress={async () => {
                  console.log('[CommuteAppBase] Manual refresh button pressed');
                  try {
                    await onRefresh();
                    console.log('[CommuteAppBase] Manual refresh completed successfully');
                  } catch (error) {
                    console.error('[CommuteAppBase] Manual refresh failed:', error);
                  }
                }}
                disabled={refreshing}
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: refreshing ? styles.theme.colors.textSecondary : styles.theme.colors.primary,
                  borderRadius: 4,
                  opacity: refreshing ? 0.6 : 1
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10 }}>
                  {refreshing ? '⟳ Loading...' : '↻ Refresh'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.header.title, { fontSize: 24 }]}>{config.title}</Text>
          <Text style={[styles.header.subtitle, { fontSize: 13 }]}>
            {originDisplay} → {destinationDisplay}
          </Text>
        </View>
        
      </View>

      {/* Clock Drift Warning */}
      {clockValidation && !clockValidation.isAccurate && (
        <View style={{
          backgroundColor: styles.theme.colors.warning || '#FFA500',
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginHorizontal: 8,
          marginBottom: 8,
          borderRadius: 6
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '500',
            textAlign: 'center'
          }}>
            ⏰ {clockValidation.warningMessage}
          </Text>
        </View>
      )}


      <ScrollView
        testID={config.title === 'Morning Commute' ? 'scroll-view' : 'afternoon-routes-container'}
        style={{ flex: 1, paddingHorizontal: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={styles.theme.colors.primary}
              colors={[styles.theme.colors.primary]}
              progressBackgroundColor={styles.theme.colors.surface}
              progressViewOffset={0}
            />
          ) : undefined
        }
        {...touchHandlers}
      >

        {/* Routes */}
        {loading ? (
          <View style={styles.state.loadingContainer}>
            <Text style={styles.state.loadingText}>
              {config.title === 'Morning Commute' ? 
                'Loading real-time MTA data...' : 
                `Loading real-time ${config.title.toLowerCase()} MTA data...`
              }
            </Text>
          </View>
        ) : error ? (
          <View style={styles.state.errorContainer}>
            <Text style={styles.state.errorTitle}>⚠️ MTA Data Unavailable</Text>
            <Text style={styles.state.errorMessage}>{error}</Text>
            <TouchableOpacity 
              style={styles.button.primary}
              onPress={loadRoutes}
            >
              <Text style={styles.button.primaryText}>Retry</Text>
            </TouchableOpacity>
            <Text style={styles.state.errorHelp}>
              This app only shows real MTA data. No mock or fallback data is displayed.
            </Text>
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.state.errorContainer}>
            <Text style={styles.state.errorTitle}>No Routes Available</Text>
            <Text style={styles.state.errorMessage}>
              No real-time route data available for your commute at this time.
            </Text>
            <TouchableOpacity 
              style={styles.button.primary}
              onPress={loadRoutes}
            >
              <Text style={styles.button.primaryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map((route, index) => (
            <RouteCard
              key={route.id}
              route={route}
              isExpanded={expandedRoutes.has(route.id)}
              onToggle={() => toggleRouteExpansion(route.id)}
              isBestRoute={index === 0} // First route is now the fastest
            />
          ))
        )}

        {/* Service Alerts Section */}
        {routes.length > 0 && (
          <View style={[styles.card(), { marginTop: 20, marginBottom: 40 }]}>
            <Text style={{ color: styles.theme.colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Service Alerts
            </Text>
            {filteredServiceAlerts.length === 0 ? (
              <Text style={{ color: styles.theme.colors.textSecondary, fontSize: 14 }}>
                No active service alerts for this route
              </Text>
            ) : (
              filteredServiceAlerts.map((alert) => (
                <CriticalAlertPill
                  key={alert.id}
                  alert={alert}
                  isDarkMode={isDarkMode}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}