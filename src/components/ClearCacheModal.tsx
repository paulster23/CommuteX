import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, useColorScheme } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { getThemeStyles } from '../design/components';

interface ClearCacheModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isClearing?: boolean;
}

export function ClearCacheModal({ visible, onConfirm, onCancel, isClearing = false }: ClearCacheModalProps) {
  console.log('[ClearCacheModal] Rendering modal, visible:', visible, 'isClearing:', isClearing);
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={localStyles.overlay}>
        <View style={[localStyles.modal, { backgroundColor: styles.theme.colors.surface }]}>
          <View style={localStyles.header}>
            <View style={[localStyles.iconContainer, { backgroundColor: isDarkMode ? '#4A2F2A' : '#FFEBEE' }]}>
              <AlertTriangle size={24} color={styles.theme.colors.error} />
            </View>
            <Text style={[localStyles.title, { color: styles.theme.colors.text }]}>Clear Cache</Text>
          </View>
          
          <Text style={[localStyles.message, { color: styles.theme.colors.textSecondary }]}>
            This will clear all cached data including route information, service worker caches, and browser storage. The app will refresh with the latest data.
          </Text>
          
          <View style={localStyles.buttonContainer}>
            <TouchableOpacity 
              style={[localStyles.button, localStyles.cancelButton, { backgroundColor: styles.theme.colors.surfaceSecondary, borderColor: styles.theme.colors.border }]} 
              onPress={onCancel}
              disabled={isClearing}
            >
              <Text style={[localStyles.cancelText, { color: styles.theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[localStyles.button, localStyles.confirmButton, { backgroundColor: styles.theme.colors.error }, isClearing && localStyles.disabledButton]} 
              onPress={onConfirm}
              disabled={isClearing}
            >
              <Text style={[localStyles.confirmText, isClearing && localStyles.disabledText]}>
                {isClearing ? 'Clearing...' : 'Clear Cache'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#999999',
  },
});