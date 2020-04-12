import React from 'react';
import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import { decode, encode } from 'base-64';

import { SQLiteContext } from './SQLContext';
import { parseData } from '../utils';

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
    [k: string]: { deviceHardwareId; characteristic: Characteristic };
  };

  writeCharacteristicWithoutResponseForDevice?: (
    deviceIdentifier,
    serviceUUID,
    characteristicUUID,
    base64Value,
    transactionId?
  ) => Promise<any>;
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
}: {
  characteristic: Characteristic;
  deviceId: number;
  deviceHardwareId: string;
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
        });

        await manager.writeCharacteristicWithoutResponseForDevice!(
          deviceHardwareId,
          characteristic.serviceUUID,
          characteristic.uuid,
          encode('h')
        );

        const interval = setInterval(async () => {
          await manager.writeCharacteristicWithoutResponseForDevice!(
            deviceHardwareId,
            characteristic.serviceUUID,
            characteristic.uuid,
            encode('h')
          );
        }, 3 * 1000);

        deactivators.push(() => clearInterval(interval));

        if (controller.signal.aborted) return;

        const subscription = characteristic.monitor(async (err, char) => {
          if (controller.signal.aborted) return;

          if (char) {
            const decodedMessage = decode(char.value);
            const data = parseData({ data: decodedMessage, cacheRef });

            data.length > 0 &&
              insertMeasurements(
                data.map((d) => ({
                  device_id: deviceId,
                  timestamp: Date.now(),
                  external_timestamp: d.t,
                  type: 'pressure',
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
      console.log('calling deactivators');
      deactivators.forEach((fn) => fn());
    };
  }, [characteristic, deviceHardwareId, deviceId, insertMeasurements, manager]);

  // React.useEffect(() => console.log('characteristic'), [characteristic]);
  // React.useEffect(() => console.log('deviceHardwareId'), [deviceHardwareId]);
  // React.useEffect(() => console.log('deviceId'), [deviceId]);
  // React.useEffect(() => console.log('insertMeasurements'), [
  //   insertMeasurements,
  // ]);
  // React.useEffect(() => console.log('manager'), [manager]);
  // React.useEffect(
  //   () => console.log('writeCharacteristicWithoutResponseForDevice'),
  //   [writeCharacteristicWithoutResponseForDevice]
  // );

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

  // React.useEffect(() => {
  //   return () => {
  //     if (manager != null) {
  //       setManager(undefined);
  //       manager.destroy();
  //     }
  //   };
  // }, [manager]);

  const context = React.useContext(SQLiteContext);
  const getOrCreateDevice = context.getOrCreateDevice!;

  const [characteristics, setCharacteristics] = React.useState<
    {
      characteristic: Characteristic;
      deviceId: number;
      deviceHardwareId: string;
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
          },
        }),
        {} as {
          [k: string]: {
            deviceHardwareId;
            characteristic: Characteristic;
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
              },
            ]
      );
    },
    [getOrCreateDevice]
  );

  // React.useEffect(() => {
  //   return () => manager.destroy();
  // }, [manager]);

  return manager == null ? null : (
    <BLEContext.Provider
      value={{
        manager,

        connectToCharacteristic,

        connectedDeviceIds,

        writeCharacteristicWithoutResponseForDevice: (...args) =>
          manager.writeCharacteristicWithResponseForDevice(...args),
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
          />
        ))}
      </CharacteristicsErrorBoundary>
    </BLEContext.Provider>
  );
}
