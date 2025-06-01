import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { minewBleManager, SensorData } from '@/BleManager';
import { ConnectingModal } from '@/components/ConnectingModal';
import { DateRangePicker } from '@/components/DateRangePicker';
import { TimePicker } from '@/components/TimePicker';

export default function DeviceList() {
  const router = useRouter();
  const [devices, setDevices] = useState<SensorData[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<SensorData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SensorData | null>(null);
  const [showConnecting, setShowConnecting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [connectingMessage, setConnectingMessage] = useState('Conectando...');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState(0);
  const [startMinute, setStartMinute] = useState(0);

  // Solicitar permisos en Android y iOS
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Usando el API de permisos actual cuando está disponible
        const { PermissionsAndroid } = require('react-native');
        
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted'
        );
      } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // En iOS, normalmente no necesitas permisos explícitos para BLE
      // pero podrías verificar la configuración de Bluetooth
      return true;
    }
    return true;
  };

  // Filtrar dispositivos basados en texto de búsqueda
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredDevices(devices);
      return;
    }
    
    const lowercaseSearch = searchText.toLowerCase();
    const filtered = devices.filter(device => {
      return (
        device.name.toLowerCase().includes(lowercaseSearch) ||
        device.id.toLowerCase().replace(/:/g, '').includes(lowercaseSearch)
      );
    });
    
    setFilteredDevices(filtered);
  }, [searchText, devices]);

  // Escanear dispositivos BLE
  const scanDevices = async () => {
    try {
      setIsScanning(true);
      
      // Solicitar permisos primero
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setIsScanning(false);
        Alert.alert(
          'Error', 
          'Se requieren permisos de Bluetooth y ubicación para escanear dispositivos.'
        );
        return;
      }
      
      // Limpiar las listas antes de un nuevo escaneo
      setDevices([]);
      setFilteredDevices([]);

      // Crear un conjunto para rastrear dispositivos únicos por ID
      const deviceMap = new Map();

      // Iniciar escaneo con callbacks mejorados y más manejo de errores
      minewBleManager.startScan(
        (device) => {
          console.log('Dispositivo encontrado:', device.id, device.name, device.type);
          
          // Usar Map para manejar dispositivos únicos
          deviceMap.set(device.id, device);
          
          // Actualizar el estado con todos los dispositivos únicos
          const uniqueDevices = Array.from(deviceMap.values());
          setDevices(uniqueDevices);
          setFilteredDevices(uniqueDevices);
        },
        (error) => {
          console.error('Error de escaneo:', error);
          setIsScanning(false);
          
          if (Platform.OS === 'ios' && error.message?.includes('state')) {
            // Error específico de iOS - Bluetooth no está activado
            Alert.alert(
              'Bluetooth Desactivado', 
              'Por favor, active Bluetooth en la configuración de su dispositivo para escanear sensores.',
              [
                { text: 'OK' }
              ]
            );
          } else {
            Alert.alert(
              'Error', 
              'No se pudo escanear dispositivos. Asegúrate de que Bluetooth esté activado.'
            );
          }
        }
      );

      // Tiempo de escaneo adaptado a la plataforma
      const scanTime = Platform.OS === 'ios' ? 12000 : 15000;
      setTimeout(() => {
        const uniqueDevices = Array.from(deviceMap.values());
        console.log('Escaneo finalizado, encontrados:', uniqueDevices.length, 'dispositivos');
        stopScan();
      }, scanTime);
      
    } catch (error) {
      console.error('Error general al iniciar escaneo:', error);
      setIsScanning(false);
      Alert.alert('Error', 'Ocurrió un error al iniciar el escaneo de dispositivos.');
    }
  };

  // Detener escaneo
  const stopScan = useCallback(() => {
    minewBleManager.stopScan();
    setIsScanning(false);
  }, []);

  // Conectar a un dispositivo seleccionado
  const handleDeviceSelect = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      Alert.alert('Error', 'Dispositivo no encontrado.');
      return;
    }

    setSelectedDevice(device);
    setShowConnecting(true);
    setConnectingMessage(`Conectando a ${device.name}...`);

    try {
      // Conectar al dispositivo
      await minewBleManager.connect(
        device.id,
        (state) => {
          switch (state) {
            case 'connecting':
              setConnectingMessage(`Conectando a ${device.name}...`);
              break;
            case 'connected':
              setConnectingMessage(`Conectado a ${device.name}, descubriendo servicios...`);
              break;
            case 'discovered':
              setConnectingMessage(`Leyendo datos del sensor...`);
              break;
            case 'authenticated':
              setConnectingMessage(`Autenticación exitosa...`);
              break;
            default:
              setConnectingMessage(`Estado: ${state}`);
          }
        }
      );

      // Leer datos actuales del sensor después de conectar
      const bleDevice = await minewBleManager.getDeviceById(device.id);
      if (bleDevice) {
        const updatedData = await minewBleManager.readSensorData(bleDevice);
        
        // Actualizar el dispositivo en la lista con los nuevos datos
        setDevices(prev => 
          prev.map(d => d.id === updatedData.id ? updatedData : d)
        );
        setSelectedDevice(updatedData);
      }

      // Mostrar el selector de fechas
      setTimeout(() => {
        setShowConnecting(false);
        setShowDatePicker(true);
      }, 1000);
    } catch (error) {
      console.error('Error connecting to device:', error);
      setShowConnecting(false);
      Alert.alert('Error', 'No se pudo conectar al dispositivo. Inténtalo de nuevo.');
    }
  };

  // Manejar la selección de fechas
  const handleDateSelect = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  // Manejar la selección de hora
  const handleTimeSelect = (hour: number, minute: number) => {
    setStartHour(hour);
    setStartMinute(minute);
    setShowTimePicker(false);
    
    if (selectedDevice && startDate && endDate) {
      // Combinar fecha y hora
      const startDateTime = new Date(startDate);
      startDateTime.setHours(hour, minute);
      
      // Navegar a la pantalla de detalles del dispositivo
      const deviceId = selectedDevice.id;
      const startTimeStr = startDateTime.getTime().toString();
      const endTimeStr = endDate.getTime().toString();
      const deviceType = selectedDevice.type || 'MST01';
      
      // Usar la sintaxis correcta para expo-router
      router.push({
        pathname: "/device/[id]",
        params: {
          id: deviceId,
          startTime: startTimeStr,
          endTime: endTimeStr,
          deviceType: deviceType
        }
      });
    }
  };

  // Renderizar un dispositivo en la lista
  const renderDevice = ({ item }: { item: SensorData }) => (
    <TouchableOpacity 
      style={[
        styles.deviceItem,
        // Añadimos un borde distinto según el tipo de dispositivo
        item.type === 'MST03' ? styles.deviceItemMST03 : styles.deviceItemMST01
      ]}
      onPress={() => handleDeviceSelect(item.id)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={styles.deviceBattery}>Batería: {item.batteryLevel}</Text>
        <Text style={styles.deviceTemp}>T°: {item.temperature}</Text>
        <Text style={styles.deviceHumidity}>Humedad: {item.humidity}</Text>
      </View>
      <View style={styles.deviceActions}>
        <View style={[
          styles.deviceTypeIndicator, 
          item.type === 'MST03' ? styles.deviceTypeMST03 : styles.deviceTypeMST01
        ]}>
          <Text style={styles.deviceTypeText}>{item.type}</Text>
        </View>
        <Ionicons name="chevron-forward" color="#666" size={24} />
      </View>
    </TouchableOpacity>
  );

  // Inicializar y limpiar recursos BLE
  useEffect(() => {
    const initBLE = async () => {
      try {
        console.log('Inicializando BLE Manager...');
        await minewBleManager.initialize();
        console.log('BLE Manager inicializado correctamente');
        
        // En iOS, necesitamos esperar más tiempo antes de iniciar el escaneo
        const timer = setTimeout(() => {
          console.log('Iniciando escaneo después del retraso...');
          scanDevices();
        }, Platform.OS === 'ios' ? 2000 : 500);
        
        return () => {
          clearTimeout(timer);
        };
      } catch (error) {
        console.error('Error en la inicialización del BLE:', error);
      }
    };
    
    initBLE();

    return () => {
      stopScan();
      try {
        console.log('Limpiando BLE Manager...');
        minewBleManager.destroy();
      } catch (error) {
        console.error('Error al limpiar BLE Manager:', error);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/login')} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Sensores</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={() => router.push('/qr-scanner')} 
              style={styles.iconButton}
            >
              <Ionicons name="qr-code" color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={scanDevices} 
              style={styles.iconButton}
              disabled={isScanning}
            >
              <Ionicons name="bluetooth" color="#fff" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" color="#666" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busque por ID o nombre..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {isScanning && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="small" color="#6c5ce7" />
            <Text style={styles.scanningText}>Escaneando dispositivos...</Text>
          </View>
        )}

        <FlatList
          data={filteredDevices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>
              {isScanning 
                ? 'Buscando dispositivos...' 
                : 'No se encontraron dispositivos. Intente escanear de nuevo o use el código QR.'}
            </Text>
          }
        />
      </View>

      <ConnectingModal 
        visible={showConnecting} 
        deviceName={connectingMessage} 
      />
      
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelect}
      />

      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={handleTimeSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    backgroundColor: '#6c5ce7',
    paddingTop: Platform.select({
      ios: 45,
      android: 25,
      default: 40,
    }),
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scanningText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  deviceItemMST01: {
    borderColor: '#6c5ce7', // Púrpura
    borderLeftWidth: 4,
  },
  deviceItemMST03: {
    borderColor: '#00b894', // Verde
    borderLeftWidth: 4,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  deviceTypeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceTypeMST01: {
    backgroundColor: '#6c5ce7', // Púrpura
  },
  deviceTypeMST03: {
    backgroundColor: '#00b894', // Verde
  },
  deviceTypeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceBattery: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceTemp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceHumidity: {
    fontSize: 14,
    color: '#666',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  }
});