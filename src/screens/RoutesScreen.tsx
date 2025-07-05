import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getThemeStyles } from '../design/components';

export function RoutesScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: styles.theme.colors.background }]} edges={['top']}>
      <ScrollView style={localStyles.content}>
        <View style={localStyles.header}>
          <Text style={[localStyles.title, { color: styles.theme.colors.text }]}>Route Planning</Text>
          <Text style={[localStyles.subtitle, { color: styles.theme.colors.textSecondary }]}>Plan your commute with multiple options</Text>
        </View>
        
        <View style={[localStyles.placeholder, { backgroundColor: styles.theme.colors.surface }]}>
          <Text style={[localStyles.placeholderText, { color: styles.theme.colors.text }]}>
            🚇 Route planning features coming soon:
          </Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Alternative route suggestions</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Custom destination planning</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Saved routes and favorites</Text>
          <Text style={[localStyles.featureText, { color: styles.theme.colors.textSecondary }]}>• Time-based route optimization</Text>
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
});