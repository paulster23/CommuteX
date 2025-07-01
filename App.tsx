import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/components/Navigation';

export default function App() {
  useEffect(() => {
    // PWA standalone optimizations
    if (Platform.OS === 'web') {
      // Prevent zoom on input focus for better PWA experience
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }

      // Set PWA display mode styles
      if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.webkitTouchCallout = 'none';
        // Allow overscroll for pull-to-refresh functionality
        document.body.style.overscrollBehaviorX = 'none';
        document.body.style.overscrollBehaviorY = 'auto';
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <View style={styles.container}>
          <AppNavigator />
          <StatusBar style="light" backgroundColor="#007AFF" />
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
