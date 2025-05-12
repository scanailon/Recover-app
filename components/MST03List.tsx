import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

import { Device } from 'react-native-ble-plx';

type Props = {
  devices: Device[];
  onConnect: (device: Device) => void;
};

export const MST03List = ({ devices, onConnect }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Sensores Recover 03</Text>
      <FlatList
        data={devices}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onConnect(item)} style={styles.item}>
            <Text>{item.name || 'MST03 Desconocido'}</Text>
            <Text>ID: {item.id}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No hay sensores MST03 disponibles.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});