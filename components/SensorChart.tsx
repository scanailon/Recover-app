import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { HistoricalData } from '@/BleManager';

interface SensorChartProps {
  data: HistoricalData[];
  title?: string;
}

const SensorChart: React.FC<SensorChartProps> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay datos disponibles para mostrar</Text>
      </View>
    );
  }

  // Formatear datos para el gráfico
  const chartData = {
    labels: data.slice(0, 6).map((_, index) => {
      // Crear etiquetas más simples para el eje X
      return `${index}`;
    }),
    datasets: [
      {
        data: data.map(item => item.temperature),
        color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // Rojo para temperatura
        strokeWidth: 2
      },
      {
        data: data.map(item => item.humidity),
        color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`, // Azul para humedad
        strokeWidth: 2
      }
    ],
    legend: ['Temperatura (°C)', 'Humedad (%)']
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 40}
        height={180}
        chartConfig={{
          backgroundColor: '#f5f5f5',
          backgroundGradientFrom: '#f5f5f5',
          backgroundGradientTo: '#f5f5f5',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '3',
            strokeWidth: '1',
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  chart: {
    borderRadius: 8,
    padding: 8,
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default SensorChart;