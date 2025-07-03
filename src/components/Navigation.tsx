import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Sun, Settings } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Morning') {
            IconComponent = Sun;
          } else if (route.name === 'Settings') {
            IconComponent = Settings;
          }

          return IconComponent ? <IconComponent size={size} color={color} /> : null;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false, // PWA optimization - use screen space efficiently
        tabBarStyle: {
          paddingBottom: 16, // Increased padding to prevent text cutoff
          paddingTop: 8,
          height: 80, // Increased height to accommodate text labels
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
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
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}