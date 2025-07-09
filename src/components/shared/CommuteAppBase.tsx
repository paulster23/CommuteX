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
  const [webPullToRefresh, setWebPullToRefresh] = useState({
    startY: 0,
    currentY: 0,
    isDragging: false,
    threshold: 80 // pixels to trigger refresh
  });
  
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
      console.log('[CommuteAppBase] Starting loadRoutes and loadServiceAlerts...');
      await Promise.all([
        loadRoutes(),
        loadServiceAlerts()
      ]);
      console.log('[CommuteAppBase] Data loading completed successfully');
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
      console.log('[CommuteAppBase] Web pull-to-refresh started at Y:', touch.clientY);
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
        console.log('[CommuteAppBase] Web pull distance:', pullDistance);
        
        if (pullDistance > webPullToRefresh.threshold) {
          setDebugMessage(`Pull to refresh (${Math.round(pullDistance)}px)`);
        }
      }
    }
  }, [webPullToRefresh.isDragging, webPullToRefresh.startY, webPullToRefresh.threshold]);

  const handleWebTouchEnd = useCallback(async () => {
    if (Platform.OS === 'web' && webPullToRefresh.isDragging) {
      const pullDistance = webPullToRefresh.currentY - webPullToRefresh.startY;
      
      console.log('[CommuteAppBase] Web pull-to-refresh ended, distance:', pullDistance);
      
      if (pullDistance > webPullToRefresh.threshold) {
        console.log('[CommuteAppBase] Web pull-to-refresh threshold reached, triggering refresh');
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
            
            {/* Debug message for mobile PWA debugging */}
            {Platform.OS === 'web' && debugMessage && (
              <Text style={{ fontSize: 10, color: styles.theme.colors.success, marginLeft: 8 }}>
                {debugMessage}
              </Text>
            )}
            
            {/* Web pull-to-refresh distance indicator */}
            {Platform.OS === 'web' && webPullToRefresh.isDragging && (
              <Text style={{ fontSize: 10, color: styles.theme.colors.primary, marginLeft: 8 }}>
                Pull: {Math.round(webPullToRefresh.currentY - webPullToRefresh.startY)}px
              </Text>
            )}
            
            {/* Manual refresh button for web/PWA debugging */}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                onPress={async () => {
                  console.log('[CommuteAppBase] Manual refresh button pressed for', config.title);
                  try {
                    await onRefresh();
                    console.log('[CommuteAppBase] Manual refresh completed successfully');
                  } catch (error) {
                    console.error('[CommuteAppBase] Manual refresh failed:', error);
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
        bounces={true}
        alwaysBounceVertical={true}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                console.log('[CommuteAppBase] RefreshControl onRefresh callback triggered for', config.title);
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
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}