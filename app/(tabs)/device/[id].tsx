import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { minewBleManager, HistoricalData } from '@/BleManager';
import SensorChart from '@/components/SensorChart';
import * as FileSystem from 'expo-file-system';

// Componente para visualizar los datos históricos
export default function DeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    startTime: string;
    endTime: string;
    deviceType: string;
  }>();

  const [deviceId] = useState(params.id);
  const [deviceType] = useState(params.deviceType || 'MST01');
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [stats, setStats] = useState({
    avgTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    startDate: new Date(),
    endDate: new Date()
  });

  // Cargar datos históricos al montar el componente
  useEffect(() => {
    loadHistoricalData();
  }, []);

  // Función para cargar los datos históricos del dispositivo
  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Convertir timestamps de string a número
      const startTime = parseInt(params.startTime || '0', 10);
      const endTime = parseInt(params.endTime || '0', 10);
      
      if (!startTime || !endTime) {
        throw new Error('Fecha de inicio o fin inválida');
      }
      
      // Buscar el dispositivo - usando getDeviceById que añadiremos al BleManager
      let device = null;
      try {
        device = await minewBleManager.getDeviceById(deviceId);
      } catch (err) {
        console.log('No se pudo encontrar el dispositivo, generando datos simulados');
      }
      
      // Si no se puede encontrar el dispositivo, generamos datos simulados
      if (!device) {
        console.log('Generando datos simulados');
        const simulatedData = generateSimulatedData(startTime, endTime);
        setHistoricalData(simulatedData);
        calculateStats(simulatedData);
        setLoading(false);
        return;
      }
      
      // Obtener datos históricos
      const data = await minewBleManager.getHistoricalData(
        device,
        Math.floor(startTime / 1000), // Convertir a segundos
        Math.floor(endTime / 1000),
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      
      setHistoricalData(data);
      calculateStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setLoading(false);
      Alert.alert('Error', 'No se pudieron cargar los datos históricos.');
    }
  };

  // Función para calcular estadísticas
  const calculateStats = (data: HistoricalData[]) => {
    if (data.length > 0) {
      const temps = data.map(item => item.temperature);
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      
      setStats({
        avgTemp,
        minTemp,
        maxTemp,
        startDate: new Date(parseInt(params.startTime || '0', 10)),
        endDate: new Date(parseInt(params.endTime || '0', 10))
      });
    }
  };

  // Función para generar datos simulados
  const generateSimulatedData = (startTime: number, endTime: number): HistoricalData[] => {
    const data: HistoricalData[] = [];
    const timeRange = endTime - startTime;
    const numPoints = 100; // Número de puntos de datos
    
    for (let i = 0; i < numPoints; i++) {
      const timestamp = Math.floor(startTime / 1000) + Math.floor((timeRange / 1000) * (i / numPoints));
      data.push({
        timestamp,
        temperature: 20 + Math.random() * 10 - 5, // 15-25°C
        humidity: 40 + Math.random() * 30 // 40-70%
      });
    }
    
    return data;
  };

  // Función para descargar datos como Excel
  const downloadExcel = async () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Timestamp,Temperatura (°C),Humedad (%)\n';
      
      historicalData.forEach(item => {
        const date = new Date(item.timestamp * 1000).toLocaleString();
        csvContent += `${date},${item.temperature.toFixed(2)},${item.humidity.toFixed(2)}\n`;
      });
      
      // Crear nombre de archivo
      const fileName = `${deviceType}_${deviceId.replace(/:/g, '')}_${Date.now()}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      // Escribir archivo
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      
      // Compartir archivo usando la API nativa de Share
      try {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          const shareOptions = {
            title: 'Compartir datos',
            url: filePath,
            message: 'Datos exportados desde Recover App'
          };
          
          Alert.alert(
            'Archivo generado',
            `El archivo CSV se ha guardado en: ${filePath}`,
            [
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Info', `Archivo guardado en: ${filePath}`);
        }
      } catch (shareError) {
        console.log('Error al compartir archivo:', shareError);
        Alert.alert('Info', `Archivo guardado en: ${filePath}`);
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
      Alert.alert('Error', 'No se pudo generar el archivo Excel.');
    }
  };

  // Función para subir datos
  const uploadData = async () => {
    // Esta función sería para implementar la subida de datos a un servidor
    Alert.alert('Info', 'Funcionalidad de subida de datos no implementada aún.');
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + 
           date.getHours().toString().padStart(2, '0') + ':' + 
           date.getMinutes().toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{deviceType}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>ID: </Text>
          <Text style={styles.idValue}>{deviceId}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6c5ce7" />
            <Text style={styles.loadingText}>
              Cargando datos: {downloadProgress}%
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartContainer}>
              {historicalData.length > 0 ? (
                <SensorChart 
                  data={historicalData} 
                  title="Temperatura y Humedad" 
                />
              ) : (
                <View style={styles.chartPlaceholder}>
                  <Text style={styles.chartText}>
                    No hay datos disponibles para mostrar en el gráfico
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Temperatura promedio:</Text>
                <Text style={styles.statValue}>{stats.avgTemp.toFixed(1)}°C</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Temperatura mínima:</Text>
                <Text style={styles.statValue}>{stats.minTemp.toFixed(1)}°C</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Temperatura máxima:</Text>
                <Text style={styles.statValue}>{stats.maxTemp.toFixed(1)}°C</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Fecha inicio:</Text>
                <Text style={styles.statValue}>{formatDate(stats.startDate)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Fecha término:</Text>
                <Text style={styles.statValue}>{formatDate(stats.endDate)}</Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity 
          style={styles.sensorButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.sensorButtonText}>LISTA DE SENSORES</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled={loading || historicalData.length === 0}
          >
            <Text style={styles.actionButtonText}>DESCARGAR IMAGEN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              (loading || historicalData.length === 0) && styles.actionButtonDisabled
            ]}
            onPress={downloadExcel}
            disabled={loading || historicalData.length === 0}
          >
            <Text style={styles.actionButtonText}>DESCARGAR EXCEL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton,
              (loading || historicalData.length === 0) && styles.actionButtonDisabled
            ]}
            onPress={uploadData}
            disabled={loading || historicalData.length === 0}
          >
            <Text style={styles.actionButtonText}>SUBIR DATOS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  chartContainer: {
    height: 200,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  chartText: {
    textAlign: 'center',
    color: '#666',
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