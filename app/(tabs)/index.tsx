import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Platform, PermissionsAndroid, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { ConnectingModal } from '@/components/ConnectingModal';
import { DateRangePicker } from '@/components/DateRangePicker';
import { TimePicker } from '@/components/TimePicker';
import { Buffer } from 'buffer';

const bleManager = new BleManager();

// Standard BLE Service and Characteristic UUIDs
const ENVIRONMENTAL_SENSING_SERVICE = '0000181a-0000-1000-8000-00805f9b34fb';
const TEMPERATURE_CHARACTERISTIC = '00002a6e-0000-1000-8000-00805f9b34fb';
const HUMIDITY_CHARACTERISTIC = '00002a6f-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL_CHARACTERISTIC = '00002a19-0000-1000-8000-00805f9b34fb';

interface SensorDevice {
  id: string;
  name: string;
  batteryLevel?: string;
  temperature?: string;
  humidity?: string;
}

export default function DeviceList() {
  const router = useRouter();
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SensorDevice | null>(null);
  const [showConnecting, setShowConnecting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Solicitar permisos en Android
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
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
    }
    return true;
  };

  // Escanear dispositivos BLE
  const scanDevices = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      Alert.alert('Error', 'Se requieren permisos de Bluetooth y ubicación para escanear dispositivos.');
      return;
    }

    setIsScanning(true);
    setDevices([]); // Limpiar la lista antes de un nuevo escaneo

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        setIsScanning(false);
        Alert.alert('Error', 'No se pudo escanear dispositivos. Asegúrate de que Bluetooth esté activado.');
        return;
      }

      // Filtrar dispositivos Minew MST01
      if (device && (device.name?.includes('Minew') || device.name?.includes('MST01'))) {
        const sensorDevice: SensorDevice = {
          id: device.id,
          name: device.name || 'MST01 Sensor',
          batteryLevel: 'N/A',
          temperature: 'N/A',
          humidity: 'N/A',
        };

        setDevices((prev) => {
          if (!prev.some((d) => d.id === sensorDevice.id)) {
            return [...prev, sensorDevice];
          }
          return prev;
        });
      }
    });

    // Detener el escaneo después de 10 segundos
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  // Conectar y leer datos del sensor
  const readSensorData = async (device: Device): Promise<SensorDevice> => {
    try {
      // Conectar al dispositivo
      await device.connect();
      await device.discoverAllServicesAndCharacteristics();

      // Leer temperatura
      let temperature = 'N/A';
      try {
        const tempChars = await device.characteristicsForService(ENVIRONMENTAL_SENSING_SERVICE);
        const tempChar = tempChars.find((char) => char.uuid === TEMPERATURE_CHARACTERISTIC);
        if (tempChar) {
          const data = await tempChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const tempValue = buffer.readInt16LE(0) / 100; // Formato estándar: °C * 100
          temperature = `${tempValue.toFixed(2)}°C`;
        }
      } catch (error) {
        console.warn('Error leyendo temperatura:', error);
      }

      // Leer humedad
      let humidity = 'N/A';
      try {
        const humChars = await device.characteristicsForService(ENVIRONMENTAL_SENSING_SERVICE);
        const humChar = humChars.find((char) => char.uuid === HUMIDITY_CHARACTERISTIC);
        if (humChar) {
          const data = await humChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const humValue = buffer.readUInt16LE(0) / 100; // Formato estándar: %RH * 100
          humidity = `${humValue.toFixed(2)}%`;
        }
      } catch (error) {
        console.warn('Error leyendo humedad:', error);
      }

      // Leer nivel de batería
      let batteryLevel = 'N/A';
      try {
        const batChars = await device.characteristicsForService(BATTERY_SERVICE);
        const batChar = batChars.find((char) => char.uuid === BATTERY_LEVEL_CHARACTERISTIC);
        if (batChar) {
          const data = await batChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const batValue = buffer.readUInt8(0); // Formato estándar: porcentaje
          batteryLevel = `${batValue}%`;
        }
      } catch (error) {
        console.warn('Error leyendo batería:', error);
      }

      // Desconectar después de leer
      await device.cancelConnection();

      return {
        id: device.id,
        name: device.name || 'MST01 Sensor',
        temperature,
        humidity,
        batteryLevel,
      };
    } catch (error) {
      console.error('Error conectando al dispositivo:', error);
      await device.cancelConnection();
      return {
        id: device.id,
        name: device.name || 'MST01 Sensor',
        temperature: 'N/A',
        humidity: 'N/A',
        batteryLevel: 'N/A',
      };
    }
  };

  // Manejar selección de dispositivo
  const handleDeviceSelect = async (deviceId: string) => {
    const device = await bleManager.devices([deviceId]).then((devices) => devices[0]);
    if (!device) {
      Alert.alert('Error', 'Dispositivo no encontrado.');
      return;
    }

    setShowConnecting(true);
    const sensorData = await readSensorData(device);
    setSelectedDevice(sensorData);
    setDevices((prev) =>
      prev.map((d) => (d.id === sensorData.id ? sensorData : d))
    );

    setTimeout(() => {
      setShowConnecting(false);
      setShowDatePicker(true);
    }, 2000);
  };

  const handleDateSelect = (startDate: Date, endDate: Date) => {
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    setShowTimePicker(false);
    if (selectedDevice) {
      router.push(`/device/${selectedDevice.id}`);
    }
  };

  const renderDevice = ({ item }: { item: SensorDevice }) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => handleDeviceSelect(item.id)}
    >
      <View>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={styles.deviceBattery}>Batería: {item.batteryLevel}</Text>
        <Text style={styles.deviceTemp}>T°: {item.temperature}</Text>
        <Text style={styles.deviceHumidity}>Humedad: {item.humidity}</Text>
      </View>
      <Ionicons name="chevron-forward" color="#666" size={24} />
    </TouchableOpacity>
  );

  // Iniciar escaneo al montar
  useEffect(() => {
    scanDevices();

    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
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
          <TouchableOpacity 
            onPress={scanDevices} 
            style={styles.backButton}
            disabled={isScanning}
          >
            <Ionicons name="bluetooth" color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" color="#666" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busque por ID o nombre..."
            placeholderTextColor="#666"
          />
        </View>

        {isScanning && <Text style={styles.scanningText}>Escaneando dispositivos...</Text>}

        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text>No se encontraron dispositivos.</Text>}
        />
      </View>

      <ConnectingModal 
        visible={showConnecting} 
        deviceName={selectedDevice?.name || ''} 
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
  scanningText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
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
});