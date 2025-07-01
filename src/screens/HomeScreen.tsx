import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommuteApp } from '../components/CommuteApp';

export function HomeScreen() {
  return (
    <SafeAreaView 
      style={styles.container} 
      edges={Platform.OS === 'ios' ? ['top'] : ['top']}
    >
      <View style={styles.content}>
        <CommuteApp />
      </View>
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
  },
});