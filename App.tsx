import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Permissions } from 'react-native-unimodules';

function DevicesList({ manager }: { manager: BleManager }) {
  return null;
}

export default function App() {
  const [manager] = React.useState(() => new BleManager());

  const [findDevices, setFindDevices] = React.useState(false);

  const [devices, setDevices] = React.useState<{
    [id: string]: { foundAt: Date; device: Device };
  }>({});

  React.useEffect(() => {
    let deactivators = [];

    if (findDevices) {
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

          deactivators.push(() => manager.stopDeviceScan());
        }

        let stopStateChangeSubscription;

        const subscription = manager.onStateChange(state => {
          deactivators.push(stopStateChangeSubscription);
          if (state === 'PoweredOn') {
            scanAndConnect();
            stopStateChangeSubscription();
            deactivators = deactivators.filter(
              fn => fn !== stopStateChangeSubscription
            );
          }
        }, true);

        stopStateChangeSubscription = () => subscription.remove();
      });
    }

    return () => deactivators.forEach(fn => fn());
  }, [manager, findDevices]);

  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: 'bold' }}>Nearby BLE devices:</Text>

      <View style={{ height: 20 }} />

      {findDevices &&
        Object.values(devices).map(({ foundAt, device }) => (
          <Text key={device.id}>{device.name ?? device.id}</Text>
        ))}

      <Button
        onPress={() => {
          setDevices({});
          setFindDevices(state => !state);
        }}
        title={findDevices ? 'Parar la busqueda' : 'Buscar dispositivos'}
      />
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
