import React from 'react';
import {
  RefreshControl,
  View,
  TouchableOpacity,
  Text as RNText,
  StatusBar,
} from 'react-native';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider,
} from 'recyclerlistview';
import {
  VictoryChart,
  VictoryLine,
  VictoryTheme,
  VictoryAxis,
} from 'victory-native';
import { useAsync } from 'react-async';
import * as ScreenOrientation from 'expo-screen-orientation';
import Icon from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import merge from 'lodash.merge';
import { encode } from 'base-64';
import { useKeepAwake } from 'expo-keep-awake';

import { SQLiteContext } from '../components/SQLContext';
import { ThemeContext } from '../components/ThemeContext';
import { BLEContext } from '../components/BLEContext';
import { useScreenDimensions } from '../components/useScreenDimensions';
import { getLines, correctTs, initCorrectTsRef } from '../utils/charts';
import { ROW_HEIGHT, ListItem, COLOR_4, COLOR_3 } from '../components/UI';
import { usePromise } from '../components/usePromise';

const WRAPAROUND_MILLIS = 0.5 * 60 * 1000;

const PRESSURE_AXIS_MIN = -10;
const PRESSURE_AXIS_MAX = 50;

function Button({ title, onPress }: { title: React.ReactNode; onPress? }) {
  const themeContext = React.useContext(ThemeContext);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: themeContext.button.primary.backgroundColor,
        borderRadius: themeContext.button.primary.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        height: themeContext.button.primary.height,
        flex: 1,
      }}
    >
      <RNText
        style={{
          color: themeContext.button.primary.color,
          fontSize: themeContext.button.primary.fontSize,
        }}
      >
        {title}
      </RNText>
    </TouchableOpacity>
  );
}

function Variable({ title }: { title: string }) {
  const themeContext = React.useContext(ThemeContext);

  return (
    <View>
      <RNText style={{ color: 'white', fontSize: themeContext.fontSize.lg }}>
        {title}
      </RNText>

      <RNText
        style={{
          color: '#394773',
          fontSize: themeContext.fontSize.md,
          textAlign: 'right',
          borderTopColor: '#8CC2FE',
          borderTopWidth: 1,
        }}
      >
        XX.X
      </RNText>
    </View>
  );
}

function TopSection({ onBack }: { onBack: () => void }) {
  const themeContext = React.useContext(ThemeContext);

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 72,
        alignItems: 'center',
        paddingHorizontal: themeContext.padding.md,
      }}
    >
      <TouchableOpacity
        style={{
          alignItems: 'center',
          flexDirection: 'row',
        }}
        onPress={onBack}
      >
        <Icon name="left" size={15} color="white" />

        <View style={{ width: themeContext.sizes.md }} />

        <RNText
          style={{
            color: 'white',
            fontSize: themeContext.fontSize.lg,
            fontWeight: 'bold',
          }}
        >
          InnspiraMED
        </RNText>
      </TouchableOpacity>
    </View>
  );
}

export function DeviceDetailScreen({ route }) {
  useKeepAwake();

  const dbContext = React.useContext(SQLiteContext);
  const bleContext = React.useContext(BLEContext);

  const themeContext = React.useContext(ThemeContext);

  const navigation = useNavigation();

  const { deviceId } = route.params;

  React.useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const getMeasurements = dbContext.getMeasurements!;

  const {
    setPromise,
    result: plotData,
    isPending: plotDataPending,
  } = usePromise<{
    foreground;
    background;
  }>();

  const pendingRef = React.useRef(plotDataPending);
  React.useEffect(() => {
    pendingRef.current = plotDataPending;
  });

  const contextRef = React.useRef(initCorrectTsRef());
  const cursorRef = React.useRef<number>();

  React.useEffect(() => {
    const key = setInterval(() => {
      if (pendingRef.current) return;

      setPromise(
        (async () => {
          const data = (
            await getMeasurements({
              deviceId,
              cursor: cursorRef.current,
              first: 2000,
            })
          )
            .reverse()
            .map((r) => ({
              id: r.id,
              ts: r.timestamp,
              millis: r.external_timestamp,
              y: r.value,
            }));

          const result = getLines({
            wraparoundMillis: WRAPAROUND_MILLIS,
            contextRef,
            data: correctTs({ contextRef, data }).map((p) => ({
              ts: p.ts,
              id: p.raw.id,
              y: p.raw.y,
            })),
          });

          cursorRef.current =
            result.background[0]?.id ?? result.foreground[0]?.id;

          return result;
        })()
      );
    }, 500);

    return () => clearInterval(key);
  }, [deviceId, getMeasurements, setPromise]);

  const foreground = plotData?.foreground;
  const background = React.useMemo(
    () =>
      foreground == null
        ? plotData?.background
        : (plotData?.background ?? []).filter(
            (p) => foreground[foreground.length - 1].x < p.x
          ),
    [foreground, plotData]
  );

  const [viewSize, setViewSize] = React.useState<{
    height?: number;
    width?: number;
  }>({});

  return (
    <>
      <StatusBar hidden />

      <TopSection
        onBack={() => {
          navigation.goBack();
        }}
      />

      <View style={{ flexDirection: 'row', flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View
            onLayout={(ev) => {
              setViewSize({
                height: ev.nativeEvent.layout.height,
                width: ev.nativeEvent.layout.width,
              });
            }}
            style={{ position: 'relative', flex: 1 }}
          >
            {viewSize.height != null && viewSize.width != null && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '100%',
                }}
              >
                <VictoryChart
                  domainPadding={20}
                  domain={{ x: [0, WRAPAROUND_MILLIS] }}
                  height={viewSize.height}
                  width={viewSize.width}
                  padding={{ left: 50 }}
                  theme={merge(VictoryTheme.material, {
                    axis: { style: { tickLabels: { fill: COLOR_3 } } },
                  })}
                >
                  <VictoryLine
                    style={{ data: { stroke: COLOR_3 } }}
                    data={background ?? []}
                  />
                  <VictoryLine
                    style={{ data: { stroke: COLOR_4 } }}
                    data={foreground ?? []}
                  />

                  <VictoryAxis
                    dependentAxis
                    domain={{
                      y: [PRESSURE_AXIS_MIN, PRESSURE_AXIS_MAX],
                    }}
                  />
                </VictoryChart>
              </View>
            )}

            {/* <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                zIndex: 9999,
              }}
            >
              <Button
                onPress={async () => {
                  console.log(
                    'qowidjqoiwdjqw',
                    bleContext.connectedDeviceIds![deviceId].deviceHardwareId,
                    bleContext.connectedDeviceIds![deviceId].characteristic
                      .serviceUUID,
                    bleContext.connectedDeviceIds![deviceId].characteristic
                      .uuid,
                    encode('a1;')
                  );

                  console.log(
                    await bleContext.writeCharacteristicWithoutResponseForDevice!(
                      bleContext.connectedDeviceIds![deviceId].deviceHardwareId,
                      bleContext.connectedDeviceIds![deviceId].characteristic
                        .serviceUUID,
                      bleContext.connectedDeviceIds![deviceId].characteristic
                        .uuid,
                      encode('i30p20;')
                    )
                  );
                }}
                title="1"
              />

              <Button
                onPress={async () => {
                  console.log(
                    await bleContext.writeCharacteristicWithoutResponseForDevice!(
                      bleContext.connectedDeviceIds![deviceId].deviceHardwareId,
                      bleContext.connectedDeviceIds![deviceId].characteristic
                        .serviceUUID,
                      bleContext.connectedDeviceIds![deviceId].characteristic
                        .uuid,
                      encode('p40;')
                    )
                  );
                }}
                title="100"
              />

              <Button
                onPress={async () => {
                  await bleContext.writeCharacteristicWithoutResponseForDevice!(
                    bleContext.connectedDeviceIds![deviceId].deviceHardwareId,
                    bleContext.connectedDeviceIds![deviceId].characteristic
                      .serviceUUID,
                    bleContext.connectedDeviceIds![deviceId].characteristic
                      .uuid,
                    encode('s')
                  );
                }}
                title="s"
              />

              <TouchableOpacity
                onPress={() => {
                  navigation.goBack();
                }}
                style={{ padding: 10 }}
              >
                <Icon
                  name="close"
                  size={20}
                  backgroundColor="transparent"
                  color={COLOR_4}
                />
              </TouchableOpacity>
            </View> */}
          </View>

          <View
            style={{
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: themeContext.padding.md,

              flexDirection: 'row',
            }}
          >
            <Button title="P. Control" />

            <View style={{ width: themeContext.sizes.sm }} />

            <Button title="BPM" />

            <View style={{ width: themeContext.sizes.sm }} />

            <Button title="Rel: I:E" />
          </View>
        </View>

        <View
          style={{
            width: 160,
            justifyContent: 'space-around',
            paddingHorizontal: themeContext.sizes.sm,
          }}
        >
          <Variable title="PIP" />
          <Variable title="PEEP" />
          <Variable title="t.IN" />
          <Variable title="t.EX" />
          <Variable title="Ciclos" />
        </View>
      </View>
    </>
  );
}

function DataLog({ deviceId }: { deviceId: string }) {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);

  // @ts-ignore
  const { isPending: dataPending, data, reload: reloadData } = useAsync({
    promiseFn: dbContext.getMeasurements,
    deviceId,
  });

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
    (_, row: { value: number; timestamp: number }) => (
      <ListItem title={row.value} subtitle={row.timestamp} />
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

  return (data || []).length === 0 ? null : (
    <>
      <RecyclerListView
        layoutProvider={layoutProvider}
        dataProvider={dataProvider}
        rowRenderer={rowRenderer}
        refreshControl={refreshControl}
      />
    </>
  );
}
