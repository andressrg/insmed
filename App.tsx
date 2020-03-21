import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Permissions } from 'react-native-unimodules';

function DevicesList({ manager }: { manager: BleManager }) {
  return null;
}

export default function App() {
  const [manager] = React.useState(() => new BleManager());
  const [devices, setDevices] = React.useState<{
    [id: string]: { foundAt: Date; device: Device };
  }>({});

  React.useEffect(() => {
    Permissions.askAsync(Permissions.LOCATION).then(({ status }) => {
      if (status !== 'granted') {
        alert('BLE no autorizado');
        return;
      }

      function scanAndConnect() {
        manager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            // Handle error (scanning will be stopped automatically)
            alert(error);
            return;
          }

          setDevices(state => ({
            ...state,

            [device.id]: {
              foundAt: new Date(),
              device
            }
          }));
        });
      }

      const subscription = manager.onStateChange(state => {
        if (state === 'PoweredOn') {
          scanAndConnect();
          subscription.remove();
        }
      }, true);
    });
  }, [manager]);

  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: 'bold' }}>Nearby BLE devices:</Text>

      <View style={{ height: 20 }} />

      {Object.values(devices).map(({ foundAt, device }) => (
        <Text key={device.id}>{device.name ?? device.id}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
