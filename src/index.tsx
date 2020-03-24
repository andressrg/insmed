import React from 'react';
import {
  Text,
  View,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Permissions } from 'react-native-unimodules';
import codePush from 'react-native-code-push';

import { Chart } from './components/Chart';

const UART_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const UART_CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

function App() {
  const [manager] = React.useState(() => new BleManager());

  const [findDevices, setFindDevices] = React.useState(true);

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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ height: 20 }} />

      <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
        Dispositivos cercanos:
      </Text>

      <View style={{ height: 20 }} />

      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        {findDevices &&
          Object.values(devices)
            .filter(({ device }) => device.name != null)
            .sort((a, b) => ('' + a.device.name).localeCompare(b.device.name))
            .map(({ device }) => (
              <React.Fragment key={device.id}>
                <TouchableOpacity
                  onPress={() => {
                    manager
                      .connectToDevice(device.id)
                      .then(
                        // () => {
                        //   const subscription = device.monitorCharacteristicForService(
                        //     UART_SERVICE_UUID,
                        //     UART_CHARACTERISTIC_UUID,
                        //     (error, characteristic) => {
                        //       console.log('received', characteristic.value);
                        //     }
                        //   );
                        // },
                        () => {
                          alert(`Connected to ${device.name}`);

                          return device
                            .discoverAllServicesAndCharacteristics()
                            .then(
                              async device => {
                                alert(
                                  `services for ${device.name}: ${(
                                    await Promise.all(
                                      (await device.services()).map(service =>
                                        service
                                          .characteristics()
                                          .then(characteristics => ({
                                            service,
                                            characteristics
                                          }))
                                      )
                                    )
                                  )
                                    .map(
                                      ({ service, characteristics }) =>
                                        `service: ${
                                          service.id
                                        } ${characteristics
                                          .map(
                                            characteristic =>
                                              characteristic.uuid
                                          )
                                          .join(', ')}`
                                    )
                                    .join('; ')}`
                                );
                              },
                              err => {
                                alert('failed');
                              }
                            );
                        },

                        err => {
                          alert('Fallo de conexión');
                        }
                      )
                      .catch(err => {
                        alert(`Error ${err} ${JSON.stringify(err)}`);
                      });
                  }}
                >
                  <Text>{device.name}</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />
              </React.Fragment>
            ))}
      </ScrollView>

      {!findDevices && <Chart />}

      <View style={{ alignItems: 'center' }}>
        <Button
          onPress={() => {
            setDevices({});
            setFindDevices(state => !state);
          }}
          title={
            findDevices
              ? 'Parar la busqueda'
              : 'Buscar dispositivos disponibles'
          }
        />
      </View>
      <View style={{ height: 20 }} />
    </SafeAreaView>
  );
}

export default __DEV__
  ? App
  : codePush({
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE
    })(App);
