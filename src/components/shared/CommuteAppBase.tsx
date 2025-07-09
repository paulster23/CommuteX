import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, useColorScheme, Platform } from 'react-native';
import { Zap } from 'lucide-react-native';
import { RealMTAService, Route, ServiceAlert } from '../../services/RealMTAService';
import { RouteCard } from './RouteCard';
import { getThemeStyles } from '../../design/components';
import { colors } from '../../design/theme';

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
  
  const mtaService = new RealMTAService();

  useEffect(() => {
    loadRoutes();
    loadServiceAlerts();
    
    const interval = setInterval(() => {
      loadRoutes();
      loadServiceAlerts();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

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
    
    setRefreshing(true);
    setDebugMessage('Refreshing data...');
    
    try {
      await Promise.all([
        loadRoutes(),
        loadServiceAlerts()
      ]);
      setDebugMessage('Refresh complete!');
    } catch (error) {
      console.error('[CommuteAppBase] Error during refresh:', error);
      setDebugMessage('Refresh failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRefreshing(false);
      // Clear debug message after 2 seconds
      setTimeout(() => setDebugMessage(''), 2000);
    }
  };


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
              {lastUpdated.toLocaleTimeString()}
            </Text>
            
            {/* Debug message */}
            {debugMessage && (
              <Text style={{ fontSize: 10, color: styles.theme.colors.success, marginLeft: 8 }}>
                {debugMessage}
              </Text>
            )}
            
            {/* Manual refresh button for web debugging */}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                onPress={onRefresh}
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

      <ScrollView
        testID={config.title === 'Morning Commute' ? 'scroll-view' : 'afternoon-routes-container'}
        style={{ flex: 1, paddingHorizontal: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.theme.colors.primary}
            colors={[styles.theme.colors.primary]}
            progressBackgroundColor={styles.theme.colors.surface}
            progressViewOffset={0}
          />
        }
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
            <Text style={{ color: styles.theme.colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Service Alerts</Text>
            {serviceAlerts.length === 0 ? (
              <Text style={{ color: styles.theme.colors.textSecondary, fontSize: 14 }}>
                No active service alerts for this route
              </Text>
            ) : (
              serviceAlerts.map((alert) => (
                <View key={alert.id} style={{ marginBottom: 12 }}>
                  {/* Icons and Direction Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    {/* Subway Line Icons */}
                    <View style={{ flexDirection: 'row', marginRight: 12 }}>
                      {alert.affectedRoutes.map((line) => (
                        <View
                          key={line}
                          style={{
                            backgroundColor: colors.subway[line as keyof typeof colors.subway] || styles.theme.colors.textSecondary,
                            borderRadius: 12,
                            width: 24,
                            height: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 6,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                            {line}
                          </Text>
                        </View>
                      ))}
                    </View>
                    
                    {/* Direction Arrows */}
                    <View style={{ flexDirection: 'row' }}>
                      {alert.informedEntities.map((entity, index) => (
                        <Text
                          key={index}
                          style={{
                            fontSize: 16,
                            color: styles.theme.colors.textSecondary,
                            marginRight: 4,
                          }}
                        >
                          {entity.directionId === 0 ? '↓' : '↑'}
                        </Text>
                      ))}
                    </View>
                  </View>
                  
                  {/* Alert Text */}
                  <Text style={{ 
                    color: alert.severity === 'severe' ? styles.theme.colors.error : 
                           alert.severity === 'warning' ? '#F59E0B' : styles.theme.colors.text,
                    fontSize: 16, 
                    fontWeight: '600', 
                    marginBottom: 4 
                  }}>
                    {alert.headerText}
                  </Text>
                  <Text style={{ color: styles.theme.colors.textSecondary, fontSize: 14 }}>
                    {alert.descriptionText}
                  </Text>
                  
                  {/* Time in Effect */}
                  {(() => {
                    const timePeriod = formatAlertTimePeriod(alert.activePeriod);
                    
                    // Debug logging for timestamp parsing issues
                    if (alert.activePeriod && !timePeriod) {
                      console.warn('[CommuteAppBase] Alert has activePeriod but no formatted time:', {
                        alertId: alert.id,
                        start: alert.activePeriod.start,
                        end: alert.activePeriod.end,
                        startType: typeof alert.activePeriod.start,
                        endType: typeof alert.activePeriod.end
                      });
                    }
                    
                    return timePeriod ? (
                      <Text style={{ 
                        color: styles.theme.colors.textTertiary, 
                        fontSize: 12, 
                        fontStyle: 'italic',
                        marginTop: 4
                      }}>
                        {timePeriod}
                      </Text>
                    ) : alert.activePeriod ? (
                      <Text style={{ 
                        color: styles.theme.colors.textTertiary, 
                        fontSize: 12, 
                        fontStyle: 'italic',
                        marginTop: 4
                      }}>
                        [Timing data parse error]
                      </Text>
                    ) : null;
                  })()}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}