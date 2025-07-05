import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { Sun, Moon, Settings, MapPin } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { AfternoonScreen } from '../screens/AfternoonScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { getThemeStyles } from '../design/components';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Morning') {
            IconComponent = Sun;
          } else if (route.name === 'Afternoon') {
            IconComponent = Moon;
          } else if (route.name === 'Settings') {
            IconComponent = Settings;
          } else if (route.name === 'Help') {
            IconComponent = MapPin;
          }

          return IconComponent ? <IconComponent size={size} color={color} /> : null;
        },
        tabBarActiveTintColor: styles.theme.colors.primary,
        tabBarInactiveTintColor: styles.theme.colors.textTertiary,
        headerShown: false, // PWA optimization - use screen space efficiently
        tabBarStyle: {
          paddingBottom: 16, // Increased padding to prevent text cutoff
          paddingTop: 8,
          height: 80, // Increased height to accommodate text labels
          backgroundColor: styles.theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: styles.theme.colors.border,
          shadowColor: isDarkMode ? '#000' : '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
      })}
    >
      <Tab.Screen 
        name="Morning" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Morning' }}
      />
      <Tab.Screen 
        name="Afternoon" 
        component={AfternoonScreen}
        options={{ tabBarLabel: 'Afternoon' }}
      />
      <Tab.Screen 
        name="Help" 
        component={HelpScreen}
        options={{ tabBarLabel: 'Help' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}