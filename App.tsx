import React from 'react';
import { Text, View, Button, TouchableOpacity, ScrollView } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Permissions } from 'react-native-unimodules';

const UART_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const UART_CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

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
    <View style={{ flex: 1 }}>
      <View style={{ height: 20 }} />

      <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
        Dispositivos cercanos:
      </Text>

      <View style={{ height: 20 }} />

      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        {findDevices &&
          Object.values(devices)
            .map(({ device, ...rest }) => ({
              ...rest,
              device,
              title: device.name ?? device.id
            }))
            .sort((a, b) => ('' + a.title).localeCompare(b.title))
            .map(({ device, title }) => (
              <React.Fragment key={device.id}>
                <TouchableOpacity
                  onPress={() => {
                    manager.connectToDevice(device.id).then(
                      () => {
                        const subscription = device.monitorCharacteristicForService(
                          UART_SERVICE_UUID,
                          UART_CHARACTERISTIC_UUID,
                          (error, characteristic) => {
                            console.log('received', characteristic.value);
                          }
                        );
                      },
                      // device.discoverAllServicesAndCharacteristics().then(
                      //   () => {
                      //     console.log('device');
                      //   },
                      //   err => {
                      //     console.log('failed', err);
                      //   }
                      // ),

                      err => {
                        alert('Fallo de conexión');
                      }
                    );
                  }}
                >
                  <Text>{title}</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />
              </React.Fragment>
            ))}
      </ScrollView>

      <View style={{ alignItems: 'center' }}>
        <Button
          onPress={() => {
            setDevices({});
            setFindDevices(state => !state);
          }}
          title={findDevices ? 'Parar la busqueda' : 'Buscar dispositivos'}
        />
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}
