import React from 'react';
import { Text, View, Button, SafeAreaView, RefreshControl } from 'react-native';
import { Dimensions } from 'react-native';
import codePush from 'react-native-code-push';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider
} from 'recyclerlistview';
import { useAsync } from 'react-async';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { SQLiteContextProvider, SQLiteContext } from './components/SQLContext';
import { BLEContextProvider } from './components/BLEContext';
import { ROW_HEIGHT, ListItem } from './components/UI';

import { DeviceScanScreen } from './screens/DeviceScan';
import { DeviceDetailScreen } from './screens/DeviceDetail';

function useScreenDimensions() {
  const [screenData, setScreenData] = React.useState(Dimensions.get('screen'));

  React.useEffect(() => {
    const onChange = result => {
      setScreenData(result.screen);
    };

    Dimensions.addEventListener('change', onChange);

    return () => Dimensions.removeEventListener('change', onChange);
  });

  return {
    ...screenData,
    isLandscape: screenData.width > screenData.height
  };
}

function HomeScreen() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);
  const navigation = useNavigation();

  const getDevices = dbContext.getDevices!;
  const {
    data: devices,
    isPending: devicesPending,
    reload: devicesReload
  } = useAsync({
    promiseFn: React.useCallback(() => getDevices(), [getDevices])
  });

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
    () =>
      new DataProvider((r1, r2) => r1 !== r2).cloneWithRows([
        ...(devices || []),
        ...(devices || []),
        ...(devices || []),
        ...(devices || []),
        ...(devices || []),
        ...(devices || [])
      ]),
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
      {/* <Measurements /> */}

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

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
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
        component={HomeScreen}
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

      <MainStack.Screen name="Details" component={DetailsScreen} />
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
