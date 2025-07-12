import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ServiceAlert } from '../../services/RealMTAService';
import { getThemeStyles } from '../../design/components';
import { colors } from '../../design/theme';

/**
 * Format service alert active period for display
 */
function formatAlertTimePeriod(activePeriod?: { start?: Date; end?: Date }): string {
  if (!activePeriod) {
    return ''; // No timing information available
  }

  const now = new Date();
  const { start, end } = activePeriod;

  // Format time for display (e.g., "2:30 PM")
  const formatTime = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('[CriticalAlertPill] Error formatting time:', date, error);
      return 'Invalid Time';
    }
  };

  // Format date for display (e.g., "Dec 25")
  const formatDate = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('[CriticalAlertPill] Error formatting date:', date, error);
      return 'Invalid Date';
    }
  };

  // Check if date is today
  const isToday = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return false;
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // Check if date is tomorrow
  const isTomorrow = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return date.getDate() === tomorrow.getDate() &&
             date.getMonth() === tomorrow.getMonth() &&
             date.getFullYear() === tomorrow.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // Validate dates before processing
  const isValidDate = (date: Date | undefined) => {
    return date && !isNaN(date.getTime());
  };

  // Build time period string
  if (isValidDate(start) && isValidDate(end)) {
    // Both start and end times
    if (isToday(start!) && isToday(end!)) {
      return `Today ${formatTime(start!)} - ${formatTime(end!)}`;
    } else if (isToday(start!) && isTomorrow(end!)) {
      return `Today ${formatTime(start!)} - Tomorrow ${formatTime(end!)}`;
    } else if (start!.getDate() === end!.getDate() && start!.getMonth() === end!.getMonth() && start!.getFullYear() === end!.getFullYear()) {
      // Same day but not today
      return `${formatDate(start!)} ${formatTime(start!)} - ${formatTime(end!)}`;
    } else {
      // Different days
      return `${formatDate(start!)} ${formatTime(start!)} - ${formatDate(end!)} ${formatTime(end!)}`;
    }
  } else if (isValidDate(start)) {
    // Only start time
    if (isToday(start!)) {
      return `Starting today at ${formatTime(start!)}`;
    } else if (isTomorrow(start!)) {
      return `Starting tomorrow at ${formatTime(start!)}`;
    } else {
      return `Starting ${formatDate(start!)} at ${formatTime(start!)}`;
    }
  } else if (isValidDate(end)) {
    // Only end time
    if (isToday(end!)) {
      return `Until today at ${formatTime(end!)}`;
    } else if (isTomorrow(end!)) {
      return `Until tomorrow at ${formatTime(end!)}`;
    } else {
      return `Until ${formatDate(end!)} at ${formatTime(end!)}`;
    }
  }

  return '';
}

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

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'SEVERE';
      case 'warning':
        return 'WARNING';
      case 'info':
        return 'INFO';
      default:
        return severity.toUpperCase();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return '#DC2626'; // Red
      case 'warning':
        return '#F59E0B'; // Orange
      case 'info':
        return '#3B82F6'; // Blue
      default:
        return '#6B7280'; // Gray
    }
  };

  const isSkippingAlert = (alert: ServiceAlert) => {
    const text = `${alert.headerText} ${alert.descriptionText}`.toLowerCase();
    return text.includes('skip') || text.includes('not stopping');
  };

  const getAffectedKeyStations = (alert: ServiceAlert) => {
    const keyStations = {
      'F21': 'Carroll St',
      'A41': 'Jay St-MetroTech',
      'D18': '23rd St',
      'A30': '23rd St-8th Ave',
    };

    const affectedStations: string[] = [];
    
    alert.informedEntities.forEach(entity => {
      if (entity.stopId) {
        // Check for exact match or directional variants
        Object.entries(keyStations).forEach(([stationId, stationName]) => {
          if (entity.stopId === stationId || 
              entity.stopId === `${stationId}N` || 
              entity.stopId === `${stationId}S`) {
            if (!affectedStations.includes(stationName)) {
              affectedStations.push(stationName);
            }
          }
        });
      }
    });

    return affectedStations;
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
          
          {/* Severity Badge */}
          <View style={{
            backgroundColor: getSeverityColor(alert.severity),
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            marginRight: 6,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 9,
              fontWeight: '700',
            }}>
              {getSeverityLabel(alert.severity)}
            </Text>
          </View>
          
          {/* Skipping Alert Badge */}
          {isSkippingAlert(alert) && (
            <View style={{
              backgroundColor: '#DC2626', // Red background for critical skipping alerts
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginRight: 6,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 9,
                fontWeight: '700',
              }}>
                SKIPPING
              </Text>
            </View>
          )}
          
          {/* Feed Source Badge */}
          {alert.feedSource && (
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderRadius: 3,
              marginRight: 8,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 8,
                fontWeight: '500',
                opacity: 0.9,
              }}>
                {alert.feedSource}
              </Text>
            </View>
          )}
          
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
          
          {/* Affected Key Stations */}
          {(() => {
            const affectedStations = getAffectedKeyStations(alert);
            return affectedStations.length > 0 ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  opacity: 0.8,
                  marginBottom: 2
                }}>
                  Affected Key Stations:
                </Text>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  opacity: 0.9,
                  fontWeight: '600'
                }}>
                  {affectedStations.join(', ')}
                </Text>
              </View>
            ) : null;
          })()}
          
          {/* Time in Effect */}
          {(() => {
            const timePeriod = formatAlertTimePeriod(alert.activePeriod);
            return timePeriod ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  opacity: 0.8,
                  marginBottom: 2
                }}>
                  Time in Effect:
                </Text>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  opacity: 0.9,
                  fontWeight: '500'
                }}>
                  {timePeriod}
                </Text>
              </View>
            ) : null;
          })()}
          
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