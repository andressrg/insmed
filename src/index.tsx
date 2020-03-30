import React from 'react';
import { View, Button, SafeAreaView, RefreshControl } from 'react-native';
import codePush from 'react-native-code-push';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider
} from 'recyclerlistview';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { SQLiteContextProvider, SQLiteContext } from './components/SQLContext';
import { BLEContextProvider } from './components/BLEContext';
import { ROW_HEIGHT, ListItem } from './components/UI';
import { useScreenDimensions } from './components/useScreenDimensions';

import { DeviceScanScreen } from './screens/DeviceScan';
import { DeviceDetailScreen } from './screens/DeviceDetail';

function DevicesListScreen() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);
  const navigation = useNavigation();

  const {
    data: devices,
    isPending: devicesPending,
    reload: devicesReload
  } = dbContext.devicesAsync!;

  const layoutProvider = React.useMemo(
    () =>
      new LayoutProvider(
        _ => 0,
        (_, dim) => {
          dim.width = screenWidth;
          dim.height = ROW_HEIGHT;
        }
      ),
    [screenWidth]
  );

  const rowRenderer = React.useCallback(
    (_, row) => (
      <ListItem
        title={row.name}
        subtitle={row.hardware_id}
        onPress={() =>
          navigation.navigate('DeviceDetail', { deviceId: row.id })
        }
      />
    ),
    [navigation]
  );

  const dataProvider = React.useMemo(
    () => new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(devices || []),
    [devices]
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

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

function MainStackScreen() {
  const navigation = useNavigation();

  return (
    <MainStack.Navigator initialRouteName="Home">
      <MainStack.Screen
        name="Home"
        component={DevicesListScreen}
        options={{
          title: 'Dispositivos',

          headerRight: () => (
            <View style={{ paddingRight: 10 }}>
              <Button
                onPress={() => navigation.navigate('DeviceScan')}
                title="Buscar"
              />
            </View>
          )
        }}
      />
    </MainStack.Navigator>
  );
}

const AppWithContext = () => (
  <SQLiteContextProvider>
    <NavigationContainer>
      <BLEContextProvider>
        <RootStack.Navigator mode="modal">
          <RootStack.Screen
            name="Main"
            component={MainStackScreen}
            options={{ headerShown: false }}
          />

          <RootStack.Screen
            name="DeviceScan"
            options={{
              title: 'Dispositivos cercanos'
            }}
            component={DeviceScanScreen}
          />

          <RootStack.Screen
            name="DeviceDetail"
            options={{
              title: 'Dispositivo'
            }}
            component={DeviceDetailScreen}
          />
        </RootStack.Navigator>
      </BLEContextProvider>
    </NavigationContainer>
  </SQLiteContextProvider>
);

export default __DEV__
  ? AppWithContext
  : codePush({
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE
    })(AppWithContext);
