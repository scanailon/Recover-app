import { BleManager, Device, Characteristic, LogLevel, State } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

// UUIDs de servicio y características estándar para los sensores Minew
const ENVIRONMENTAL_SENSING_SERVICE = '0000181a-0000-1000-8000-00805f9b34fb';
const TEMPERATURE_CHARACTERISTIC = '00002a6e-0000-1000-8000-00805f9b34fb';
const HUMIDITY_CHARACTERISTIC = '00002a6f-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL_CHARACTERISTIC = '00002a19-0000-1000-8000-00805f9b34fb';

// Claves secretas para los sensores Minew
const SECRET_KEYS = ['minewtech1234567', '3141592653589793'];

// Interfaz para datos del sensor
export interface SensorData {
  id: string;
  name: string;
  batteryLevel?: string;
  temperature?: string;
  humidity?: string;
  macAddress?: string;
  type?: 'MST01' | 'MST03';
}

// Interfaz para datos históricos
export interface HistoricalData {
  timestamp: number;
  temperature: number;
  humidity: number;
}

// Para iOS: creamos un único manager compartido para toda la aplicación
// Esto evita el error de CBCentralManager
let sharedBleManager: BleManager | null = null;

class MinewBleManager {
  public manager: BleManager;
  private scanning: boolean = false;
  private connectedDevice: Device | null = null;
  private isInstalling: boolean = false;
  private hasInitialized: boolean = false;
  private powerOnListener: ((state: State) => void) | null = null;

  // Constructor
  constructor() {
    // Para iOS, usamos un singleton para el manager de BLE
    if (Platform.OS === 'ios') {
      if (!sharedBleManager) {
        console.log('Creando un nuevo BleManager para iOS...');
        
        // En iOS, usamos opciones mínimas para evitar problemas de inicialización
        sharedBleManager = new BleManager({
          // IMPORTANTE: Evitar usar restoreStateIdentifier en iOS para prevenir errores
        });
        
        console.log('BleManager para iOS creado correctamente');
      } else {
        console.log('Usando BleManager existente para iOS');
      }
      
      this.manager = sharedBleManager;
    } else {
      // En Android, creamos un nuevo manager normalmente
      this.manager = new BleManager();
    }
  }

  // Inicializar y limpiar recursos
  async initialize(): Promise<boolean> {
    // Si ya está inicializado, no hacer nada
    if (this.hasInitialized) {
      console.log('BleManager ya inicializado');
      return true;
    }
    
    try {
      console.log('Inicializando BleManager...');
      
      // Verificar estado actual del Bluetooth
      const currentState = await this.manager.state();
      console.log(`Estado actual del Bluetooth: ${currentState}`);
      
      // Si ya está encendido, marcamos como inicializado
      if (currentState === State.PoweredOn) {
        console.log('Bluetooth ya está encendido');
        this.hasInitialized = true;
        return true;
      }
      
      // Esperar a que el Bluetooth se encienda
      return new Promise<boolean>((resolve) => {
        // Establecer un timeout para resolver después de 5 segundos incluso si no hay cambio de estado
        const timeout = setTimeout(() => {
          console.log('Timeout esperando al Bluetooth - continuando de todos modos');
          if (this.powerOnListener) {
            this.powerOnListener = null;
          }
          this.hasInitialized = true;
          resolve(false);
        }, 5000);
        
        // Escuchar cambios de estado
        this.powerOnListener = (state) => {
          console.log(`Cambio de estado Bluetooth: ${state}`);
          if (state === State.PoweredOn) {
            clearTimeout(timeout);
            console.log('Bluetooth encendido y listo');
            this.hasInitialized = true;
            if (this.powerOnListener) {
              this.powerOnListener = null;
            }
            resolve(true);
          }
        };
        
        // Iniciar la escucha de estados
        this.manager.onStateChange(this.powerOnListener, true);
      });
    } catch (error) {
      console.error('Error inicializando BLE Manager:', error);
      this.hasInitialized = true; // Marcamos como inicializado para evitar reintentos
      return false;
    }
  }

  destroy() {
    try {
      this.stopScan();
      if (this.connectedDevice) {
        this.disconnect(this.connectedDevice.id);
      }
      
      // En iOS, no destruimos el manager, solo lo limpiamos
      if (Platform.OS !== 'ios') {
        this.manager.destroy();
      }
      
      this.hasInitialized = false;
    } catch (error) {
      console.error('Error al destruir BLE Manager:', error);
    }
  }

  // Escanear dispositivos Minew
  async startScan(
    onDeviceFound: (device: SensorData) => void,
    onError: (error: Error) => void
  ) {
    try {
      if (this.scanning) {
        console.log('Ya está escaneando - ignorando solicitud');
        return;
      }
      
      // Asegurar que el manager esté inicializado
      const isReady = await this.initialize();
      if (!isReady && Platform.OS === 'ios') {
        onError(new Error('Bluetooth no está listo. Por favor, verifica que esté activado en la configuración.'));
        return;
      }
      
      // Verificar estado de Bluetooth directamente
      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        console.log(`Bluetooth no está encendido (estado: ${state}). Ignorando solicitud de escaneo.`);
        onError(new Error(`Bluetooth no está encendido. Estado actual: ${state}`));
        return;
      }
      
      this.scanning = true;
      console.log('Iniciando escaneo BLE...');
      
      // Configuraciones específicas para iOS
      const options = Platform.OS === 'ios' 
        ? { 
            allowDuplicates: false,  // Evitar duplicados en iOS
            scanMode: 1              // Low power mode para iOS
          } 
        : null;
      
      // Manejar errores y dispositivos nulos
      const handleError = (error: Error | null) => {
        if (error) {
          console.error('Error durante escaneo:', error);
          this.scanning = false;
          onError(error);
        }
      };
      
      const handleDevice = (device: Device | null) => {
        if (!device) {
          return; // Ignorar resultados nulos
        }

        try {
          // Filtrar dispositivos Minew
          if (this.isMinewDevice(device)) {
            const type = this.detectDeviceType(device);
            
            // Crear un nombre claro que incluya el tipo de dispositivo
            let displayName = '';
            if (device.name) {
              if (device.name.includes('MST01') || device.name.includes('MST03')) {
                displayName = device.name;
              } else {
                displayName = `${type} - ${device.name}`;
              }
            } else {
              const shortMac = device.id.substring(device.id.length - 8);
              displayName = `${type} - ${shortMac}`;
            }
            
            const sensorData: SensorData = {
              id: device.id,
              name: displayName,
              batteryLevel: 'N/A',
              temperature: 'N/A',
              humidity: 'N/A',
              macAddress: device.id,
              type: type
            };
            
            onDeviceFound(sensorData);
          }
        } catch (e) {
          console.error('Error procesando dispositivo:', e);
        }
      };
      
      // Iniciar escaneo con opciones mejoradas y try/catch adicional
      try {
        this.manager.startDeviceScan(null, options, (error, device) => {
          try {
            handleError(error);
            handleDevice(device);
          } catch (e) {
            console.error('Error en callback de escaneo:', e);
          }
        });
      } catch (e) {
        console.error('Error al iniciar escaneo:', e);
        this.scanning = false;
        onError(new Error(`Error al iniciar escaneo: ${e.message}`));
        return;
      }

      // Detener después de un tiempo para conservar batería
      const scanTime = Platform.OS === 'ios' ? 10000 : 30000; // Reducir tiempo en iOS
      setTimeout(() => {
        this.stopScan();
      }, scanTime);
      
    } catch (error) {
      console.error('Error general iniciando escaneo BLE:', error);
      this.scanning = false;
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  stopScan() {
    if (this.scanning) {
      try {
        this.manager.stopDeviceScan();
        console.log('Escaneo BLE detenido');
      } catch (e) {
        console.error('Error al detener escaneo:', e);
      }
      this.scanning = false;
    }
  }

  // Verificar si es un dispositivo Minew
  // Verificar si es un dispositivo Minew
  private isMinewDevice(device: Device): boolean {
    try {
      const name = device.name || '';
      const id = device.id || '';
      
      // Más información de depuración detallada
      console.log(`Evaluando dispositivo - ID: ${id}, Nombre: ${name}, RSSI: ${device.rssi}, Datos adicionales: ${device.manufacturerData ? 'Sí' : 'No'}`);
      
      // Primero probamos con criterios más específicos para MST01 y MST03
      const isMST01orMST03 = 
        name.includes('MST01') || 
        name.includes('MST03') || 
        name.includes('Minew') ||
        name.includes('Recover') ||
        // MAC específicas de dispositivos MST01 y MST03 (ajusta estas según tus dispositivos)
        id.toUpperCase().startsWith('C3:') ||
        id.toUpperCase().includes(':00:00:');
      
      if (isMST01orMST03) {
        console.log(`✅ Dispositivo Minew MST identificado: ${id} (${name})`);
        return true;
      }
      
      // Si tiene datos de fabricante, podemos intentar analizarlos para identificar por ellos
      if (device.manufacturerData) {
        try {
          // Los dispositivos Minew suelen tener un patrón específico en manufacturerData
          // Esto requeriría conocer el formato exacto de los datos del fabricante
          const hexData = Buffer.from(device.manufacturerData, 'base64').toString('hex');
          console.log(`Datos del fabricante: ${hexData}`);
          
          // Verificar si contiene algún patrón específico de Minew
          // Estos patrones deberían ajustarse basándose en los dispositivos reales
          if (hexData.includes('4d494e4557') || // "MINEW" en hex
              hexData.includes('4d535430')) {   // "MST0" en hex
            console.log(`✅ Dispositivo Minew identificado por datos del fabricante: ${id}`);
            return true;
          }
        } catch (e) {
          console.warn('Error al analizar datos del fabricante:', e);
        }
      }
      
      // Si está en el rango de direcciones MAC que sabemos que pertenecen a Minew
      // Puedes añadir aquí las direcciones MAC específicas de tus dispositivos
      const knownMinewMACPrefixes = [
        'C3:00:00:', // Ejemplo - ajusta con tus prefijos reales
        'C3:01:',
        'C4:00:'
        // Añade más prefijos según sea necesario
      ];
      
      const matchesKnownMAC = knownMinewMACPrefixes.some(prefix => 
        id.toUpperCase().startsWith(prefix)
      );
      
      if (matchesKnownMAC) {
        console.log(`✅ Dispositivo Minew identificado por MAC conocida: ${id}`);
        return true;
      }
      
      // Como última opción, si tiene una intensidad de señal razonable y está sin nombre
      if (typeof device.rssi === 'number' && device.rssi > -80 && device.rssi < -30 && name === '') {
        console.log(`⚠️ Posible dispositivo Minew (sin nombre, RSSI en rango): ${id}`);
        // Devolver false aquí si quieres ser más estricto
        return false; 
      }
      
      return false;
    } catch (e) {
      console.error('Error al verificar dispositivo Minew:', e);
      return false;
    }
  }

  // Detectar si es MST01 o MST03
  private detectDeviceType(device: Device): 'MST01' | 'MST03' {
    try {
      const name = device.name || '';
      const id = device.id || '';
      
      // Lista de patrones MST03
      const mst03Patterns = [
        'MST03',
        'Recover 03',
        'C3:00:03:',
        'C3:00:00:1B:4F:A0'  // Añade aquí MAC específicas de tus MST03
      ];
      
      // Comprobamos patrones MST03
      const isMST03 = mst03Patterns.some(pattern => {
        return id.toUpperCase().includes(pattern.toUpperCase()) || 
               name.toUpperCase().includes(pattern.toUpperCase());
      });
      
      if (isMST03) {
        return 'MST03';
      }
      
      return 'MST01';  // Por defecto, asumimos MST01
    } catch (e) {
      console.error('Error al detectar tipo de dispositivo:', e);
      return 'MST01';  // Si hay error, asumimos MST01
    }
  }

  // Método para obtener un dispositivo por su ID
  async getDeviceById(deviceId: string): Promise<Device | null> {
    try {
      // Primero intentamos dispositivos conectados
      try {
        const connectedDevices = await this.manager.connectedDevices([]);
        const connectedDevice = connectedDevices.find(d => d.id === deviceId);
        if (connectedDevice) {
          return connectedDevice;
        }
      } catch (e) {
        console.warn('Error al buscar dispositivos conectados:', e);
      }
      
      // Luego a través del manager
      try {
        const devices = await this.manager.devices([deviceId]);
        return devices.length > 0 ? devices[0] : null;
      } catch (e) {
        console.warn('Error al buscar dispositivo por ID:', e);
        return null;
      }
    } catch (error) {
      console.error('Error general obteniendo dispositivo por ID:', error);
      return null;
    }
  }

  // Conectar a un dispositivo
  async connect(deviceId: string, onConnectState: (state: string) => void): Promise<Device> {
    try {
      onConnectState('connecting');
      
      // Intentar conectar
      const device = await this.manager.connectToDevice(deviceId);
      onConnectState('connected');
      
      // Descubrir servicios y características
      await device.discoverAllServicesAndCharacteristics();
      onConnectState('discovered');
      
      this.connectedDevice = device;
      
      return device;
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw error;
    }
  }

  // Desconectar dispositivo
  async disconnect(deviceId: string): Promise<void> {
    try {
      // Verificar conexión actual
      let isConnected = false;
      try {
        const connectedDevices = await this.manager.connectedDevices([]);
        isConnected = connectedDevices.some(d => d.id === deviceId);
      } catch (e) {
        console.warn('Error al verificar dispositivos conectados:', e);
      }
      
      if (isConnected) {
        await this.manager.cancelDeviceConnection(deviceId);
        console.log(`Dispositivo ${deviceId} desconectado correctamente`);
      } else {
        console.log(`Dispositivo ${deviceId} ya está desconectado`);
      }
      
      this.connectedDevice = null;
    } catch (error) {
      console.error('Error al desconectar dispositivo:', error);
      this.connectedDevice = null;
    }
  }

  // Intentar autenticación con múltiples claves
  async authenticate(device: Device, onAuthState: (state: string) => void): Promise<boolean> {
    for (const key of SECRET_KEYS) {
      try {
        onAuthState(`Trying key: ${key}`);
        // Simulación de autenticación - implementación real requeriría interacción con el dispositivo
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onAuthState('authenticated');
        return true;
      } catch (error) {
        console.log(`Authentication failed with key: ${key}`);
      }
    }
    
    onAuthState('authentication_failed');
    return false;
  }

  // Leer datos del sensor
  async readSensorData(device: Device): Promise<SensorData> {
    try {
      const sensorData: SensorData = {
        id: device.id,
        name: device.name || 'Minew Sensor',
        macAddress: device.id,
        type: this.detectDeviceType(device)
      };
      
      // Leer temperatura
      try {
        const tempChar = await this.findCharacteristic(
          device, 
          ENVIRONMENTAL_SENSING_SERVICE, 
          TEMPERATURE_CHARACTERISTIC
        );
        
        if (tempChar) {
          const data = await tempChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const tempValue = buffer.readInt16LE(0) / 100;
          sensorData.temperature = `${tempValue.toFixed(2)}°C`;
        }
      } catch (error) {
        console.warn('Error reading temperature:', error);
        sensorData.temperature = 'Error';
      }
      
      // Leer humedad
      try {
        const humChar = await this.findCharacteristic(
          device, 
          ENVIRONMENTAL_SENSING_SERVICE, 
          HUMIDITY_CHARACTERISTIC
        );
        
        if (humChar) {
          const data = await humChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const humValue = buffer.readUInt16LE(0) / 100;
          sensorData.humidity = `${humValue.toFixed(2)}%`;
        }
      } catch (error) {
        console.warn('Error reading humidity:', error);
        sensorData.humidity = 'Error';
      }
      
      // Leer batería
      try {
        const batChar = await this.findCharacteristic(
          device, 
          BATTERY_SERVICE, 
          BATTERY_LEVEL_CHARACTERISTIC
        );
        
        if (batChar) {
          const data = await batChar.read();
          const buffer = Buffer.from(data.value!, 'base64');
          const batValue = buffer.readUInt8(0);
          sensorData.batteryLevel = `${batValue}%`;
        }
      } catch (error) {
        console.warn('Error reading battery:', error);
        sensorData.batteryLevel = 'Error';
      }
      
      return sensorData;
    } catch (error) {
      console.error('Error reading sensor data:', error);
      throw error;
    }
  }

  // Obtener historial de datos entre fechas
  async getHistoricalData(
    device: Device, 
    startTimestamp: number, 
    endTimestamp: number,
    onProgress: (progress: number) => void
  ): Promise<HistoricalData[]> {
    try {
      // Implementación simulada
      const historicalData: HistoricalData[] = [];
      
      const totalPoints = 100;
      for (let i = 0; i < totalPoints; i++) {
        onProgress(Math.floor((i / totalPoints) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const timestamp = startTimestamp + Math.floor((endTimestamp - startTimestamp) * (i / totalPoints));
        historicalData.push({
          timestamp,
          temperature: 20 + Math.random() * 5,
          humidity: 40 + Math.random() * 20
        });
      }
      
      onProgress(100);
      return historicalData;
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  // Método auxiliar para encontrar características
  private async findCharacteristic(
    device: Device,
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<Characteristic | null> {
    try {
      const services = await device.services();
      
      for (const service of services) {
        if (service.uuid.toLowerCase() === serviceUUID.toLowerCase()) {
          const characteristics = await service.characteristics();
          
          for (const characteristic of characteristics) {
            if (characteristic.uuid.toLowerCase() === characteristicUUID.toLowerCase()) {
              return characteristic;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding characteristic:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const minewBleManager = new MinewBleManager();