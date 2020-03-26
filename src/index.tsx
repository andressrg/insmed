import React from 'react';
import {
  Text,
  View,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { Dimensions } from 'react-native';
import { Permissions } from 'react-native-unimodules';
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

import { Chart } from './components/Chart';
import { SQLiteContextProvider, SQLiteContext } from './components/SQLContext';
import { BLEContextProvider, BLEContext } from './components/BLEContext';

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

const ROW_HEIGHT = 40;

function Measurements() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);

  // @ts-ignore
  const { data } = useAsync({
    promiseFn: dbContext.getMeasurements,
    deviceId: 1
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
      <View style={{ height: ROW_HEIGHT }}>
        <Text>{row.value}</Text>
      </View>
    ),
    []
  );

  const dataProvider = React.useMemo(
    () => new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(data || []),
    [data]
  );

  return (data || []).length === 0 ? null : (
    <RecyclerListView
      layoutProvider={layoutProvider}
      dataProvider={dataProvider}
      rowRenderer={rowRenderer}
    />
  );
}

function HomeScreen() {
  return false ? (
    <Measurements />
  ) : (
    <SafeAreaView style={{ flex: 1 }}>
      <Chart />
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

function DeviceScanScreen() {
  const bleContext = React.useContext(BLEContext);
  const manager = bleContext.manager!;

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
      <View style={{ height: 20 }} />

      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        {Object.values(devices)
          .filter(({ device }) => device.name != null)
          .sort((a, b) => ('' + a.device.name!).localeCompare(b.device.name!))
          .map(({ device }) => (
            <React.Fragment key={device.id}>
              <TouchableOpacity
                onPress={() => {
                  manager
                    .connectToDevice(device.id)
                    .then(
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
                                          characteristic => characteristic.uuid
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
        component={HomeScreen}
        options={{
          title: 'Dispositivos conectados',

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
