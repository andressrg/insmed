import React from 'react';
import { RefreshControl } from 'react-native';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider,
} from 'recyclerlistview';
import { VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';
import { useAsync } from 'react-async';
import * as ScreenOrientation from 'expo-screen-orientation';

import { SQLiteContext } from '../components/SQLContext';
import { useScreenDimensions } from '../components/useScreenDimensions';
// import { BLEContextProvider } from '../components/BLEContext';
import { getLines, correctTs, initCorrectTsRef } from '../utils/charts';
import { ROW_HEIGHT, ListItem } from '../components/UI';

const WRAPAROUND_MILLIS = 0.5 * 60 * 1000;

export function DeviceDetailScreen({ route }) {
  const { width: screenWidth } = useScreenDimensions();
  const dbContext = React.useContext(SQLiteContext);

  const { deviceId } = route.params;

  React.useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
    );

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

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

  const [promise, setPromise] = React.useState<
    Promise<{
      background: { x: number; y: number }[];
      foreground: { x: number; y: number }[];
    }>
  >();

  const getMeasurements = dbContext.getMeasurements!;
  const { data: plotData, isPending: plotDataPending } = useAsync({ promise });

  const contextRef = React.useRef(initCorrectTsRef());
  const cursorRef = React.useRef<number>();

  const pendingRef = React.useRef(plotDataPending);
  React.useEffect(() => {
    pendingRef.current = plotDataPending;
  });

  React.useEffect(() => {
    const key = setInterval(() => {
      if (pendingRef.current) return;

      setPromise(async () => {
        const data = (
          await getMeasurements({
            deviceId,
            cursor: cursorRef.current,
          })
        )
          .reverse()
          .map((r) => ({
            id: r.id,
            ts: r.timestamp,
            millis: r.external_timestamp,
            y: r.value,
          }));

        console.log('data.length', data.length);

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
      });
    }, 1000);
    return () => clearInterval(key);
  }, [deviceId, getMeasurements]);

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
