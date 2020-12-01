import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useNavigation } from '@react-navigation/native';
import { Permissions } from 'react-native-unimodules';
import { useAsync } from 'react-async';

import { ThemeContext } from '../components/ThemeContext';
import { BLEContext } from '../components/BLEContext';
import { ListItem } from '../components/UI';
import { BaseLayout } from '../components/UI/BaseLayout';
import { Card } from '../components/UI/Card';

import { validateDevice } from '../utils/ble';

export function multiline(text?: string) {
  return (text == null ? '' : text)
    .split('\n')
    .reduce(
      (acc, line, index) =>
        index === 0 ? [...acc, line] : [...acc, <br key={index} />, line],
      [] as React.ReactNode[]
    );
}

export function DeviceScanScreen() {
  const themeContext = React.useContext(ThemeContext);
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
        manager.startDeviceScan(null, null, async (error, device) => {
          if (error) {
            // Handle error (scanning will be stopped automatically)
            alert(error);
            return;
          }

          device != null &&
            setDevices((state) => ({
              ...state,

              [device.id]: {
                foundAt: new Date(),
                device,
              },
            }));
        });

        deactivators.push(() => manager.stopDeviceScan());
      }

      let stopStateChangeSubscription;

      const subscription = manager.onStateChange((state) => {
        deactivators.push(stopStateChangeSubscription);
        if (state === 'PoweredOn') {
          scanAndConnect();
          stopStateChangeSubscription();
          deactivators = deactivators.filter(
            (fn) => fn !== stopStateChangeSubscription
          );
        }
      }, true);

      stopStateChangeSubscription = () => subscription.remove();
    });

    return () => deactivators.forEach((fn) => fn());
  }, [manager]);

  return (
    <BaseLayout secondary>
      <Card
        title="Dispositivos Cercanos"
        titleColor={themeContext.fontColor.primary}
        backgroundColor={themeContext.color.background2}
      >
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
              .sort((a, b) =>
                ('' + a.device.name).localeCompare(b.device.name!)
              )
              .map(({ device }) => (
                <ListItem
                  key={device.id}
                  title={device.name}
                  titleColor={themeContext.fontColor.primary}
                  onPress={() => {
                    const controller = new AbortController();
                    setSelectDevicePromise(() =>
                      validateDevice({
                        manager,
                        device,
                        signal: controller.signal,
                      }).then(async (result) => {
                        const uartCharacteristic = result?.uartCharacteristic;
                        const device = result?.device;

                        if (uartCharacteristic != null && device != null) {
                          await connectToCharacteristic({
                            characteristic: uartCharacteristic,
                            device,
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
      </Card>
    </BaseLayout>
  );
}
