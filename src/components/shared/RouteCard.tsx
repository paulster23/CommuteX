import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, useColorScheme } from 'react-native';
import { ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react-native';
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
          boxShadow: '0 2px 4px rgba(52, 199, 89, 0.2)',
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
        </View>
        
        <View style={[styles.routeCard.timeInfo, { paddingRight: 4, alignItems: 'flex-end' }]}>
          <Text style={[styles.routeCard.arrivalTime, { fontSize: 18, fontWeight: '700' }]}>
            {route.arrivalTime}
          </Text>
          <Text style={[styles.routeCard.duration, { fontSize: 12, marginBottom: 4 }]}>
            {route.duration}
          </Text>
        </View>
      </View>

      {/* Full-Width Route Summary */}
      <View style={{ 
        paddingHorizontal: 16, 
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: styles.theme.colors.borderLight
      }}>
        {/* Route description with indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ 
            fontSize: 12, 
            color: styles.theme.colors.text,
            fontWeight: '500',
            flex: 1
          }}>
            {route.startingStation && route.endingStation 
              ? `${route.startingStation} → ${route.endingStation}`
              : 'Your Commute'}
          </Text>
          
          {/* Indicators container */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Service Alert indicator */}
            {route.hasServiceAlerts && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: route.alertSeverity === 'severe' ? '#FF3B30' : 
                               route.alertSeverity === 'warning' ? '#FF9500' : 
                               '#007AFF',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 10,
                marginRight: 4
              }}>
                <AlertTriangle 
                  size={8} 
                  color="#FFFFFF" 
                  style={{ marginRight: 3 }}
                />
                <Text style={{
                  fontSize: 8,
                  color: '#FFFFFF',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  ALERT
                </Text>
              </View>
            )}

            {/* LIVE/ESTIMATED indicator */}
            {route.isRealTimeData ? (
              <View style={[styles.indicator.container, styles.indicator.live, { paddingHorizontal: 6, paddingVertical: 2 }]}>
                <View style={[styles.indicator.dot, styles.indicator.liveDot, { width: 4, height: 4, borderRadius: 2, marginRight: 3 }]} />
                <Text style={[styles.indicator.text, styles.indicator.liveText, { fontSize: 8 }]}>LIVE</Text>
              </View>
            ) : (
              <View style={[styles.indicator.container, styles.indicator.estimated, { paddingHorizontal: 6, paddingVertical: 2 }]}>
                <View style={[styles.indicator.dot, styles.indicator.estimatedDot, { width: 4, height: 4, borderRadius: 2, marginRight: 3 }]} />
                <Text style={[styles.indicator.text, styles.indicator.estimatedText, { fontSize: 8 }]}>ESTIMATED</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Walking distance with confidence */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {route.walkingDistance ? (
            <Text style={{ 
              fontSize: 11, 
              color: styles.theme.colors.textSecondary,
              lineHeight: 16
            }}>
              {route.walkingDistance} walk
            </Text>
          ) : (
            <View />
          )}
          
          {/* Confidence indicator */}
          {route.confidence && (
            <Text style={{ 
              fontSize: 9, 
              color: styles.theme.colors.textTertiary,
              textTransform: 'uppercase', 
              letterSpacing: 0.5,
              fontWeight: '500'
            }}>
              {route.confidence} confidence
            </Text>
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
                    boxShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
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