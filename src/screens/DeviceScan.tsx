import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useNavigation } from '@react-navigation/native';
import { Permissions } from 'react-native-unimodules';

import { useAsync, DeferFn } from 'react-async';

import { BLEContext } from '../components/BLEContext';

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

const validateDevice: DeferFn<
  | {
      device: import('react-native-ble-plx').Device;
      uartCharacteristic?: import('react-native-ble-plx').Characteristic;
    }
  | undefined
> = async (args, _, { signal }) => {
  const { manager, device } = args[0];
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
};

export function DeviceScanScreen() {
  const bleContext = React.useContext(BLEContext);
  const manager = bleContext.manager!;
  const connectToCharacteristic = bleContext.connectToCharacteristic!;
  const navigation = useNavigation();

  const deviceValidationAsync = useAsync({ deferFn: validateDevice });

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

  React.useEffect(() => {
    const uartCharacteristic = deviceValidationAsync.data?.uartCharacteristic;
    const device = deviceValidationAsync.data?.device;
    if (uartCharacteristic != null && device != null) {
      connectToCharacteristic({ characteristic: uartCharacteristic, device });
      navigation.goBack();
    }
  }, [connectToCharacteristic, deviceValidationAsync.data, navigation]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ height: 20 }} />

      {deviceValidationAsync.isPending ? (
        <ActivityIndicator />
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
          {Object.values(devices)
            .filter(({ device }) => device.name != null)
            .sort((a, b) => ('' + a.device.name).localeCompare(b.device.name!))
            .map(({ device }) => (
              <React.Fragment key={device.id}>
                <TouchableOpacity
                  disabled={deviceValidationAsync.isPending}
                  onPress={() => {
                    deviceValidationAsync.run({
                      manager,
                      device
                    });
                  }}
                >
                  <Text>{device.name}</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />
              </React.Fragment>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
