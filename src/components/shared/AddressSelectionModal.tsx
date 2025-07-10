import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  useColorScheme 
} from 'react-native';
import { getThemeStyles } from '../../design/components';

interface AddressSelectionModalProps {
  visible: boolean;
  initialOrigin: string;
  initialDestination: string;
  onSave: (addresses: { origin: string; destination: string }) => void;
  onCancel: () => void;
}

export function AddressSelectionModal({ 
  visible, 
  initialOrigin, 
  initialDestination, 
  onSave, 
  onCancel 
}: AddressSelectionModalProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getThemeStyles(isDarkMode);

  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSave = () => {
    onSave({ origin, destination });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: styles.theme.colors.background,
        padding: 16
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingTop: 16
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: styles.theme.colors.text
          }}>
            Select Addresses
          </Text>
          <TouchableOpacity
            testID="cancel-button"
            onPress={onCancel}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: styles.theme.colors.surface,
              borderRadius: 8
            }}
          >
            <Text style={{
              color: styles.theme.colors.textSecondary,
              fontSize: 16
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: styles.theme.colors.text,
            marginBottom: 8
          }}>
            From
          </Text>
          <TextInput
            testID="origin-input"
            value={origin}
            onChangeText={setOrigin}
            placeholder="Enter origin address"
            style={{
              borderWidth: 1,
              borderColor: styles.theme.colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: styles.theme.colors.text,
              backgroundColor: styles.theme.colors.surface
            }}
            placeholderTextColor={styles.theme.colors.textSecondary}
          />
        </View>

        <View style={{
          alignItems: 'center',
          marginBottom: 16
        }}>
          <TouchableOpacity
            testID="swap-addresses-button"
            onPress={handleSwap}
            style={{
              backgroundColor: styles.theme.colors.primary,
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '600'
            }}>
              ⇅
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 32 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: styles.theme.colors.text,
            marginBottom: 8
          }}>
            To
          </Text>
          <TextInput
            testID="destination-input"
            value={destination}
            onChangeText={setDestination}
            placeholder="Enter destination address"
            style={{
              borderWidth: 1,
              borderColor: styles.theme.colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: styles.theme.colors.text,
              backgroundColor: styles.theme.colors.surface
            }}
            placeholderTextColor={styles.theme.colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          testID="save-addresses-button"
          onPress={handleSave}
          style={{
            backgroundColor: styles.theme.colors.primary,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '600'
          }}>
            Save Addresses
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}