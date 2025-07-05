import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, useColorScheme, Platform } from 'react-native';
import { Zap } from 'lucide-react-native';
import { RealMTAService, Route } from '../../services/RealMTAService';
import { RouteCard } from './RouteCard';
import { getThemeStyles } from '../../design/components';

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
      
      // Expand the first route (earliest arrival time) by default
      if (routeData.length > 0) {
        setExpandedRoutes(new Set([routeData[0].id]));
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error(`[DEBUG ${config.title}] Failed to load routes:`, error);
      setError(error instanceof Error ? error.message : `Unable to load ${config.title.toLowerCase()} MTA data`);
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
            <Text style={{ color: styles.theme.colors.textSecondary, fontSize: 14 }}>
              No active service alerts for this route
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}