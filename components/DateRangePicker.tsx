import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (startDate: Date, endDate: Date) => void;
}

export function DateRangePicker({ visible, onClose, onSelect }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      if (date < startDate) {
        setStartDate(date);
        setEndDate(startDate);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onSelect(startDate, endDate);
    }
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const selectYear = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setShowYearPicker(false);
  };

  const generateDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDay = date.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Add empty spaces for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let i = 1; i <= lastDay; i++) {
      days.push(new Date(year, month, i));
    }

    // Add empty spaces at the end to complete the grid
    const totalDays = days.length;
    const remainingDays = Math.ceil(totalDays / 7) * 7 - totalDays;
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }
    
    return days;
  };

  const isDateSelected = (date: Date) => {
    if (!date || !startDate) return false;
    if (!endDate) return date.toDateString() === startDate.toDateString();
    return date >= startDate && date <= endDate;
  };

  const isDateInRange = (date: Date) => {
    if (!date || !startDate || !endDate) return false;
    return date > startDate && date < endDate;
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Rango de Fechas</Text>
            <Ionicons name="calendar" size={24} color="#6c5ce7" />
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowYearPicker(true)}>
              <Text style={styles.monthYear}>
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {showYearPicker ? (
            <ScrollView style={styles.yearPicker}>
              {generateYears().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={styles.yearButton}
                  onPress={() => selectYear(year)}
                >
                  <Text style={styles.yearText}>{year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <>
              <View style={styles.weekDays}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <Text key={day} style={styles.weekDay}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendar}>
                {generateDaysInMonth(
                  currentDate.getFullYear(),
                  currentDate.getMonth()
                ).map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateButton,
                      date && isDateSelected(date) && styles.dateButtonSelected,
                      date && isDateInRange(date) && styles.dateButtonInRange,
                    ]}
                    onPress={() => date && handleDateSelect(date)}
                    disabled={!date}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        date && isDateSelected(date) && styles.dateTextSelected,
                        date && isDateInRange(date) && styles.dateTextInRange,
                      ]}
                    >
                      {date ? date.getDate() : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.selectedDates}>
            <Text style={styles.selectedDateText}>
              Desde: {startDate ? startDate.toLocaleDateString() : 'No seleccionado'}
            </Text>
            <Text style={styles.selectedDateText}>
              Hasta: {endDate ? endDate.toLocaleDateString() : 'No seleccionado'}
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              disabled={!startDate || !endDate}
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    margin: 2,
  },
  dateButtonSelected: {
    backgroundColor: '#6c5ce7',
  },
  dateButtonInRange: {
    backgroundColor: '#6c5ce720',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  dateTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  dateTextInRange: {
    color: '#6c5ce7',
  },
  yearPicker: {
    maxHeight: 200,
  },
  yearButton: {
    padding: 10,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDates: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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