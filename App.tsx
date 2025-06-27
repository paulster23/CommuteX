import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { CommuteApp } from './src/components/CommuteApp';

export default function App() {
  return (
    <View style={styles.container}>
      <CommuteApp />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
