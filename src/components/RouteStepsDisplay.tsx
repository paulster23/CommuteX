import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Clock, Navigation, Users, MapPin } from 'lucide-react-native';
import { RouteStep, DataSourceType } from '../services/RealMTAService';
import { getThemeStyles } from '../design/components';

interface RouteStepsDisplayProps {
  steps: RouteStep[];
  isExpanded: boolean;
}

const getDataSourceIndicator = (dataSource: DataSourceType, theme: any) => {
  switch (dataSource) {
    case 'realtime':
      return { color: theme.colors.success, label: 'Live GTFS Data' };
    case 'estimate':
      return { color: theme.colors.warning, label: 'Estimated' };
    case 'fixed':
      return { color: theme.colors.error, label: 'Fixed Data' };
    default:
      return { color: theme.colors.textTertiary, label: 'Unknown' };
  }
};

const getStepIcon = (type: RouteStep['type']) => {
  switch (type) {
    case 'walk':
      return Navigation;
    case 'wait':
      return Clock;
    case 'transit':
      return Users;
    case 'transfer':
      return MapPin;
    default:
      return MapPin;
  }
};

export function RouteStepsDisplay({ steps, isExpanded }: RouteStepsDisplayProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  if (!isExpanded || !steps || steps.length === 0) {
    return null;
  }

  return (
    <View style={[localStyles.container, { backgroundColor: styles.theme.colors.surfaceSecondary }]}>
      <View style={localStyles.header}>
        <Text style={[localStyles.headerTitle, { color: styles.theme.colors.text }]}>Route Breakdown</Text>
        <View style={localStyles.legend}>
          <View style={localStyles.legendItem}>
            <View style={[localStyles.dot, { backgroundColor: styles.theme.colors.success }]} />
            <Text style={[localStyles.legendText, { color: styles.theme.colors.textSecondary }]}>Live GTFS</Text>
          </View>
          <View style={localStyles.legendItem}>
            <View style={[localStyles.dot, { backgroundColor: styles.theme.colors.warning }]} />
            <Text style={[localStyles.legendText, { color: styles.theme.colors.textSecondary }]}>Estimated</Text>
          </View>
          <View style={localStyles.legendItem}>
            <View style={[localStyles.dot, { backgroundColor: styles.theme.colors.error }]} />
            <Text style={[localStyles.legendText, { color: styles.theme.colors.textSecondary }]}>Fixed</Text>
          </View>
        </View>
      </View>
      
      {steps.map((step, index) => {
        const indicator = getDataSourceIndicator(step.dataSource, styles.theme);
        const IconComponent = getStepIcon(step.type);
        
        return (
          <View key={index} style={localStyles.stepContainer}>
            <View style={localStyles.stepHeader}>
              <View style={[localStyles.stepIconContainer, { backgroundColor: styles.theme.colors.border }]}>
                <IconComponent size={16} color={styles.theme.colors.textSecondary} />
              </View>
              <View style={localStyles.stepContent}>
                <View style={localStyles.stepTitleRow}>
                  <Text style={[localStyles.stepDescription, { color: styles.theme.colors.text }]}>{step.description}</Text>
                  <View style={localStyles.dataSourceContainer}>
                    <View style={[localStyles.dataSourceDot, { backgroundColor: indicator.color }]} />
                    <Text style={[localStyles.stepDuration, { color: styles.theme.colors.primary }]}>{step.duration} min</Text>
                  </View>
                </View>
                
                {step.line && (
                  <View style={localStyles.lineContainer}>
                    <View style={[localStyles.lineBadge, getLineColor(step.line)]}>
                      <Text style={[localStyles.lineText, { color: getLineColor(step.line).color }]}>{step.line}</Text>
                    </View>
                  </View>
                )}
                
                <Text style={[localStyles.dataSourceLabel, { color: styles.theme.colors.textSecondary }]}>{indicator.label}</Text>
              </View>
            </View>
            
            {index < steps.length - 1 && (
              <View style={localStyles.connector}>
                <View style={[localStyles.connectorLine, { backgroundColor: styles.theme.colors.border }]} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const getLineColor = (line: string) => {
  const colors: { [key: string]: { backgroundColor: string; color: string } } = {
    'F': { backgroundColor: '#FF6319', color: '#FFFFFF' },
    'R': { backgroundColor: '#FCCC0A', color: '#000000' },
    'Q': { backgroundColor: '#FCCC0A', color: '#000000' },
    'N': { backgroundColor: '#FCCC0A', color: '#000000' },
    'W': { backgroundColor: '#FCCC0A', color: '#000000' },
    'A': { backgroundColor: '#0039A6', color: '#FFFFFF' },
    'C': { backgroundColor: '#0039A6', color: '#FFFFFF' },
    'G': { backgroundColor: '#6CBE45', color: '#FFFFFF' },
    'L': { backgroundColor: '#A7A9AC', color: '#000000' },
    '4': { backgroundColor: '#00933C', color: '#FFFFFF' },
    '5': { backgroundColor: '#00933C', color: '#FFFFFF' },
    '6': { backgroundColor: '#00933C', color: '#FFFFFF' },
    'B61': { backgroundColor: '#0039A6', color: '#FFFFFF' },
  };
  
  return colors[line] || { backgroundColor: '#8E8E93', color: '#FFFFFF' };
};

const localStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContainer: {
    position: 'relative',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  dataSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dataSourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
  lineContainer: {
    marginBottom: 4,
  },
  lineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  lineText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dataSourceLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  connector: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 24,
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
  },
});