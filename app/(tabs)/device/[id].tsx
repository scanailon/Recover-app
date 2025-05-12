import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DeviceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>MST03</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>ID: </Text>
          <Text style={styles.idValue}>C3:00:00:1B:4F:A0</Text>
        </View>

        <View style={styles.chartContainer}>
          {/* Chart placeholder */}
          <View style={styles.chart} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Temperatura promedio:</Text>
            <Text style={styles.statValue}>18.5°C</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Temperatura mínima:</Text>
            <Text style={styles.statValue}>12.6°C</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Temperatura máxima:</Text>
            <Text style={styles.statValue}>24.7°C</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fecha inicio:</Text>
            <Text style={styles.statValue}>22-07-2024 00:00</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fecha término:</Text>
            <Text style={styles.statValue}>23-07-2024 23:59</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.sensorButton}>
          <Text style={styles.sensorButtonText}>LISTA DE SENSORES</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDisabled]}>
            <Text style={styles.actionButtonText}>DESCARGAR IMAGEN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>DESCARGAR EXCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>SUBIR DATOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6c5ce7',
    paddingTop: Platform.select({
      ios: 45,
      android: 25,
      default: 40,
    }),
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  idContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 16,
    color: '#666',
  },
  idValue: {
    fontSize: 16,
    color: '#000',
  },
  chartContainer: {
    height: 200,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chart: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  sensorButton: {
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  sensorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});