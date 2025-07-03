import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Animated, useColorScheme, Platform } from 'react-native';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react-native';
import { RealMTAService, Route, DataSourceType } from '../services/RealMTAService';
import { TransferRouteIcon } from './TransferRouteIcon';
import { getThemeStyles } from '../design/components';
import { colors } from '../design/theme';

const AFTERNOON_COMMUTE_DATA = {
  work: '512 W 22nd St, Manhattan',
  home: '42 Woodhull St, Brooklyn',
  targetArrival: '7:00 PM',
};

// Helper function to get data source indicator color
const getDataSourceColor = (dataSource: DataSourceType): string => {
  switch (dataSource) {
    case 'realtime':
      return '#34C759'; // Green - Live GTFS data
    case 'estimate':
      return '#FF9500'; // Orange/Yellow - Estimated data
    case 'fixed':
      return '#FF3B30'; // Red - Fixed data
    default:
      return '#8E8E93'; // Gray - Unknown
  }
};

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
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const getSubwayLineFromMethod = (method: string): string => {
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
              style={[
                styles.routeCard.iconContainer, 
                { backgroundColor: subwayColor }
              ]}
            >
              {subwayLine && <TransferRouteIcon routeLine={subwayLine} />}
            </View>
          </View>
          <View style={styles.routeCard.textInfo}>
          </View>
        </View>
        
        <View style={[styles.routeCard.timeInfo, { paddingRight: 4 }]}>
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
              outputRange: [0, 400],
            }),
            opacity: animation,
          },
        ]}
      >
        <View 
          style={{ 
            paddingVertical: 16, 
            paddingHorizontal: 24,
            borderTopWidth: 1, 
            borderTopColor: styles.theme.colors.borderLight 
          }}
        >
          {/* Route Steps */}
          {route.steps.map((step, index) => {
            const stepIcon = step.type === 'walk' ? '🚶' : 
                            step.type === 'wait' ? '⏱️' : 
                            step.type === 'transit' ? step.line || '🚇' : '📍';
            
            const dotColor = getDataSourceColor(step.dataSource);
            
            return (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: 12, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  backgroundColor: step.type === 'transit' ? 
                    colors.subway[step.line as keyof typeof colors.subway] || styles.theme.colors.borderLight : 
                    styles.theme.colors.borderLight, 
                  marginRight: 10 
                }}>
                  <Text style={{ 
                    fontSize: 10, 
                    fontWeight: '600', 
                    color: step.type === 'transit' ? '#fff' : '#000' 
                  }}>
                    {step.type === 'transit' ? step.line : stepIcon}
                  </Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, flex: 1, color: styles.theme.colors.text, marginRight: 8 }}>
                    {step.description}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: 4, 
                      backgroundColor: dotColor, 
                      marginRight: 6 
                    }} />
                    <Text style={{ fontSize: 11, color: styles.theme.colors.textSecondary, fontWeight: '500' }}>
                      {step.duration} min
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
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

export function AfternoonCommuteApp() {
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
      console.log('[DEBUG AfternoonUI] Loading afternoon routes...');
      const routeData = await mtaService.calculateAfternoonRoutes(
        AFTERNOON_COMMUTE_DATA.work,
        AFTERNOON_COMMUTE_DATA.home,
        AFTERNOON_COMMUTE_DATA.targetArrival
      );
      console.log('[DEBUG AfternoonUI] Received afternoon route data:', routeData);
      
      setRoutes(routeData);
      
      // Expand the first route by default
      if (routeData.length > 0) {
        setExpandedRoutes(new Set([routeData[0].id]));
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[DEBUG AfternoonUI] Failed to load afternoon routes:', error);
      setError(error instanceof Error ? error.message : 'Unable to load afternoon MTA data');
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
      style={{ flex: 1, backgroundColor: styles.theme.colors.background }}
    >
      {/* Header */}
      <View style={styles.header.container}>
        <View style={{ flex: 1 }}>
          {/* LIVE Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[styles.indicator.container, styles.indicator.live, { marginRight: 8 }]}>
              <Zap size={10} color={styles.theme.colors.success} style={{ marginRight: 4 }} />
              <Text style={[styles.indicator.text, styles.indicator.liveText, { fontSize: 10 }]}>LIVE</Text>
            </View>
            <Text style={{ fontSize: 10, color: styles.theme.colors.textSecondary }}>
              {lastUpdated.toLocaleTimeString()}
            </Text>
          </View>
          
          <Text style={[styles.header.title, { fontSize: 24 }]}>Afternoon Commute</Text>
          <Text style={[styles.header.subtitle, { fontSize: 13 }]}>
            {AFTERNOON_COMMUTE_DATA.work.split(',')[0]} → {AFTERNOON_COMMUTE_DATA.home.split(',')[0]}
          </Text>
        </View>
      </View>

      <ScrollView
        testID="afternoon-routes-container"
        style={{ flex: 1, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        alwaysBounceVertical={Platform.OS === 'ios'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={styles.theme.colors.primary}
            colors={[styles.theme.colors.primary]}
            progressBackgroundColor={styles.theme.colors.surface}
          />
        }
      >
        {/* Routes */}
        {loading ? (
          <View style={styles.state.loadingContainer}>
            <Text style={styles.state.loadingText}>
              Loading real-time afternoon MTA data...
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
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.state.errorContainer}>
            <Text style={styles.state.errorTitle}>No Afternoon Routes Available</Text>
            <Text style={styles.state.errorMessage}>
              No real-time afternoon route data available for your commute at this time.
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
              isBestRoute={index === 0}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}