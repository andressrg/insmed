import React from 'react';
import { SafeAreaView, RefreshControl } from 'react-native';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider,
} from 'recyclerlistview';
import { useNavigation } from '@react-navigation/native';

import { SQLiteContext } from '../components/SQLContext';
import { BLEContext } from '../components/BLEContext';
import { ROW_HEIGHT, ListItem } from '../components/UI';
import { useScreenDimensions } from '../components/useScreenDimensions';

export function DevicesListScreen() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);
  const bleContext = React.useContext(BLEContext);
  const navigation = useNavigation();

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
        subtitle={device.hardware_id}
        onPress={() =>
          navigation.navigate('DeviceDetail', { deviceId: device.id })
        }
      />
    ),
    [navigation]
  );

  const devicesWithConnectionStatus =
    devices &&
    devices.map((device) => ({
      device,
      isConnected: connectedDeviceIds[device.id] === true,
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {devices && (
        <RecyclerListView
          layoutProvider={layoutProvider}
          dataProvider={dataProvider}
          rowRenderer={rowRenderer}
          refreshControl={refreshControl}
        />
      )}
    </SafeAreaView>
  );
}
