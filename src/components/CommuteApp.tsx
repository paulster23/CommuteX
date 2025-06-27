import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { RealMTAService, Route } from '../services/RealMTAService';

const COMMUTE_DATA = {
  home: '42 Woodhull St, Brooklyn',
  work: '512 W 22nd St, Manhattan',
  targetArrival: '9:00 AM',
};

export function CommuteApp() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      const routeData = await mtaService.calculateRoutes(
        COMMUTE_DATA.home,
        COMMUTE_DATA.work,
        COMMUTE_DATA.targetArrival
      );
      setRoutes(routeData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load routes:', error);
      // NO FALLBACK DATA - Show error message instead
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

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <View 
      testID="app-container"
      style={[styles.container, themeStyles.container]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>CommuteX</Text>
        <TouchableOpacity 
          testID="theme-toggle"
          onPress={toggleTheme}
          style={styles.themeToggle}
        >
          <Text style={styles.themeToggleText}>
            {isDarkMode ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        testID="scroll-view"
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
        <Text style={styles.info}>Home: {COMMUTE_DATA.home}</Text>
        <Text style={styles.info}>Work: {COMMUTE_DATA.work}</Text>
        <Text style={styles.info}>Target Arrival: {COMMUTE_DATA.targetArrival}</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
        <Text style={styles.sectionTitle}>Route Options</Text>
        {loading ? (
          <Text style={styles.loading}>Loading real-time MTA data...</Text>
        ) : error ? (
          <View style={styles.errorContainer}>
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
          <View style={styles.errorContainer}>
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
          routes.map((route, index) => {
            const isBestRoute = index === 0; // First route is the best (sorted by arrival time)
            return (
              <View 
                key={route.id} 
                testID={`route-${route.id}`}
                style={[styles.routeContainer, isBestRoute && styles.bestRoute]}
              >
                <Text style={styles.routeHeader}>
                  Route {route.id}: Arrive {route.arrivalTime}
                  {route.isRealTimeData && <Text style={styles.realTimeIndicator}> 🔴 LIVE</Text>}
                </Text>
                <Text style={styles.routeMethod}>{route.method}</Text>
                <Text style={styles.routeDuration}>{route.duration}</Text>
                <Text style={styles.routeDetails}>{route.details}</Text>
                {route.confidence && (
                  <Text style={styles.routeConfidence}>
                    Confidence: {route.confidence}
                  </Text>
                )}
                {route.transfers !== undefined && (
                  <Text style={styles.routeTransfers}>
                    {route.transfers === 0 ? 'No transfers' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                  </Text>
                )}
                {route.walkingToTransit && (
                  <Text style={styles.routeWalkingToTransit}>
                    Walk to transit: {route.walkingToTransit} min
                  </Text>
                )}
                {route.walkingDistance && (
                  <Text style={styles.routeWalking}>
                    Final walk: {route.walkingDistance}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  themeToggleText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  route: {
    fontSize: 16,
    marginBottom: 4,
  },
  routeContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  routeHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  routeDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  routeDetails: {
    fontSize: 12,
    color: '#888',
  },
  routeTransfers: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  routeWalkingToTransit: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 2,
    fontWeight: '500',
  },
  routeWalking: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loading: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  realTimeIndicator: {
    fontSize: 10,
    color: '#FF0000',
    fontWeight: 'bold',
  },
  routeConfidence: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bestRoute: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
  },
});
