import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, MapPin, Clock, Info, Trash2 } from 'lucide-react-native';
import { CacheUtility } from '../services/CacheUtility';
import { ClearCacheModal } from '../components/ClearCacheModal';

export function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleClearCache = async () => {
    console.log('[SettingsScreen] Clear cache button pressed');
    console.log('[SettingsScreen] Environment debug:', {
      hasAlert: typeof Alert !== 'undefined',
      alertType: typeof Alert,
      hasAlertAlert: typeof Alert !== 'undefined' && typeof Alert.alert === 'function',
      hasWindow: typeof window !== 'undefined',
      hasWindowConfirm: typeof window !== 'undefined' && typeof window.confirm === 'function',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
    
    // Test if Alert is working
    console.log('[SettingsScreen] Checking Alert availability...');
    if (typeof Alert === 'undefined' || !Alert.alert) {
      console.error('[SettingsScreen] Alert.alert is not available!');
      console.log('[SettingsScreen] Alert object:', Alert);
      console.log('[SettingsScreen] Trying window.confirm fallback...');
      
      // Fallback to window.confirm for web environments
      if (typeof window !== 'undefined' && window.confirm) {
        console.log('[SettingsScreen] window.confirm is available, showing dialog...');
        try {
          const confirmed = window.confirm('Clear all cached data? This will refresh the app with the latest data.');
          console.log('[SettingsScreen] window.confirm result:', confirmed);
          if (confirmed) {
            console.log('[SettingsScreen] Cache clear confirmed via window.confirm');
            setIsClearing(true);
            try {
              const result = await CacheUtility.clearAllCaches();
              console.log('[SettingsScreen] Cache clear result:', result);
              window.alert(result.message);
              if (result.success && typeof window !== 'undefined') {
                window.location.reload();
              }
            } catch (error) {
              console.error('[SettingsScreen] Cache clear error:', error);
              window.alert('An unexpected error occurred while clearing the cache.');
            } finally {
              setIsClearing(false);
            }
          } else {
            console.log('[SettingsScreen] User cancelled via window.confirm');
          }
        } catch (confirmError) {
          console.error('[SettingsScreen] window.confirm error:', confirmError);
        }
      } else {
        console.error('[SettingsScreen] No dialog mechanism available!');
        console.log('[SettingsScreen] Available options:', {
          hasWindow: typeof window !== 'undefined',
          hasWindowConfirm: typeof window !== 'undefined' && typeof window.confirm === 'function',
          hasWindowAlert: typeof window !== 'undefined' && typeof window.alert === 'function'
        });
      }
      return;
    }
    
    console.log('[SettingsScreen] Alert.alert is available, attempting to show dialog...');
    try {
      Alert.alert(
      'Clear Cache',
      'This will clear all cached data including route information, service worker caches, and browser storage. The app will refresh with the latest data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('[SettingsScreen] Cache clear cancelled');
          }
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            console.log('[SettingsScreen] Cache clear confirmed, starting process...');
            setIsClearing(true);
            try {
              const result = await CacheUtility.clearAllCaches();
              console.log('[SettingsScreen] Cache clear result:', result);
              
              Alert.alert(
                result.success ? 'Cache Cleared' : 'Clear Cache Failed',
                result.message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      console.log('[SettingsScreen] User acknowledged result');
                      if (result.success) {
                        // Reload the app to ensure fresh data
                        console.log('[SettingsScreen] Reloading app...');
                        if (typeof window !== 'undefined') {
                          window.location.reload();
                        }
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('[SettingsScreen] Cache clear error:', error);
              Alert.alert(
                'Error',
                'An unexpected error occurred while clearing the cache.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
    console.log('[SettingsScreen] Alert.alert call completed');
    } catch (alertError) {
      console.error('[SettingsScreen] Alert.alert failed:', alertError);
      console.log('[SettingsScreen] Falling back to window.confirm after Alert.alert failure...');
      
      // Fallback to window.confirm if Alert.alert fails
      if (typeof window !== 'undefined' && window.confirm) {
        try {
          const confirmed = window.confirm('Clear all cached data? This will refresh the app with the latest data.');
          console.log('[SettingsScreen] Fallback window.confirm result:', confirmed);
          if (confirmed) {
            console.log('[SettingsScreen] Cache clear confirmed via fallback window.confirm');
            setIsClearing(true);
            try {
              const result = await CacheUtility.clearAllCaches();
              console.log('[SettingsScreen] Cache clear result:', result);
              window.alert(result.message);
              if (result.success && typeof window !== 'undefined') {
                window.location.reload();
              }
            } catch (error) {
              console.error('[SettingsScreen] Cache clear error:', error);
              window.alert('An unexpected error occurred while clearing the cache.');
            } finally {
              setIsClearing(false);
            }
          } else {
            console.log('[SettingsScreen] User cancelled via fallback window.confirm');
          }
        } catch (confirmError) {
          console.error('[SettingsScreen] Fallback window.confirm also failed:', confirmError);
        }
      } else {
        console.error('[SettingsScreen] No fallback dialog available after Alert.alert failure!');
        console.log('[SettingsScreen] Trying custom modal as final fallback...');
        setShowCustomModal(true);
      }
    }
  };

  const handleModalConfirm = async () => {
    console.log('[SettingsScreen] Custom modal confirmed');
    setShowCustomModal(false);
    setIsClearing(true);
    try {
      const result = await CacheUtility.clearAllCaches();
      console.log('[SettingsScreen] Cache clear result via custom modal:', result);
      
      // Since we can't use Alert or window.alert, just reload on success
      if (result.success && typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('[SettingsScreen] Cache clear error via custom modal:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleModalCancel = () => {
    console.log('[SettingsScreen] Custom modal cancelled');
    setShowCustomModal(false);
  };

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

        {/* Cache Management Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleClearCache}
            disabled={isClearing}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                <Trash2 size={24} color="#F44336" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>
                  {isClearing ? 'Clearing Cache...' : 'Clear Cache'}
                </Text>
                <Text style={styles.settingSubtitle}>
                  Clear all cached data and refresh app
                </Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.pwaTip}>
          <Text style={styles.tipTitle}>💡 PWA Tip</Text>
          <Text style={styles.tipText}>
            Install CommuteX to your home screen for the best experience! 
            Look for the "Add to Home Screen" option in your browser menu.
          </Text>
        </View>
      </ScrollView>
      
      {/* Custom Modal Fallback */}
      <ClearCacheModal
        visible={showCustomModal}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        isClearing={isClearing}
      />
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