import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, MapPin, Clock, Info } from 'lucide-react-native';

export function SettingsScreen() {
  const settingsOptions = [
    {
      title: 'Notifications',
      subtitle: 'Service alerts and updates',
      icon: Bell,
    },
    {
      title: 'Default Locations',
      subtitle: 'Home and work addresses',
      icon: MapPin,
    },
    {
      title: 'Preferred Times',
      subtitle: 'Commute schedule preferences',
      icon: Clock,
    },
    {
      title: 'About',
      subtitle: 'App version and information',
      icon: Info,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your CommuteX experience</Text>
        </View>
        
        <View style={styles.section}>
          {settingsOptions.map((option, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.settingItem,
                index === settingsOptions.length - 1 && styles.lastItem
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <option.icon size={24} color="#007AFF" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>{option.title}</Text>
                  <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pwaTip}>
          <Text style={styles.tipTitle}>💡 PWA Tip</Text>
          <Text style={styles.tipText}>
            Install CommuteX to your home screen for the best experience! 
            Look for the "Add to Home Screen" option in your browser menu.
          </Text>
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 15,
    color: '#6C6C70',
  },
  pwaTip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 16,
    color: '#1976D2',
    lineHeight: 22,
  },
});