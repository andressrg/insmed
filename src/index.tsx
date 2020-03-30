import React from 'react';
import { Text, View, Button, SafeAreaView, RefreshControl } from 'react-native';
import { Dimensions } from 'react-native';
import codePush from 'react-native-code-push';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider
} from 'recyclerlistview';
import { VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';
import { useAsync } from 'react-async';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { SQLiteContextProvider, SQLiteContext } from './components/SQLContext';
import { BLEContextProvider } from './components/BLEContext';
import { getLines, correctTs, initCorrectTsRef } from './utils/charts';
import { ROW_HEIGHT, ListItem } from './components/UI';

import { DeviceScanScreen } from './screens/DeviceScan';

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

const WRAPAROUND_MILLIS = 0.5 * 60 * 1000;

function Measurements() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);
  const deviceId = 1;

  // @ts-ignore
  const { isPending: dataPending, data, reload: reloadData } = useAsync({
    promiseFn: dbContext.getMeasurements,
    deviceId
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
    (_, row: { value: number; timestamp: number }) => (
      <View style={{ height: ROW_HEIGHT }}>
        <Text>
          T:{row.timestamp} Presion: {row.value}
        </Text>
      </View>
    ),
    []
  );

  const dataProvider = React.useMemo(
    () => new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(data || []),
    [data]
  );

  const refreshControl = React.useMemo(
    () => <RefreshControl refreshing={dataPending} onRefresh={reloadData} />,
    [dataPending, reloadData]
  );

  const [promise, setPromise] = React.useState<
    Promise<{
      background: { x: number; y: number }[];
      foreground: { x: number; y: number }[];
    }>
  >();

  const getMeasurements = dbContext.getMeasurements!;
  const { data: plotData } = useAsync({ promise });

  const contextRef = React.useRef(initCorrectTsRef());
  const cursorRef = React.useRef<number>();

  React.useEffect(() => {
    const key = setInterval(
      () =>
        setPromise(async () => {
          const data = (
            await getMeasurements({
              deviceId,
              cursor: cursorRef.current
            })
          )
            .reverse()
            .map(r => ({
              id: r.id,
              ts: r.timestamp,
              millis: r.external_timestamp,
              y: r.value
            }));
          const result = getLines({
            wraparoundMillis: WRAPAROUND_MILLIS,
            contextRef,
            data: correctTs({ contextRef, data }).map(p => ({
              ts: p.ts,
              id: p.raw.id,
              y: p.raw.y
            }))
          });
          cursorRef.current = result.background[0]?.id;
          return result;
        }),
      1000
    );
    return () => clearInterval(key);
  }, [getMeasurements]);

  const foreground = plotData?.foreground;
  const background = React.useMemo(
    () =>
      foreground == null
        ? plotData?.background
        : (plotData?.background ?? []).filter(
            p => foreground[foreground.length - 1].x < p.x
          ),
    [foreground, plotData]
  );

  return (data || []).length === 0 ? null : (
    <>
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={20}
        domain={{ x: [0, WRAPAROUND_MILLIS] }}
      >
        <VictoryLine
          style={{ data: { stroke: 'red' } }}
          data={background ?? []}
          // interpolation="natural"
        />
        <VictoryLine
          data={foreground ?? []}
          // interpolation="natural"
        />
      </VictoryChart>

      <RecyclerListView
        layoutProvider={layoutProvider}
        dataProvider={dataProvider}
        rowRenderer={rowRenderer}
        refreshControl={refreshControl}
      />
    </>
  );
}

function HomeScreen() {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);

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
    (_, row) => <ListItem title={row.name} subtitle={row.hardware_id} />,
    []
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
