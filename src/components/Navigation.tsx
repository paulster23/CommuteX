import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Route, Activity, Settings } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { RoutesScreen } from '../screens/RoutesScreen';
import { LiveUpdatesScreen } from '../screens/LiveUpdatesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Home') {
            IconComponent = Home;
          } else if (route.name === 'Routes') {
            IconComponent = Route;
          } else if (route.name === 'Live') {
            IconComponent = Activity;
          } else if (route.name === 'Settings') {
            IconComponent = Settings;
          }

          return IconComponent ? <IconComponent size={size} color={color} /> : null;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false, // PWA optimization - use screen space efficiently
        tabBarStyle: {
          paddingBottom: 8, // PWA safe area optimization
          paddingTop: 8,
          height: 64,
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
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Routes" 
        component={RoutesScreen}
        options={{ tabBarLabel: 'Routes' }}
      />
      <Tab.Screen 
        name="Live" 
        component={LiveUpdatesScreen}
        options={{ tabBarLabel: 'Live' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}