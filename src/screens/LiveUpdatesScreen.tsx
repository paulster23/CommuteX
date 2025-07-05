import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getThemeStyles } from '../design/components';

export function LiveUpdatesScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: styles.theme.colors.background }]} edges={['top']}>
      <ScrollView style={localStyles.content}>
        <View style={localStyles.header}>
          <Text style={[localStyles.title, { color: styles.theme.colors.text }]}>Live Updates</Text>
          <Text style={[localStyles.subtitle, { color: styles.theme.colors.textSecondary }]}>Real-time MTA service information</Text>
        </View>
        
        <View style={[localStyles.placeholder, { backgroundColor: styles.theme.colors.surface }]}>
          <Text style={[localStyles.placeholderText, { color: styles.theme.colors.text }]}>
            📱 Live features coming soon:
          </Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Real-time train tracking</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Service alerts and delays</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Platform crowding information</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Push notifications for disruptions</Text>
        </View>

        <View style={[localStyles.statusCard, { backgroundColor: styles.theme.colors.surface }]}>
          <Text style={[localStyles.statusTitle, { color: styles.theme.colors.text }]}>Current Service Status</Text>
          <View style={localStyles.statusItem}>
            <View style={[localStyles.statusIndicator, { backgroundColor: styles.theme.colors.success }]} />
            <Text style={[localStyles.statusText, { color: styles.theme.colors.textSecondary }]}>All systems operational</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  placeholder: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 8,
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
  },
});