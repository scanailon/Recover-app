import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SensorData } from '../BleManager';

export default function QRScannerSimulated() {
  const router = useRouter();
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);

  // Dispositivos simulados para propósitos de prueba
  const simulatedDevices = [
    {
      qrCode: 'MINEW:MST01:C3:00:00:12:34:56',
      type: 'MST01',
      mac: 'C3:00:00:12:34:56',
      name: 'MST01 Sensor de Prueba 1'
    },
    {
      qrCode: 'MINEW:MST03:C3:00:00:AB:CD:EF',
      type: 'MST03',
      mac: 'C3:00:00:AB:CD:EF',
      name: 'MST03 Data Logger de Prueba'
    },
    {
      qrCode: 'MINEW:MST01:C3:00:00:78:90:12',
      type: 'MST01',
      mac: 'C3:00:00:78:90:12',
      name: 'MST01 Sensor de Prueba 2'
    }
  ];

  const handleSimulatedScan = (device: any) => {
    setScanning(true);
    
    // Simular el tiempo de escaneo
    setTimeout(() => {
      setScanning(false);
      
      Alert.alert(
        'Código QR Escaneado',
        `Se ha identificado un ${device.type} con MAC ${device.mac}. ¿Desea continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar', 
            onPress: () => navigateToDevice(device)
          }
        ]
      );
    }, 1500);
  };

  const handleManualInput = () => {
    if (!manualInput.trim()) {
      Alert.alert('Error', 'Por favor, ingrese un código o ID');
      return;
    }

    // Procesar la entrada manual
    let deviceType = 'MST01';
    let deviceMac = '';

    // Detectar tipo de dispositivo en la entrada
    if (manualInput.includes('MST03')) {
      deviceType = 'MST03';
    } else if (manualInput.includes('MST01')) {
      deviceType = 'MST01';
    }

    // Buscar MAC en la entrada
    const macPattern = /([0-9A-F]{2}[:-]){5}([0-9A-F]{2})/i;
    const macMatch = manualInput.match(macPattern);
    
    if (macMatch) {
      deviceMac = macMatch[0];
    } else {
      // Si no hay MAC, generar una basada en la entrada
      const hash = manualInput.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const hex = Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
      deviceMac = `C3:00:${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}:01`;
    }

    const simulatedDevice = {
      type: deviceType,
      mac: deviceMac,
      name: `${deviceType} - Manual`
    };

    Alert.alert(
      'Dispositivo Manual',
      `Se ha creado un ${deviceType} con MAC ${deviceMac}. ¿Desea continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => navigateToDevice(simulatedDevice)
        }
      ]
    );
  };

  const navigateToDevice = (device: any) => {
    // Crear datos de sensor
    const sensorData: SensorData = {
      id: device.mac,
      name: device.name || `${device.type} - ${device.mac.substring(device.mac.length - 8)}`,
      type: device.type as 'MST01' | 'MST03',
      batteryLevel: 'N/A',
      temperature: 'N/A',
      humidity: 'N/A'
    };

    // Navegar a la pantalla del dispositivo con datos simulados
    router.push({
      pathname: "/device/[id]",
      params: {
        id: device.mac,
        deviceType: device.type,
        startTime: (Date.now() - 24 * 60 * 60 * 1000).toString(), // 24 horas atrás
        endTime: Date.now().toString() // Ahora
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Simulador de QR</Text>
        <View style={styles.emptySpace} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrada Manual</Text>
          <Text style={styles.sectionSubtitle}>
            Ingrese un código QR o ID de dispositivo manualmente
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: MINEW:MST01:C3:00:00:12:34:56"
            value={manualInput}
            onChangeText={setManualInput}
            multiline
          />
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleManualInput}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Procesar Entrada Manual</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispositivos de Prueba</Text>
          <Text style={styles.sectionSubtitle}>
            Seleccione uno de estos dispositivos simulados para probar
          </Text>
          
          {simulatedDevices.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.deviceCard,
                device.type === 'MST03' ? styles.deviceCardMST03 : styles.deviceCardMST01
              ]}
              onPress={() => handleSimulatedScan(device)}
              disabled={scanning}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMac}>MAC: {device.mac}</Text>
                <Text style={styles.deviceQR}>QR: {device.qrCode}</Text>
              </View>
              <View style={styles.deviceActions}>
                <View style={[
                  styles.deviceTypeIndicator,
                  device.type === 'MST03' ? styles.deviceTypeMST03 : styles.deviceTypeMST01
                ]}>
                  <Text style={styles.deviceTypeText}>{device.type}</Text>
                </View>
                <Ionicons name="qr-code" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.infoTitle}>Información</Text>
          <Text style={styles.infoText}>
            Esta es una versión simulada del escáner QR para propósitos de desarrollo. 
            Los dispositivos mostrados arriba son ejemplos que generarán datos simulados 
            para probar la funcionalidad de la aplicación.
          </Text>
          <Text style={styles.infoText}>
            Cuando esté listo para producción, puede reemplazar esta pantalla 
            con un escáner QR real.
          </Text>
        </View>
      </ScrollView>

      {scanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningContainer}>
            <Ionicons name="qr-code" size={48} color="#6c5ce7" />
            <Text style={styles.scanningText}>Escaneando...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6c5ce7',
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptySpace: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 60,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6c5ce7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  deviceCardMST01: {
    borderLeftWidth: 4,
    borderLeftColor: '#6c5ce7',
  },
  deviceCardMST03: {
    borderLeftWidth: 4,
    borderLeftColor: '#00b894',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceMac: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceQR: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  deviceActions: {
    alignItems: 'center',
    gap: 8,
  },
  deviceTypeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deviceTypeMST01: {
    backgroundColor: '#6c5ce7',
  },
  deviceTypeMST03: {
    backgroundColor: '#00b894',
  },
  deviceTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  scanningText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});