import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated, Dimensions, Platform } from 'react-native';
import { RealMTAService, Route } from '../services/RealMTAService';

const { width: screenWidth } = Dimensions.get('window');

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
  const [scaleAnimation] = useState(new Animated.Value(1));
  
  useEffect(() => {
    Animated.spring(animation, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [isExpanded]);

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const getSubwayLineFromMethod = (method: string): string => {
    if (method.includes('→')) {
      const match = method.match(/^([A-Z0-9→]+)\s+trains/);
      return match ? match[1] : '';
    }
    const match = method.match(/^([A-Z0-9]+)\s+train/);
    return match ? match[1] : '';
  };

  const getSubwayColor = (line: string): string => {
    return SUBWAY_COLORS[line] || '#007AFF';
  };

  const getCountdownMinutes = (): number => {
    const now = new Date();
    const [time, period] = route.arrivalTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const arrivalTime = new Date();
    arrivalTime.setHours(hour24, minutes, 0, 0);
    
    const totalMinutes = parseInt(route.duration.replace(' min', ''));
    const departureTime = new Date(arrivalTime.getTime() - totalMinutes * 60000);
    
    const diffMs = departureTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const subwayLine = getSubwayLineFromMethod(route.method);
  const subwayColor = getSubwayColor(subwayLine);
  const countdownMinutes = getCountdownMinutes();

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  const expandedOpacity = animation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnimation }] }]}>
      <TouchableOpacity 
        style={[
          styles.routeCard,
          isBestRoute && styles.bestRouteCard,
          { 
            shadowColor: subwayColor,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
          }
        ]}
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Glassmorphism overlay */}
        <View style={styles.glassOverlay} />
        
        {/* Best route indicator */}
        {isBestRoute && (
          <View style={[styles.bestRouteBadge, { backgroundColor: subwayColor }]}>
            <Text style={styles.bestRouteText}>FASTEST</Text>
          </View>
        )}

        {/* Main Route Info */}
        <View style={styles.routeHeader}>
          <View style={styles.routeMainInfo}>
            {subwayLine && (
              <View style={[styles.subwayIcon, { backgroundColor: subwayColor }]}>
                <Text style={styles.subwayIconText}>{subwayLine}</Text>
              </View>
            )}
            <View style={styles.routeTextInfo}>
              <Text style={styles.routeTitle}>
                {route.method.replace(' + Walk', '')}
              </Text>
              <Text style={styles.routeSubtitle}>
                {(route.transfers ?? 0) === 0 ? 'Direct route' : `${route.transfers} transfer${(route.transfers ?? 0) > 1 ? 's' : ''}`}
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
          <Text style={[styles.countdownText, { color: subwayColor }]}>
            {countdownMinutes > 0 ? `Departs in ${countdownMinutes}m` : 'Departing now'}
          </Text>
          <View style={[styles.countdownBar, { backgroundColor: `${subwayColor}15` }]}>
            <Animated.View 
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
              height: expandedHeight,
              opacity: expandedOpacity,
            },
          ]}
        >
          <View style={styles.routeSteps}>
            <Text style={styles.stepsTitle}>Journey Details</Text>
            
            {/* Walking Step */}
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.walkIcon]}>
                <Text style={styles.stepIconText}>🚶‍♂️</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Walk to <Text style={[styles.stationName, { color: subwayColor }]}>{route.startingStation}</Text>
                </Text>
                <Text style={styles.stepTime}>{route.walkingToTransit}m</Text>
              </View>
            </View>

            {/* Wait Step */}
            {route.waitTime && route.waitTime > 0 && (
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.waitIcon]}>
                  <Text style={styles.stepIconText}>⏱</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>
                    Wait for {subwayLine} train
                  </Text>
                  <Text style={[styles.stepTime, { color: '#FF6B35' }]}>
                    {route.waitTime}m
                  </Text>
                </View>
              </View>
            )}

            {/* Transit Step */}
            <View style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: subwayColor }]}>
                <Text style={[styles.stepIconText, { color: '#fff', fontSize: 14, fontWeight: '700' }]}>{subwayLine}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  {subwayLine} train to <Text style={[styles.stationName, { color: subwayColor }]}>{route.endingStation}</Text>
                </Text>
                <Text style={styles.stepTime}>
                  {parseInt(route.duration.replace(' min', '')) - (route.walkingToTransit || 0) - (route.waitTime || 0) - (route.finalWalkingTime || 0)}m
                </Text>
              </View>
            </View>

            {/* Final Walking Step */}
            {(route.walkingDistance || route.finalWalkingTime) && (
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.walkIcon]}>
                  <Text style={styles.stepIconText}>🚶‍♂️</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>
                    Walk to destination
                  </Text>
                  <Text style={styles.stepTime}>
                    {route.finalWalkingTime ? `${route.finalWalkingTime}m` : route.walkingDistance}
                  </Text>
                </View>
              </View>
            )}

            {/* Train Departure Info */}
            {route.nextTrainDeparture && (
              <View style={styles.trainInfo}>
                <Text style={styles.trainInfoText}>
                  Next departure: <Text style={[styles.departureTime, { color: subwayColor }]}>{route.nextTrainDeparture}</Text>
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Expand/Collapse Indicator */}
        <View style={styles.expandIndicator}>
          <Animated.View
            style={{
              transform: [{
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                })
              }]
            }}
          >
            <Text style={[styles.expandArrow, { color: subwayColor }]}>▼</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  const [headerAnimation] = useState(new Animated.Value(0));
  
  const mtaService = new RealMTAService();

  useEffect(() => {
    loadRoutes();
    
    // Animate header on mount
    Animated.spring(headerAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    
    const interval = setInterval(() => {
      loadRoutes();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadRoutes = async () => {
    try {
      setError(null);
      const routeData = await mtaService.calculateRoutes(
        COMMUTE_DATA.home,
        COMMUTE_DATA.work,
        COMMUTE_DATA.targetArrival
      );
      
      setRoutes(routeData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load routes:', error);
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
      {/* Background gradient */}
      <View style={[styles.backgroundGradient, themeStyles.backgroundGradient]} />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            transform: [
              {
                translateY: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                })
              }
            ],
            opacity: headerAnimation,
          }
        ]}
      >
        <View style={styles.headerContent}>
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
      </Animated.View>
      
      <ScrollView
        testID="scroll-view"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
            progressBackgroundColor="rgba(255, 255, 255, 0.9)"
          />
        }
      >
        {/* Status Bar */}
        <View style={[styles.statusBar, themeStyles.statusBar]}>
          <Text style={[styles.statusText, themeStyles.statusText]}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.liveIndicator}>
            <Animated.View 
              style={[
                styles.liveDot,
                {
                  transform: [{
                    scale: headerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    })
                  }]
                }
              ]} 
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Routes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={{
                transform: [{
                  scale: headerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }],
                opacity: headerAnimation,
              }}
            >
              <Text style={[styles.loading, themeStyles.text]}>
                Loading real-time MTA data...
              </Text>
            </Animated.View>
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
            <Text style={[styles.alertsTitle, themeStyles.text]}>Service Status</Text>
            <Text style={[styles.alertsMessage, themeStyles.subtitleText]}>
              All systems operational
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 17,
    marginTop: 4,
    opacity: 0.7,
    fontWeight: '500',
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  themeToggleText: {
    fontSize: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statusText: {
    fontSize: 15,
    opacity: 0.7,
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    letterSpacing: 0.5,
  },
  routeCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  bestRouteCard: {
    borderWidth: 2,
    borderColor: '#34C759',
    shadowColor: '#34C759',
    shadowOpacity: 0.2,
  },
  bestRouteBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  bestRouteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  routeMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subwayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  subwayIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  routeTextInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  routeSubtitle: {
    fontSize: 15,
    opacity: 0.7,
    fontWeight: '500',
    color: '#000',
  },
  routeTimeInfo: {
    alignItems: 'flex-end',
  },
  arrivalTime: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: '#000',
  },
  totalDuration: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 8,
    fontWeight: '500',
    color: '#000',
  },
  countdownContainer: {
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  countdownBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  countdownProgress: {
    height: '100%',
    borderRadius: 3,
  },
  expandableContent: {
    overflow: 'hidden',
  },
  routeSteps: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#000',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  walkIcon: {
    backgroundColor: '#F2F2F7',
  },
  waitIcon: {
    backgroundColor: '#FFF3CD',
  },
  stepIconText: {
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
    color: '#000',
    fontWeight: '500',
  },
  stepTime: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '600',
    color: '#000',
  },
  stationName: {
    fontWeight: '600',
  },
  trainInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  trainInfoText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  departureTime: {
    fontWeight: '600',
  },
  expandIndicator: {
    alignItems: 'center',
    paddingTop: 16,
  },
  expandArrow: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loading: {
    fontSize: 17,
    opacity: 0.7,
    fontWeight: '500',
  },
  errorContainer: {
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    opacity: 0.8,
  },
  errorHelp: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertsSection: {
    padding: 24,
    borderRadius: 20,
    marginTop: 24,
    marginBottom: 40,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alertsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  alertsMessage: {
    fontSize: 16,
    opacity: 0.7,
    fontWeight: '500',
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
  },
  backgroundGradient: {
    background: 'linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%)',
  },
  text: {
    color: '#000',
  },
  subtitleText: {
    color: '#8E8E93',
  },
  statusText: {
    color: '#8E8E93',
  },
  statusBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
  },
  themeToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
  },
  alertsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  backgroundGradient: {
    background: 'linear-gradient(180deg, #000 0%, #1C1C1E 100%)',
  },
  text: {
    color: '#fff',
  },
  subtitleText: {
    color: '#8E8E93',
  },
  statusText: {
    color: '#8E8E93',
  },
  statusBar: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    backdropFilter: 'blur(20px)',
  },
  themeToggle: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    backdropFilter: 'blur(20px)',
  },
  errorContainer: {
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    backdropFilter: 'blur(20px)',
  },
  alertsSection: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    backdropFilter: 'blur(20px)',
  },
});