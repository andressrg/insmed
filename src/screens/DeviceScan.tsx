import React from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useNavigation } from '@react-navigation/native';
import { Permissions } from 'react-native-unimodules';
import { useAsync } from 'react-async';

import { BLEContext } from '../components/BLEContext';
import { ListItem } from '../components/UI';

// const UART_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const UART_CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

export function multiline(text?: string) {
  return (text == null ? '' : text)
    .split('\n')
    .reduce(
      (acc, line, index) =>
        index === 0 ? [...acc, line] : [...acc, <br key={index} />, line],
      [] as React.ReactNode[]
    );
}

async function validateDevice({
  device,
  manager,
  signal
}): Promise<
  | {
      device: import('react-native-ble-plx').Device;
      uartCharacteristic?: import('react-native-ble-plx').Characteristic;
    }
  | undefined
> {
  const deviceId = device.id;

  await manager.connectToDevice(deviceId);

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const deviceWithCharacteristics = await manager.discoverAllServicesAndCharacteristicsForDevice(
    deviceId
  );

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const services = await deviceWithCharacteristics.services();

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const characteristics = (
    await Promise.all(services.map(service => service.characteristics()))
  ).flat();

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const uartCharacteristic = characteristics.find(
    char => char.uuid.toLowerCase() === UART_CHARACTERISTIC_UUID.toLowerCase()
  );

  return {
    device,
    uartCharacteristic
  };
}

export function DeviceScanScreen() {
  const bleContext = React.useContext(BLEContext);
  const manager = bleContext.manager!;
  const connectToCharacteristic = bleContext.connectToCharacteristic!;
  const navigation = useNavigation();

  const [selectDevicePromise, setSelectDevicePromise] = React.useState<
    Promise<void>
  >();
  const deviceValidationAsync = useAsync({ promise: selectDevicePromise });

  const [devices, setDevices] = React.useState<{
    [id: string]: { foundAt: Date; device: Device };
  }>({});

  React.useEffect(() => {
    let deactivators: (() => void)[] = [];

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

          device != null &&
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

    return () => deactivators.forEach(fn => fn());
  }, [manager]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {deviceValidationAsync.isPending ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView>
          {Object.values(devices)
            .filter(({ device }) => device.name != null)
            .sort((a, b) => ('' + a.device.name).localeCompare(b.device.name!))
            .map(({ device }) => (
              <ListItem
                key={device.id}
                title={device.name}
                onPress={() => {
                  const controller = new AbortController();
                  setSelectDevicePromise(() =>
                    validateDevice({
                      manager,
                      device,
                      signal: controller.signal
                    }).then(async result => {
                      const uartCharacteristic = result?.uartCharacteristic;
                      const device = result?.device;

                      if (uartCharacteristic != null && device != null) {
                        await connectToCharacteristic({
                          characteristic: uartCharacteristic,
                          device
                        });

                        navigation.goBack();
                      }
                    })
                  );
                }}
              />
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
