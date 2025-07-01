import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Navigation, Users, MapPin } from 'lucide-react-native';
import { RouteStep, DataSourceType } from '../services/RealMTAService';

interface RouteStepsDisplayProps {
  steps: RouteStep[];
  isExpanded: boolean;
}

const getDataSourceIndicator = (dataSource: DataSourceType) => {
  switch (dataSource) {
    case 'realtime':
      return { color: '#34C759', label: 'Live GTFS Data' }; // Green
    case 'estimate':
      return { color: '#FF9500', label: 'Estimated' }; // Yellow/Orange
    case 'fixed':
      return { color: '#FF3B30', label: 'Fixed Data' }; // Red
    default:
      return { color: '#8E8E93', label: 'Unknown' }; // Gray
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
  if (!isExpanded || !steps || steps.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Breakdown</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Live GTFS</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Estimated</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.legendText}>Fixed</Text>
          </View>
        </View>
      </View>
      
      {steps.map((step, index) => {
        const indicator = getDataSourceIndicator(step.dataSource);
        const IconComponent = getStepIcon(step.type);
        
        return (
          <View key={index} style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <IconComponent size={16} color="#6C6C70" />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                  <View style={styles.dataSourceContainer}>
                    <View style={[styles.dataSourceDot, { backgroundColor: indicator.color }]} />
                    <Text style={styles.stepDuration}>{step.duration} min</Text>
                  </View>
                </View>
                
                {step.line && (
                  <View style={styles.lineContainer}>
                    <View style={[styles.lineBadge, getLineColor(step.line)]}>
                      <Text style={styles.lineText}>{step.line}</Text>
                    </View>
                  </View>
                )}
                
                <Text style={styles.dataSourceLabel}>{indicator.label}</Text>
              </View>
            </View>
            
            {index < steps.length - 1 && (
              <View style={styles.connector}>
                <View style={styles.connectorLine} />
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

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
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
    color: '#6C6C70',
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
    backgroundColor: '#E5E5E7',
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
    color: '#1C1C1E',
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
    color: '#007AFF',
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
    color: '#6C6C70',
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
    backgroundColor: '#E5E5E7',
  },
});