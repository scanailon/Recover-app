import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (hour: number, minute: number) => void;
}

export function TimePicker({ visible, onClose, onSelect }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const handleConfirm = () => {
    onSelect(selectedHour, selectedMinute);
  };

  const renderTimeWheel = (
    values: number[],
    selected: number,
    onSelect: (value: number) => void,
    format: (value: number) => string
  ) => (
    <ScrollView style={styles.wheelContainer} showsVerticalScrollIndicator={false}>
      {values.map((value) => (
        <TouchableOpacity
          key={value}
          style={[
            styles.wheelItem,
            value === selected && styles.wheelItemSelected,
          ]}
          onPress={() => onSelect(value)}
        >
          <Text
            style={[
              styles.wheelText,
              value === selected && styles.wheelTextSelected,
            ]}
          >
            {format(value)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Hora</Text>
            <Ionicons name="time" size={24} color="#6c5ce7" />
          </View>

          <View style={styles.timeContainer}>
            <View style={styles.wheelWrapper}>
              <Text style={styles.wheelLabel}>Hora</Text>
              {renderTimeWheel(
                Array.from({ length: 24 }, (_, i) => i),
                selectedHour,
                setSelectedHour,
                (v) => v.toString().padStart(2, '0')
              )}
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.wheelWrapper}>
              <Text style={styles.wheelLabel}>Minuto</Text>
              {renderTimeWheel(
                Array.from({ length: 60 }, (_, i) => i),
                selectedMinute,
                setSelectedMinute,
                (v) => v.toString().padStart(2, '0')
              )}
            </View>
          </View>

          <Text style={styles.selectedTime}>
            Hora seleccionada: {selectedHour.toString().padStart(2, '0')}:
            {selectedMinute.toString().padStart(2, '0')}
          </Text>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  wheelWrapper: {
    flex: 1,
    height: '100%',
  },
  wheelLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  wheelContainer: {
    height: '100%',
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  wheelItemSelected: {
    backgroundColor: '#6c5ce720',
  },
  wheelText: {
    fontSize: 20,
    color: '#333',
  },
  wheelTextSelected: {
    color: '#6c5ce7',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 10,
    color: '#666',
  },
  selectedTime: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#6c5ce7',
  },
  buttonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButtonText: {
    color: 'white',
  },
});