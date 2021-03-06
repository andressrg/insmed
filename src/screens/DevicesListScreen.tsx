import React from 'react';
import { RefreshControl, View } from 'react-native';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider,
} from 'recyclerlistview';
import { useNavigation } from '@react-navigation/native';
import { Permissions } from 'react-native-unimodules';

import { SQLiteContext } from '../components/SQLContext';
import { BLEContext } from '../components/BLEContext';
import {
  ROW_HEIGHT,
  ListItem,
  CTAButton,
  ShadowContainer,
} from '../components/UI';
import { BaseLayout } from '../components/UI/BaseLayout';
import { useScreenDimensions } from '../components/useScreenDimensions';
import { validateDevice } from '../utils/ble';
import { Card } from '../components/UI/Card';
import { ThemeContext } from '../components/ThemeContext';

function useDeviceAutoConnect() {
  const dbContext = React.useContext(SQLiteContext);
  const bleContext = React.useContext(BLEContext);

  const manager = bleContext.manager!;
  const connectToCharacteristic = bleContext.connectToCharacteristic!;

  const getDeviceById = dbContext.getDeviceById!;

  const deviceValidationPromises = React.useRef<{ [k: string]: Promise<any> }>(
    {}
  );

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

          if (device != null) {
            getDeviceById({
              hardware_id: device?.id,
            })
              .then((deviceFound) => (deviceFound.length > 0 ? device : null))
              .then((deviceToConnect) => {
                const controller = new AbortController();
                if (deviceToConnect != null) {
                  if (deviceValidationPromises.current[device.id] != null) {
                    return;
                  }

                  const validationPromise = validateDevice({
                    manager,
                    device: deviceToConnect,
                    signal: controller.signal,
                  }).then(async (result) => {
                    const uartCharacteristic = result?.uartCharacteristic;
                    const device = result?.device;

                    if (uartCharacteristic != null && device != null) {
                      await connectToCharacteristic({
                        characteristic: uartCharacteristic,
                        device: deviceToConnect,
                      });
                    }
                  });

                  deviceValidationPromises.current[
                    device.id
                  ] = validationPromise;

                  return validationPromise;
                }
              });
          }
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
  }, [connectToCharacteristic, getDeviceById, manager]);
}

export function DevicesListScreen() {
  const { width: screenWidth } = useScreenDimensions();
  const themeContext = React.useContext(ThemeContext);
  const dbContext = React.useContext(SQLiteContext);
  const bleContext = React.useContext(BLEContext);

  const navigation = useNavigation();

  // React.useEffect(() => {
  //   if (__DEV__) navigation.navigate('DeviceDetail', { deviceId: 1 });
  // }, []);

  const connectedDeviceIds = bleContext.connectedDeviceIds!;

  const {
    data: devices,
    isPending: devicesPending,
    reload: devicesReload,
  } = dbContext.devicesAsync!;

  const layoutProvider = React.useMemo(
    () =>
      new LayoutProvider(
        (_) => 0,
        (_, dim) => {
          dim.width = screenWidth;
          dim.height = ROW_HEIGHT;
        }
      ),
    [screenWidth]
  );

  const rowRenderer = React.useCallback(
    (_, { device, isConnected }) => (
      <ListItem
        title={device.name + (isConnected ? ' Connected!' : '')}
        titleColor={themeContext.fontColor.primary}
        subtitleColor={themeContext.fontColor.secondary}
        subtitle={device.hardware_id}
        onPress={() =>
          navigation.navigate('DeviceDetail', { deviceId: device.id })
        }
      />
    ),
    [
      navigation,
      themeContext.fontColor.primary,
      themeContext.fontColor.secondary,
    ]
  );

  const devicesWithConnectionStatus =
    devices &&
    devices.map((device) => ({
      device,
      isConnected: connectedDeviceIds[device.id] != null,
    }));

  const dataProvider = React.useMemo(
    () =>
      new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(
        devicesWithConnectionStatus || []
      ),
    [devicesWithConnectionStatus]
  );

  const refreshControl = React.useMemo(
    () => (
      <RefreshControl refreshing={devicesPending} onRefresh={devicesReload} />
    ),
    [devicesPending, devicesReload]
  );

  // useDeviceAutoConnect();

  return (
    <BaseLayout>
      <Card
        title="Dispositivos Conectados"
        titleColor={themeContext.fontColor.primary}
        backgroundColor={themeContext.color.background2}
      >
        {devices && (
          <>
            <View style={{ height: themeContext.sizes.md }} />
            <RecyclerListView
              layoutProvider={layoutProvider}
              dataProvider={dataProvider}
              rowRenderer={rowRenderer}
              refreshControl={refreshControl}
            />
          </>
        )}
      </Card>

      <ShadowContainer backgroundColor={themeContext.color.background2}>
        <CTAButton
          title="Agregar dispositivos"
          type="primary"
          onPress={() => navigation.navigate('DeviceScan')}
        />
      </ShadowContainer>
    </BaseLayout>
  );
}
