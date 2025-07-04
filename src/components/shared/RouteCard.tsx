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
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const getSubwayLineFromMethod = (method: string): string => {
    // Handle both single-leg "F train" and multi-leg "F→C trains" patterns
    const match = method.match(/^([A-Z0-9]+(?:→[A-Z0-9]+)?)\s+trains?/);
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
                { backgroundColor: iconBackgroundColor }
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
                            step.type === 'transit' ? step.line || '🚇' : 
                            step.type === 'transfer' ? '🔄' : '📍';
            
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