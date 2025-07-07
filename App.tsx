import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/components/Navigation';
import { getThemeStyles } from './src/design/components';

export default function App() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
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

      // Hide vertical scroll bar for cleaner PWA appearance
      const style = document.createElement('style');
      style.textContent = `
        /* Hide scrollbar for webkit browsers */
        ::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for Firefox */
        * {
          scrollbar-width: none;
        }
        
        /* Ensure content is still scrollable */
        body, html {
          overflow-x: hidden;
          -ms-overflow-style: none;
        }
      `;
      document.head.appendChild(style);

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
        <View style={[localStyles.container, { backgroundColor: styles.theme.colors.background }]}>
          <AppNavigator />
          <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={styles.theme.colors.primary} />
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
