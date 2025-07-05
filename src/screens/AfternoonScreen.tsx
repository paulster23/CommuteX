import React from 'react';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AfternoonCommuteApp } from '../components/AfternoonCommuteApp';
import { getThemeStyles } from '../design/components';

export function AfternoonScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  return (
    <SafeAreaView 
      style={[localStyles.container, { backgroundColor: styles.theme.colors.background }]} 
      edges={Platform.OS === 'ios' ? ['top'] : ['top']}
    >
      <View style={localStyles.content}>
        <AfternoonCommuteApp />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});