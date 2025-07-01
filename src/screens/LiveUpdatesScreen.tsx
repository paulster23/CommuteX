import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LiveUpdatesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Updates</Text>
          <Text style={styles.subtitle}>Real-time MTA service information</Text>
        </View>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            📱 Live features coming soon:
          </Text>
          <Text style={styles.featureText}>• Real-time train tracking</Text>
          <Text style={styles.featureText}>• Service alerts and delays</Text>
          <Text style={styles.featureText}>• Platform crowding information</Text>
          <Text style={styles.featureText}>• Push notifications for disruptions</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Service Status</Text>
          <View style={styles.statusItem}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>All systems operational</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C6C70',
  },
  placeholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#6C6C70',
    marginBottom: 8,
    paddingLeft: 8,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#6C6C70',
  },
});