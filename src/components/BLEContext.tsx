import React from 'react';
import { BleManager, Characteristic, Device } from 'react-native-ble-plx';
import { decode } from 'base-64';

import { SQLiteContext } from './SQLContext';
import { parseData } from '../utils';

export const BLEContext = React.createContext<{
  manager?: BleManager;
  connectToCharacteristic?: ({
    characteristic,
    device
  }: {
    characteristic: Characteristic;
    device: Device;
  }) => Promise<void>;
}>({});

function CharacteristicConnection({
  characteristic,
  deviceId
}: {
  characteristic: Characteristic;
  deviceId: number;
}) {
  const context = React.useContext(SQLiteContext);
  const insertMeasurements = context.insertMeasurements!;

  const cacheRef = React.useRef('');

  React.useEffect(() => {
    const controller = new AbortController();
    const deactivators = [() => controller.abort()];

    (async () => {
      const subscription = characteristic.monitor(async (err, char) => {
        if (char) {
          const decodedMessage = decode(char.value);
          const data = parseData({ data: decodedMessage, cacheRef });

          data.length > 0 &&
            insertMeasurements(
              data.map(d => ({
                device_id: deviceId,
                timestamp: Date.now(),
                external_timestamp: d.t,
                type: 'pressure',
                value: d.p,
                raw: ''
              }))
            );
        }
      });

      deactivators.push(() => subscription.remove());
    })();

    return () => deactivators.forEach(fn => fn());
  }, [characteristic, deviceId, insertMeasurements]);

  return null;
}

export function BLEContextProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [manager] = React.useState(() => new BleManager());

  const context = React.useContext(SQLiteContext);
  const getOrCreateDevice = context.getOrCreateDevice!;

  const [characteristics, setCharacteristics] = React.useState<
    { characteristic: Characteristic; deviceId: number }[]
  >([]);

  return (
    <BLEContext.Provider
      value={{
        manager,
        connectToCharacteristic: React.useCallback(
          async ({ characteristic, device }) => {
            const { id } = await getOrCreateDevice({
              hardware_id: device.id,
              name: device.name
            });

            setCharacteristics(state =>
              state.map(s => s.characteristic).includes(characteristic)
                ? state
                : [...state, { characteristic, deviceId: id }]
            );
          },
          [getOrCreateDevice]
        )
      }}
    >
      {children}

      {characteristics.map(characteristic => (
        <CharacteristicConnection
          key={characteristic.deviceId}
          characteristic={characteristic.characteristic}
          deviceId={characteristic.deviceId}
        />
      ))}
    </BLEContext.Provider>
  );
}
