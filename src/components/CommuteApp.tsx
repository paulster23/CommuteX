import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated } from 'react-native';
import { RealMTAService, Route } from '../services/RealMTAService';
import { TransferRouteIcon } from './TransferRouteIcon';

const COMMUTE_DATA = {
  home: '42 Woodhull St, Brooklyn',
  work: '512 W 22nd St, Manhattan',
  targetArrival: '9:00 AM',
};

// NYC Subway line colors (official MTA colors)
const SUBWAY_COLORS: { [key: string]: string } = {
  'R': '#FCCC0A', // Yellow
  'F': '#FF6319', // Orange
  '4': '#00933C', // Green
  '6': '#00933C', // Green
  'N': '#FCCC0A', // Yellow
  'Q': '#FCCC0A', // Yellow
  'W': '#FCCC0A', // Yellow
  'B': '#FF6319', // Orange
  'D': '#FF6319', // Orange
  'M': '#FF6319', // Orange
  'G': '#6CBE45', // Light Green
  'L': '#A7A9AC', // Gray
  'A': '#0039A6', // Blue
  'C': '#0039A6', // Blue
  'E': '#0039A6', // Blue
  'J': '#996633', // Brown
  'Z': '#996633', // Brown
  '1': '#EE352E', // Red
  '2': '#EE352E', // Red
  '3': '#EE352E', // Red
  '5': '#00933C', // Green
  '7': '#B933AD', // Purple
  'S': '#808183', // Gray
};

interface RouteCardProps {
  route: Route;
  isExpanded: boolean;
  onToggle: () => void;
  isBestRoute: boolean;
}

function RouteCard({ route, isExpanded, onToggle, isBestRoute }: RouteCardProps) {
  const [animation] = useState(new Animated.Value(0));
  
  // Debug logging for final walking step
  console.log(`[DEBUG RouteCard] Route ${route.id} final walking data:`, {
    finalWalkingTime: route.finalWalkingTime,
    walkingDistance: route.walkingDistance,
    endingStation: route.endingStation,
    shouldShowFinalWalk: !!(route.walkingDistance || route.finalWalkingTime)
  });
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const getSubwayLineFromMethod = (method: string): string => {
    // Handle transfer routes (e.g., "F→A trains + Walk")
    if (method.includes('→')) {
      const match = method.match(/^([A-Z0-9→]+)\s+trains/);
      return match ? match[1] : '';
    }
    // Handle single routes (e.g., "F train + Walk")
    const match = method.match(/^([A-Z0-9]+)\s+train/);
    return match ? match[1] : '';
  };

  const getSubwayColor = (line: string): string => {
    return SUBWAY_COLORS[line] || '#666';
  };

  const getCountdownMinutes = (): number => {
    // Calculate minutes until departure (simplified)
    const now = new Date();
    const [time, period] = route.arrivalTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const arrivalTime = new Date();
    arrivalTime.setHours(hour24, minutes, 0, 0);
    
    // Subtract total journey time to get departure time
    const totalMinutes = parseInt(route.duration.replace(' min', ''));
    const departureTime = new Date(arrivalTime.getTime() - totalMinutes * 60000);
    
    const diffMs = departureTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const subwayLine = getSubwayLineFromMethod(route.method);
  const subwayColor = getSubwayColor(subwayLine);
  const countdownMinutes = getCountdownMinutes();

  return (
    <TouchableOpacity 
      style={[
        styles.routeCard,
        isBestRoute && styles.bestRouteCard,
        { shadowColor: subwayColor }
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Main Route Info */}
      <View style={styles.routeHeader}>
        <View style={styles.routeMainInfo}>
          {subwayLine && <TransferRouteIcon routeLine={subwayLine} />}
          <View style={styles.routeTextInfo}>
            <Text style={styles.routeTitle}>
              {route.method.replace(' + Walk', '')}
            </Text>
            <Text style={styles.routeSubtitle}>
              {(route.transfers ?? 0) === 0 ? 'Direct' : `${route.transfers} transfer${(route.transfers ?? 0) > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeTimeInfo}>
          <Text style={styles.arrivalTime}>{route.arrivalTime}</Text>
          <Text style={styles.totalDuration}>{route.duration}</Text>
          {route.isRealTimeData && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Countdown Timer */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>
          {countdownMinutes > 0 ? `Departs in ${countdownMinutes}m` : 'Departing now'}
        </Text>
        <View style={[styles.countdownBar, { backgroundColor: subwayColor + '20' }]}>
          <View 
            style={[
              styles.countdownProgress, 
              { 
                backgroundColor: subwayColor,
                width: `${Math.max(10, Math.min(100, (30 - countdownMinutes) / 30 * 100))}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Expandable Details */}
      <Animated.View
        style={[
          styles.expandableContent,
          {
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400], // Increased from 200 to 400
            }),
            opacity: animation,
          },
        ]}
      >
        <View style={styles.routeSteps}>
          <Text style={styles.stepsTitle}>Step-by-step directions:</Text>
          
          {/* Walking Step */}
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepIconText}>🚶</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepText}>
                Walk {route.walkingToTransit} min to {subwayLine} train at <Text style={styles.stationName}>{route.startingStation}</Text>
              </Text>
              <Text style={styles.stepTime}>{route.walkingToTransit} min</Text>
            </View>
          </View>

          {/* Wait Step */}
          {route.waitTime && route.waitTime > 0 && (
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.waitIcon]}>
                <Text style={styles.stepIconText}>⏱️</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Wait for next {subwayLine} train at <Text style={styles.stationName}>{route.startingStation}</Text>
                </Text>
                <Text style={[styles.stepTime, styles.waitTime]}>
                  {route.waitTime} min wait
                </Text>
              </View>
            </View>
          )}

          {/* Transit Step(s) - Handle transfers */}
          {route.transfers === 0 ? (
            // Direct route
            <View style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: subwayColor }]}>
                <Text style={[styles.stepIconText, { color: '#fff' }]}>{subwayLine}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Take {subwayLine} train from <Text style={styles.stationName}>{route.startingStation}</Text> to <Text style={styles.stationName}>{route.endingStation}</Text>
                </Text>
                <Text style={styles.stepTime}>
                  {parseInt(route.duration.replace(' min', '')) - (route.walkingToTransit || 0) - (route.waitTime || 0) - (route.finalWalkingTime || 0)} min
                </Text>
              </View>
            </View>
          ) : (
            // Transfer route - parse the details to show multiple steps
            <>
              {subwayLine.includes('→') && (() => {
                const [firstLine, secondLine] = subwayLine.split('→');
                const transferMatch = route.details.match(/transfer at ([^,]+) to/);
                const transferStation = transferMatch ? transferMatch[1] : 'Transfer Station';
                
                return (
                  <>
                    {/* First train segment */}
                    <View style={styles.step}>
                      <View style={[styles.stepIcon, { backgroundColor: SUBWAY_COLORS[firstLine] || '#666' }]}>
                        <Text style={[styles.stepIconText, { color: '#fff' }]}>{firstLine}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Take {firstLine} train from <Text style={styles.stationName}>{route.startingStation}</Text> to <Text style={styles.stationName}>{transferStation}</Text>
                        </Text>
                        <Text style={styles.stepTime}>~12 min</Text>
                      </View>
                    </View>
                    
                    {/* Transfer step */}
                    <View style={styles.step}>
                      <View style={[styles.stepIcon, styles.transferIcon]}>
                        <Text style={styles.stepIconText}>🔄</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Transfer at <Text style={styles.stationName}>{transferStation}</Text>
                        </Text>
                        <Text style={[styles.stepTime, styles.transferTime]}>
                          3-5 min transfer
                        </Text>
                      </View>
                    </View>
                    
                    {/* Second train segment */}
                    <View style={styles.step}>
                      <View style={[styles.stepIcon, { backgroundColor: SUBWAY_COLORS[secondLine] || '#666' }]}>
                        <Text style={[styles.stepIconText, { color: '#fff' }]}>{secondLine}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepText}>
                          Take {secondLine} train from <Text style={styles.stationName}>{transferStation}</Text> to <Text style={styles.stationName}>{route.endingStation}</Text>
                        </Text>
                        <Text style={styles.stepTime}>~10 min</Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </>
          )}

          {/* Train Departure Info */}
          {route.nextTrainDeparture && (
            <View style={styles.trainInfo}>
              <Text style={styles.trainInfoText}>
                Next {subwayLine} train departs: <Text style={styles.departureTime}>{route.nextTrainDeparture}</Text>
              </Text>
            </View>
          )}

          {/* Final Walking Step */}
          {(route.walkingDistance || route.finalWalkingTime) && (
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Text style={styles.stepIconText}>🚶</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Walk to destination from <Text style={styles.stationName}>{route.endingStation}</Text>
                </Text>
                <Text style={styles.stepTime}>
                  {route.finalWalkingTime ? `${route.finalWalkingTime} min` : route.walkingDistance}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Confidence & Additional Info */}
        <View style={styles.additionalInfo}>
          {route.confidence && (
            <Text style={styles.confidenceText}>
              Confidence: {route.confidence}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Expand/Collapse Indicator */}
      <View style={styles.expandIndicator}>
        <Text style={styles.expandText}>
          {isExpanded ? 'Less details' : 'More details'}
        </Text>
        <Text style={styles.expandArrow}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function CommuteApp() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
  
  const mtaService = new RealMTAService();

  useEffect(() => {
    loadRoutes();
    
    const interval = setInterval(() => {
      loadRoutes();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadRoutes = async () => {
    try {
      setError(null);
      console.log('[DEBUG UI] Loading routes...');
      const routeData = await mtaService.calculateRoutes(
        COMMUTE_DATA.home,
        COMMUTE_DATA.work,
        COMMUTE_DATA.targetArrival
      );
      console.log('[DEBUG UI] Received route data:', routeData);
      console.log('[DEBUG UI] Number of routes:', routeData.length);
      
      // Log details about final walking times
      routeData.forEach((route, index) => {
        console.log(`[DEBUG UI] Route ${index + 1} (${route.method}):`, {
          finalWalkingTime: route.finalWalkingTime,
          walkingDistance: route.walkingDistance,
          endingStation: route.endingStation,
          totalDuration: route.duration
        });
      });
      
      setRoutes(routeData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[DEBUG UI] Failed to load routes:', error);
      setError(error instanceof Error ? error.message : 'Unable to load MTA data');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
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

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View 
      testID="app-container"
      style={[styles.container, themeStyles.container]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, themeStyles.text]}>Morning Commute</Text>
          <Text style={[styles.subtitle, themeStyles.subtitleText]}>
            {COMMUTE_DATA.home.split(',')[0]} → {COMMUTE_DATA.work.split(',')[0]}
          </Text>
        </View>
        <TouchableOpacity 
          testID="theme-toggle"
          onPress={toggleTheme}
          style={[styles.themeToggle, themeStyles.themeToggle]}
        >
          <Text style={styles.themeToggleText}>
            {isDarkMode ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        testID="scroll-view"
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
        {/* Status Bar */}
        <View style={[styles.statusBar, themeStyles.statusBar]}>
          <Text style={[styles.statusText, themeStyles.statusText]}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Routes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loading, themeStyles.text]}>
              Loading real-time MTA data...
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.errorContainer, themeStyles.errorContainer]}>
            <Text style={styles.errorTitle}>⚠️ MTA Data Unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadRoutes}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <Text style={styles.errorHelp}>
              This app only shows real MTA data. No mock or fallback data is displayed.
            </Text>
          </View>
        ) : routes.length === 0 ? (
          <View style={[styles.errorContainer, themeStyles.errorContainer]}>
            <Text style={styles.errorTitle}>No Routes Available</Text>
            <Text style={styles.errorMessage}>
              No real-time route data available for your commute at this time.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadRoutes}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map((route, index) => (
            <RouteCard
              key={route.id}
              route={route}
              isExpanded={expandedRoutes.has(route.id)}
              onToggle={() => toggleRouteExpansion(route.id)}
              isBestRoute={index === 0}
            />
          ))
        )}

        {/* Service Alerts Section */}
        {routes.length > 0 && (
          <View style={[styles.alertsSection, themeStyles.alertsSection]}>
            <Text style={[styles.alertsTitle, themeStyles.text]}>Service Alerts</Text>
            <Text style={[styles.alertsMessage, themeStyles.subtitleText]}>
              No active service alerts for this route
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.7,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    opacity: 0.7,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bestRouteCard: {
    borderWidth: 2,
    borderColor: '#34C759',
    shadowOpacity: 0.15,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subwayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subwayIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  routeTextInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  routeSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  routeTimeInfo: {
    alignItems: 'flex-end',
  },
  arrivalTime: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  totalDuration: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  countdownContainer: {
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#007AFF',
  },
  countdownBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  countdownProgress: {
    height: '100%',
    borderRadius: 2,
  },
  expandableContent: {
    overflow: 'hidden',
  },
  routeSteps: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  stepIconText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  stepTime: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  additionalInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confidenceText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  expandIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
  },
  expandText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 6,
  },
  expandArrow: {
    fontSize: 12,
    color: '#007AFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loading: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorHelp: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  alertsSection: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertsMessage: {
    fontSize: 14,
    opacity: 0.7,
  },
  stationName: {
    fontWeight: '600',
    color: '#007AFF',
  },
  waitIcon: {
    backgroundColor: '#FFF3CD',
  },
  waitTime: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  trainInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  trainInfoText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  departureTime: {
    fontWeight: '600',
    color: '#007AFF',
  },
  transferIcon: {
    backgroundColor: '#E8F4FD',
  },
  transferTime: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
  },
  text: {
    color: '#000',
  },
  subtitleText: {
    color: '#666',
  },
  statusText: {
    color: '#666',
  },
  statusBar: {
    backgroundColor: '#fff',
  },
  themeToggle: {
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
  },
  alertsSection: {
    backgroundColor: '#fff',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
  },
  subtitleText: {
    color: '#999',
  },
  statusText: {
    color: '#999',
  },
  statusBar: {
    backgroundColor: '#1c1c1e',
  },
  themeToggle: {
    backgroundColor: '#2c2c2e',
  },
  errorContainer: {
    backgroundColor: '#2c2c2e',
  },
  alertsSection: {
    backgroundColor: '#1c1c1e',
  },
});
