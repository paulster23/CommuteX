import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function RoutesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Route Planning</Text>
          <Text style={styles.subtitle}>Plan your commute with multiple options</Text>
        </View>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            🚇 Route planning features coming soon:
          </Text>
          <Text style={styles.featureText}>• Alternative route suggestions</Text>
          <Text style={styles.featureText}>• Custom destination planning</Text>
          <Text style={styles.featureText}>• Saved routes and favorites</Text>
          <Text style={styles.featureText}>• Time-based route optimization</Text>
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
});