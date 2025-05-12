import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';

interface ConnectingModalProps {
  visible: boolean;
  deviceName: string;
}

export function ConnectingModal({ visible, deviceName }: ConnectingModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ActivityIndicator size="large" color="#6c5ce7" />
          <Text style={styles.connectingText}>
            Conectando a {deviceName}...
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  connectingText: {
    fontSize: 16,
    color: '#333',
  },
});