import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ServiceAlert } from '../../services/RealMTAService';
import { getThemeStyles } from '../../design/components';
import { colors } from '../../design/theme';

interface CriticalAlertPillProps {
  alert: ServiceAlert;
  isDarkMode: boolean;
}

export function CriticalAlertPill({ alert, isDarkMode }: CriticalAlertPillProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = getThemeStyles(isDarkMode);

  const getSubwayLineColor = (alert: ServiceAlert) => {
    // Use the first affected route's color, or default if none
    const primaryRoute = alert.affectedRoutes[0];
    return colors.subway[primaryRoute as keyof typeof colors.subway] || '#6B7280';
  };

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <TouchableOpacity
      onPress={toggleExpansion}
      style={{
        backgroundColor: getSubwayLineColor(alert),
        marginHorizontal: 8,
        marginBottom: 8,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left side: Subway lines and header text */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {/* Subway Line Icons */}
          <View style={{ flexDirection: 'row', marginRight: 8 }}>
            {alert.affectedRoutes.map((line) => (
              <View
                key={line}
                style={{
                  backgroundColor: colors.subway[line as keyof typeof colors.subway] || '#FFFFFF',
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Alert Header Text */}
          <Text 
            style={{ 
              color: '#FFFFFF', 
              fontSize: 14, 
              fontWeight: '600',
              flex: 1,
            }}
            numberOfLines={isExpanded ? undefined : 1}
          >
            {alert.headerText}
          </Text>
        </View>
        
        {/* Right side: Expand/collapse indicator */}
        <Text style={{ 
          color: '#FFFFFF', 
          fontSize: 16, 
          marginLeft: 8,
          opacity: 0.8
        }}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' }}>
          {/* Description */}
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: 13, 
            opacity: 0.9,
            marginBottom: 8,
            lineHeight: 18
          }}>
            {alert.descriptionText}
          </Text>
          
          {/* Direction Indicators */}
          {alert.informedEntities.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, opacity: 0.8, marginRight: 8 }}>
                Directions:
              </Text>
              {alert.informedEntities.map((entity, index) => (
                <Text
                  key={index}
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    marginRight: 6,
                    opacity: 0.9
                  }}
                >
                  {entity.directionId === 0 ? '↓ Southbound' : 
                   entity.directionId === 1 ? '↑ Northbound' : '↕ Both'}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}