import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, useColorScheme } from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Route, DataSourceType } from '../../services/RealMTAService';
import { TransferRouteIcon } from '../TransferRouteIcon';
import { getThemeStyles } from '../../design/components';
import { colors } from '../../design/theme';

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

export function RouteCard({ route, isExpanded, onToggle, isBestRoute }: RouteCardProps) {
  const [animation] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  
  useEffect(() => {
    Animated.spring(animation, {
      toValue: isExpanded ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const getSubwayLineFromMethod = (method: string): string => {
    // Handle single-leg "F train", double-leg "F→C trains", and triple-leg "F→A→C trains" patterns
    const match = method.match(/^([A-Z0-9]+(?:→[A-Z0-9]+)*)\s+trains?/);
    return match ? match[1] : '';
  };

  const getSubwayColor = (line: string): string => {
    return colors.subway[line as keyof typeof colors.subway] || styles.theme.colors.textSecondary;
  };

  const subwayLine = getSubwayLineFromMethod(route.method);
  const subwayColor = getSubwayColor(subwayLine);
  
  // For transfer routes, use transparent background since TransferRouteIcon handles its own styling
  const isTransferRoute = subwayLine.includes('→');
  const iconBackgroundColor = isTransferRoute ? 'transparent' : subwayColor;

  return (
    <TouchableOpacity 
      style={[
        styles.routeCard.container,
        isBestRoute && { 
          borderWidth: 2, 
          borderColor: styles.theme.colors.success,
          shadowColor: styles.theme.colors.success,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }
      ]}
      onPress={onToggle}
      activeOpacity={0.95}
    >
      {/* Main Route Info */}
      <View style={styles.routeCard.header}>
        <View style={styles.routeCard.mainInfo}>
          <View style={{ alignItems: 'center' }}>
            <View 
              style={[
                styles.routeCard.iconContainer, 
                { backgroundColor: iconBackgroundColor }
              ]}
            >
              {subwayLine && <TransferRouteIcon routeLine={subwayLine} />}
            </View>
          </View>
          <View style={styles.routeCard.textInfo}>
            <Text style={styles.routeCard.title}>
              {route.startingStation && route.endingStation 
                ? `${route.startingStation} → ${route.endingStation}`
                : 'Your Commute'}
            </Text>
            <Text style={styles.routeCard.subtitle}>
              {route.method} • {route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
            </Text>
            {route.walkingDistance && (
              <Text style={[styles.routeCard.subtitle, { fontSize: 11, marginTop: 2 }]}>
                {route.walkingDistance} walk
              </Text>
            )}
          </View>
        </View>
        
        <View style={[styles.routeCard.timeInfo, { paddingRight: 4, alignItems: 'flex-end' }]}>
          <Text style={[styles.routeCard.arrivalTime, { fontSize: 18, fontWeight: '700' }]}>
            {route.arrivalTime}
          </Text>
          <Text style={[styles.routeCard.duration, { fontSize: 12, marginBottom: 4 }]}>
            {route.duration}
          </Text>
          {route.confidence && (
            <Text style={[styles.routeCard.subtitle, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              {route.confidence} confidence
            </Text>
          )}
          {route.isRealTimeData ? (
            <View style={[styles.indicator.container, styles.indicator.live, { marginTop: 4 }]}>
              <View style={[styles.indicator.dot, styles.indicator.liveDot]} />
              <Text style={[styles.indicator.text, styles.indicator.liveText]}>LIVE</Text>
            </View>
          ) : (
            <View style={[styles.indicator.container, styles.indicator.estimated, { marginTop: 4 }]}>
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
            paddingVertical: 12, 
            paddingHorizontal: 16,
            borderTopWidth: 1, 
            borderTopColor: styles.theme.colors.borderLight,
            backgroundColor: styles.theme.colors.surfaceSecondary 
          }}
        >
          {/* Route Steps Timeline */}
          <Text style={{ 
            fontSize: 13, 
            fontWeight: '600', 
            color: styles.theme.colors.text,
            marginBottom: 10 
          }}>
            Trip Details
          </Text>
          
          {route.steps.map((step, index) => {
            const stepIcon = step.type === 'walk' ? '🚶' : 
                            step.type === 'wait' ? '⏱️' : 
                            step.type === 'transit' ? step.line || '🚇' : 
                            step.type === 'transfer' ? '🔄' : '📍';
            
            const dotColor = getDataSourceColor(step.dataSource);
            const isLastStep = index === route.steps.length - 1;
            
            return (
              <View key={index} style={{ flexDirection: 'row', marginBottom: isLastStep ? 0 : 10 }}>
                {/* Timeline Indicator */}
                <View style={{ alignItems: 'center', width: 28, marginRight: 10 }}>
                  <View style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 12, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: step.type === 'transit' ? 
                      colors.subway[step.line as keyof typeof colors.subway] || styles.theme.colors.primary : 
                      styles.theme.colors.surface,
                    borderWidth: step.type === 'transit' ? 0 : 2,
                    borderColor: step.type === 'transit' ? 'transparent' : styles.theme.colors.border,
                    elevation: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1,
                  }}>
                    <Text style={{ 
                      fontSize: step.type === 'transit' ? 10 : 12, 
                      fontWeight: '600', 
                      color: step.type === 'transit' ? '#fff' : styles.theme.colors.text 
                    }}>
                      {step.type === 'transit' ? step.line : stepIcon}
                    </Text>
                  </View>
                  
                  {/* Timeline Line */}
                  {!isLastStep && (
                    <View style={{ 
                      width: 2, 
                      height: 16, 
                      backgroundColor: styles.theme.colors.borderLight,
                      marginTop: 3 
                    }} />
                  )}
                </View>
                
                {/* Step Content */}
                <View style={{ flex: 1, paddingBottom: isLastStep ? 0 : 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ 
                      fontSize: 13, 
                      flex: 1, 
                      color: styles.theme.colors.text, 
                      lineHeight: 18,
                      marginRight: 8 
                    }}>
                      {step.description}
                    </Text>
                    
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      backgroundColor: styles.theme.colors.surface,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 10
                    }}>
                      <View style={{ 
                        width: 5, 
                        height: 5, 
                        borderRadius: 2.5, 
                        backgroundColor: dotColor, 
                        marginRight: 3 
                      }} />
                      <Text style={{ 
                        fontSize: 10, 
                        color: styles.theme.colors.textSecondary, 
                        fontWeight: '500' 
                      }}>
                        {step.duration} min
                      </Text>
                    </View>
                  </View>
                  
                  {/* Additional step info */}
                  {step.fromStation && step.toStation && (
                    <Text style={{ 
                      fontSize: 10, 
                      color: styles.theme.colors.textTertiary,
                      marginTop: 2,
                      lineHeight: 14
                    }}>
                      {step.fromStation} → {step.toStation}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Expand/Collapse Indicator */}
      <View style={[styles.routeCard.expandButton, { 
        backgroundColor: styles.theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: styles.theme.colors.borderLight,
        paddingVertical: 8,
        paddingHorizontal: 16
      }]}>
        <Text style={[styles.routeCard.expandText, { 
          fontSize: 12,
          fontWeight: '500'
        }]}>
          {isExpanded ? 'Hide details' : 'Show details'}
        </Text>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <ArrowDown size={16} color={styles.theme.colors.primary} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}