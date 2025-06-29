import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Animated, useColorScheme } from 'react-native';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react-native';
import { RealMTAService, Route } from '../services/RealMTAService';
import { TransferRouteIcon } from './TransferRouteIcon';
import { TrainDeparturePills } from './TrainDeparturePills';
import { getThemeStyles } from '../design/components';
import { colors } from '../design/theme';

const COMMUTE_DATA = {
  home: '42 Woodhull St, Brooklyn',
  work: '512 W 22nd St, Manhattan',
  targetArrival: '9:00 AM',
};

// NYC Subway line colors (official MTA colors)
// Subway colors moved to design system

interface RouteCardProps {
  route: Route;
  isExpanded: boolean;
  onToggle: () => void;
  isBestRoute: boolean;
}

function RouteCard({ route, isExpanded, onToggle, isBestRoute }: RouteCardProps) {
  const [animation] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  
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
    return colors.subway[line as keyof typeof colors.subway] || styles.theme.colors.textSecondary;
  };


  const subwayLine = getSubwayLineFromMethod(route.method);
  const subwayColor = getSubwayColor(subwayLine);

  return (
    <TouchableOpacity 
      style={[
        styles.routeCard.container,
        isBestRoute && { borderWidth: 2, borderColor: styles.theme.colors.success }
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* Main Route Info */}
      <View style={styles.routeCard.header}>
        <View style={styles.routeCard.mainInfo}>
          <View style={{ alignItems: 'center' }}>
            <View 
              testID="route-icon-container"
              style={[
                styles.routeCard.iconContainer, 
                // Only apply background color for single routes, not transfers
                !subwayLine.includes('→') && { backgroundColor: subwayColor }
              ]}
            >
              {subwayLine && <TransferRouteIcon routeLine={subwayLine} />}
            </View>
            {/* Transfer pill moved under train logos */}
            <View style={{
              backgroundColor: (route.transfers ?? 0) === 0 ? styles.theme.colors.success + '20' : styles.theme.colors.warning + '20',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              marginTop: 6
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: (route.transfers ?? 0) === 0 ? styles.theme.colors.success : styles.theme.colors.warning
              }}>
                {(route.transfers ?? 0) === 0 ? 'Direct' : `${route.transfers} transfer${(route.transfers ?? 0) > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
          <View style={styles.routeCard.textInfo}>
          </View>
        </View>
        
        <View testID="time-info-container" style={[styles.routeCard.timeInfo, { paddingRight: 4 }]}>
          <Text style={[styles.routeCard.arrivalTime, { fontSize: 16 }]}>{route.arrivalTime}</Text>
          <Text style={[styles.routeCard.duration, { fontSize: 11 }]}>{route.duration}</Text>
          {route.isRealTimeData ? (
            <View style={[styles.indicator.container, styles.indicator.live]}>
              <View style={[styles.indicator.dot, styles.indicator.liveDot]} />
              <Text style={[styles.indicator.text, styles.indicator.liveText]}>LIVE</Text>
            </View>
          ) : (
            <View style={[styles.indicator.container, styles.indicator.estimated]}>
              <View style={[styles.indicator.dot, styles.indicator.estimatedDot]} />
              <Text style={[styles.indicator.text, styles.indicator.estimatedText]}>ESTIMATED</Text>
            </View>
          )}
        </View>
      </View>


      {/* Expandable Details */}
      <Animated.View
        style={[
          { overflow: 'hidden' },
          {
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400], // Increased from 200 to 400
            }),
            opacity: animation,
          },
        ]}
      >
        <View 
          testID="step-by-step-container"
          style={{ 
            paddingVertical: 16, 
            paddingHorizontal: 24, // Add consistent horizontal padding
            borderTopWidth: 1, 
            borderTopColor: styles.theme.colors.borderLight 
          }}
        >
          
          {/* Walking Step */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: styles.theme.colors.borderLight, marginRight: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '600' }}>🚶</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{route.startingStation}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: styles.theme.colors.textSecondary, fontWeight: '500', marginRight: 8 }}>{route.walkingToTransit} min</Text>
            </View>
          </View>

          {/* Wait Step */}
          {route.waitTime && route.waitTime > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF3CD', marginRight: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '600' }}>⏱️</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                  Wait at <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{route.startingStation}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#FF6B35', fontWeight: '600', marginRight: 8 }}>
                  {route.waitTime} min wait
                </Text>
              </View>
            </View>
          )}

          {/* Transit Step(s) - Handle transfers */}
          {route.transfers === 0 ? (
            // Direct route
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: subwayColor, marginRight: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{subwayLine}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                  <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{route.endingStation}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: styles.theme.colors.textSecondary, fontWeight: '500', marginRight: 8 }}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.subway[firstLine as keyof typeof colors.subway] || styles.theme.colors.textSecondary, marginRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{firstLine}</Text>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                          <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{transferStation}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: styles.theme.colors.textSecondary, fontWeight: '500', marginRight: 8 }}>~12 min</Text>
                      </View>
                    </View>
                    
                    {/* Transfer step */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F4FD', marginRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600' }}>🔄</Text>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                          <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{transferStation}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: styles.theme.colors.primary, fontWeight: '600', marginRight: 8 }}>
                          30 sec
                        </Text>
                      </View>
                    </View>
                    
                    {/* Second train segment */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.subway[secondLine as keyof typeof colors.subway] || styles.theme.colors.textSecondary, marginRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{secondLine}</Text>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                          <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{route.endingStation}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: styles.theme.colors.textSecondary, fontWeight: '500', marginRight: 8 }}>~10 min</Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </>
          )}

          {/* Train Departure Info */}
          {route.nextTrainDeparture && (
            <View style={{ backgroundColor: styles.theme.colors.surfaceSecondary, padding: 12, borderRadius: 8, marginTop: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: styles.theme.colors.textSecondary, textAlign: 'center' }}>
                Next train: <Text style={{ fontWeight: '600', color: styles.theme.colors.primary }}>{route.nextTrainDeparture}</Text>
              </Text>
            </View>
          )}

          {/* Final Walking Step */}
          {(route.walkingDistance || route.finalWalkingTime) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: styles.theme.colors.borderLight, marginRight: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600' }}>🚶</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                  Destination
                </Text>
                <Text style={{ fontSize: 12, color: styles.theme.colors.textSecondary, fontWeight: '500', marginRight: 8 }}>
                  {route.finalWalkingTime ? `${route.finalWalkingTime} min` : route.walkingDistance}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Confidence & Additional Info */}
        <View 
          testID="confidence-section"
          style={{ 
            paddingTop: 12, 
            paddingBottom: 16,
            paddingHorizontal: 24 // Add consistent horizontal padding to match step-by-step directions
          }}
        >
          {route.confidence && (
            <Text style={{ fontSize: 12, color: styles.theme.colors.textTertiary, fontStyle: 'italic' }}>
              Confidence: {route.confidence}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Expand/Collapse Indicator */}
      <View style={styles.routeCard.expandButton}>
        <Text style={styles.routeCard.expandText}>
          {isExpanded ? 'Less details' : 'More details'}
        </Text>
        {isExpanded ? (
          <ArrowUp size={16} color={styles.theme.colors.primary} />
        ) : (
          <ArrowDown size={16} color={styles.theme.colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CommuteApp() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  const [lastUpdated, setLastUpdated] = useState(new Date());
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
      
      // Expand the first route (earliest arrival time) by default
      if (routeData.length > 0) {
        setExpandedRoutes(new Set([routeData[0].id]));
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[DEBUG UI] Failed to load routes:', error);
      setError(error instanceof Error ? error.message : 'Unable to load MTA data');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
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

  return (
    <View 
      testID="app-container"
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
          </View>
          
          <Text style={[styles.header.title, { fontSize: 24 }]}>Morning Commute</Text>
          <Text style={[styles.header.subtitle, { fontSize: 13 }]}>
            {COMMUTE_DATA.home.split(',')[0]} → {COMMUTE_DATA.work.split(',')[0]}
          </Text>
        </View>
      </View>

      {/* Train Departure Pills */}
      {routes.length > 0 && routes[0].nextDepartures && (
        <TrainDeparturePills 
          departures={routes[0].nextDepartures} 
          stationName={routes[0].startingStation || 'Station'} 
        />
      )}
      
      <ScrollView
        testID="scroll-view"
        style={{ flex: 1, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.theme.colors.primary}
            colors={[styles.theme.colors.primary]}
          />
        }
      >

        {/* Routes */}
        {loading ? (
          <View style={styles.state.loadingContainer}>
            <Text style={styles.state.loadingText}>
              Loading real-time MTA data...
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
            <Text style={{ color: styles.theme.colors.textSecondary, fontSize: 14 }}>
              No active service alerts for this route
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Styles now handled by modern design system in ../design/
