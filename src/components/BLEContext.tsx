import React from 'react';
import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import { decode, encode } from 'base-64';
import produce from 'immer';

import { SQLiteContext } from './SQLContext';
import { parseData } from '../utils';

type writePresControlType = ({
  deviceId: string,
  value: number,
}) => Promise<void>;

type writeBPMType = writePresControlType;
type writeIERatioType = writePresControlType;
type writeModeType = writePresControlType;

export const BLEContext = React.createContext<{
  manager?: BleManager;

  connectToCharacteristic?: ({
    characteristic,
    device,
  }: {
    characteristic: Characteristic;
    device: Device;
  }) => Promise<void>;

  connectedDeviceIds?: {
    [k: string]: {
      deviceHardwareId: string;
      characteristic: Characteristic;

      presControl?: number;
      bpm?: number;
      ieRatio?: number;

      pip?: number;
      peep?: number;
      volume?: number;
      cycleCount?: number;
      mode: number | undefined;
    };
  };

  writePresControl?: writePresControlType;
  writeBPM?: writeBPMType;
  writeIERatio?: writeIERatioType;
  writeMode?: writeModeType;
}>({});

class CharacteristicsErrorBoundary extends React.Component {
  state = { key: Date.now() };

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { key: Date.now() };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service

    console.log(error, errorInfo);
  }

  render() {
    return (
      <React.Fragment key={this.state.key}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

function CharacteristicConnection({
  characteristic,
  deviceId,
  deviceHardwareId,
  setParams,
  onDisconnect,
}: {
  characteristic: Characteristic;
  deviceId: number;
  deviceHardwareId: string;
  setParams: (p: {
    deviceId;

    presControl?: number;
    bpm?: number;
    ieRatio?: number;

    pip?: number;
    peep?: number;
    volume?: number;
    cycleCount?: number;
    mode: number | undefined;
  }) => void;
  onDisconnect: (p: { deviceId }) => void;
}) {
  const context = React.useContext(SQLiteContext);
  const bleContext = React.useContext(BLEContext);
  const insertMeasurements = context.insertMeasurements!;

  const cacheRef = React.useRef('');

  const manager = bleContext.manager!;

  React.useEffect(() => {
    const controller = new AbortController();
    const deactivators = [
      () => controller.abort(),
      () => manager.cancelDeviceConnection(deviceHardwareId),
    ];

    (async () => {
      try {
        if ((await manager.isDeviceConnected(deviceHardwareId)) === false) {
          await manager.connectToDevice(deviceHardwareId);
        }

        if (controller.signal.aborted) return;

        manager.onDeviceDisconnected(deviceHardwareId, (error, device) => {
          console.log(`Device ${device?.id} disconnected`);
          onDisconnect({ deviceId });
        });

        await manager.writeCharacteristicWithoutResponseForDevice!(
          deviceHardwareId,
          characteristic.serviceUUID,
          characteristic.uuid,
          encode('h')
        );

        const keepAliveInterval = setInterval(async () => {
          await manager.writeCharacteristicWithoutResponseForDevice!(
            deviceHardwareId,
            characteristic.serviceUUID,
            characteristic.uuid,
            encode('h')
          );
        }, 3 * 1000);

        deactivators.push(() => clearInterval(keepAliveInterval));

        const parametersInterval = setInterval(async () => {
          await manager.writeCharacteristicWithoutResponseForDevice!(
            deviceHardwareId,
            characteristic.serviceUUID,
            characteristic.uuid,
            encode('s;')
          );
        }, 3 * 1000);

        deactivators.push(() => clearInterval(parametersInterval));

        if (controller.signal.aborted) return;

        const subscription = characteristic.monitor(async (err, char) => {
          if (controller.signal.aborted) return;

          if (char) {
            const decodedMessage = decode(char.value);
            const parsed = parseData({
              data: decodedMessage,
              cacheRef,
            });

            if (
              parsed.presControl != null ||
              parsed.bpm != null ||
              parsed.ieRatio != null ||
              parsed.pip != null ||
              parsed.peep != null ||
              parsed.volume != null ||
              parsed.mode != null ||
              parsed.cycleCount != null
            ) {
              setParams({
                deviceId,

                presControl: parsed.presControl,
                bpm: parsed.bpm,
                ieRatio: parsed.ieRatio,

                pip: parsed.pip,
                peep: parsed.peep,
                volume: parsed.volume,
                cycleCount: parsed.cycleCount,
                mode: parsed.mode,
              });
            }

            const pressure = parsed.pressure;

            pressure &&
              pressure.length > 0 &&
              insertMeasurements(
                pressure.map((d) => ({
                  device_id: deviceId,
                  timestamp: Date.now(),
                  external_timestamp: d.t,
                  type: 'pressure',
                  value: d.p,
                  raw: '',
                }))
              );

            const flow = parsed.flow;

            flow &&
              flow.length > 0 &&
              insertMeasurements(
                flow.map((d) => ({
                  device_id: deviceId,
                  timestamp: Date.now(),
                  external_timestamp: d.t,
                  type: 'flow',
                  value: d.p,
                  raw: '',
                }))
              );
          }
        });

        deactivators.push(() => subscription.remove());
      } catch (err) {
        console.log('err', err);
      }
    })();

    return () => {
      deactivators.forEach((fn) => fn());
    };
  }, [
    characteristic,
    deviceHardwareId,
    deviceId,
    insertMeasurements,
    manager,
    onDisconnect,
    setParams,
  ]);

  return null;
}

export function BLEContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [manager, setManager] = React.useState<BleManager>();
  React.useEffect(() => {
    if (manager == null) {
      const newManager = new BleManager();
      setManager(newManager);
    }
  }, [manager]);

  const context = React.useContext(SQLiteContext);
  const getOrCreateDevice = context.getOrCreateDevice!;

  const [characteristics, setCharacteristics] = React.useState<
    {
      characteristic: Characteristic;
      deviceId: number;
      deviceHardwareId: string;

      presControl?: number;
      bpm?: number;
      ieRatio?: number;

      pip?: number;
      peep?: number;
      volume?: number;
      cycleCount?: number;
      mode: number | undefined;
    }[]
  >([]);

  const connectedDeviceIds = React.useMemo(
    () =>
      characteristics.reduce(
        (acc, d) => ({
          ...acc,
          [d.deviceId]: {
            deviceHardwareId: d.deviceHardwareId,
            characteristic: d.characteristic,

            presControl: d.presControl,
            bpm: d.bpm,
            ieRatio: d.ieRatio,

            pip: d.pip,
            peep: d.peep,
            volume: d.volume,
            cycleCount: d.cycleCount,
            mode: d.mode,
          },
        }),
        {} as {
          [k: string]: {
            deviceHardwareId;
            characteristic: Characteristic;

            presControl?: number;
            bpm?: number;
            ieRatio?: number;

            pip?: number;
            peep?: number;
            volume?: number;
            cycleCount?: number;
            mode: number | undefined;
          };
        }
      ),
    [characteristics]
  );

  const connectToCharacteristic = React.useCallback(
    async ({ characteristic, device }) => {
      const { id } = await getOrCreateDevice({
        hardware_id: device.id,
        name: device.name,
      });

      setCharacteristics((state) =>
        state.map((s) => s.characteristic).includes(characteristic)
          ? state
          : [
              ...state,
              {
                characteristic,
                deviceId: id,
                deviceHardwareId: device.id,
                mode: undefined,
              },
            ]
      );
    },
    [getOrCreateDevice]
  );

  const setParams = React.useCallback(
    ({
      deviceId,
      presControl,
      bpm,
      ieRatio,
      pip,
      peep,
      volume,
      cycleCount,
      mode,
    }: {
      deviceId;
      presControl?: number;
      bpm?: number;
      ieRatio?: number;
      pip?: number;
      peep?: number;
      volume?: number;
      cycleCount?: number;
      mode?: number;
    }) => {
      setCharacteristics((state) =>
        produce(state, (draftState) => {
          const item = draftState.find((t) => t.deviceId === deviceId);

          if (item) {
            if (presControl != null) item.presControl = presControl;
            if (bpm != null) item.bpm = bpm;
            if (ieRatio != null) item.ieRatio = ieRatio;

            if (pip != null) item.pip = pip;
            if (peep != null) item.peep = peep;
            if (volume != null) item.volume = volume;
            if (cycleCount != null) item.cycleCount = cycleCount;
            if (mode != null) item.mode = mode;
          }
        })
      );
    },
    []
  );

  const onDisconnect = React.useCallback(({ deviceId }: { deviceId }) => {
    setCharacteristics((state) => state.filter((i) => i.deviceId !== deviceId));
  }, []);

  const writePresControl: writePresControlType = React.useCallback(
    async ({ deviceId, value }) => {
      const val = characteristics.find((c) => c.deviceId === deviceId);

      if (val == null) return;

      const { deviceHardwareId, characteristic } = val;

      await manager!.writeCharacteristicWithoutResponseForDevice!(
        deviceHardwareId,
        characteristic.serviceUUID,
        characteristic.uuid,
        encode(`p${value};`)
      );
    },
    [characteristics, manager]
  );

  const writeBPM: writeBPMType = React.useCallback(
    async ({ deviceId, value }) => {
      const val = characteristics.find((c) => c.deviceId === deviceId);

      if (val == null) return;

      const { deviceHardwareId, characteristic } = val;

      await manager!.writeCharacteristicWithoutResponseForDevice!(
        deviceHardwareId,
        characteristic.serviceUUID,
        characteristic.uuid,
        encode(`b${value};`)
      );
    },
    [characteristics, manager]
  );

  const writeIERatio: writeIERatioType = React.useCallback(
    async ({ deviceId, value }) => {
      const val = characteristics.find((c) => c.deviceId === deviceId);

      if (val == null) return;

      const { deviceHardwareId, characteristic } = val;

      await manager!.writeCharacteristicWithoutResponseForDevice!(
        deviceHardwareId,
        characteristic.serviceUUID,
        characteristic.uuid,
        encode(`i${value};`)
      );
    },
    [characteristics, manager]
  );

  const writeMode: writeModeType = React.useCallback(
    async ({ deviceId, value }) => {
      const val = characteristics.find((c) => c.deviceId === deviceId);

      if (val == null) return;

      const { deviceHardwareId, characteristic } = val;

      await manager!.writeCharacteristicWithoutResponseForDevice!(
        deviceHardwareId,
        characteristic.serviceUUID,
        characteristic.uuid,
        encode(`m${value};`)
      );
    },
    [characteristics, manager]
  );

  return manager == null ? null : (
    <BLEContext.Provider
      value={{
        manager,
        connectToCharacteristic,
        connectedDeviceIds,

        writePresControl,
        writeBPM,
        writeIERatio,
        writeMode,
      }}
    >
      {children}

      <CharacteristicsErrorBoundary>
        {characteristics.map((characteristic) => (
          <CharacteristicConnection
            key={characteristic.deviceId}
            characteristic={characteristic.characteristic}
            deviceId={characteristic.deviceId}
            deviceHardwareId={characteristic.deviceHardwareId}
            setParams={setParams}
            onDisconnect={onDisconnect}
          />
        ))}
      </CharacteristicsErrorBoundary>
    </BLEContext.Provider>
  );
}
