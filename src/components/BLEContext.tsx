import React from 'react';
import { BleManager, Characteristic } from 'react-native-ble-plx';
import { decode } from 'base-64';

import { SQLiteContext } from './SQLContext';
import { parseData } from '../utils';

export const BLEContext = React.createContext<{
  manager?: BleManager;
  connectToCharacteristic?: ({
    characteristic
  }: {
    characteristic: Characteristic;
  }) => Promise<void>;
}>({});

function CharacteristicConnection({
  characteristic
}: {
  characteristic: Characteristic;
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
                device_id: 1,
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
  }, [characteristic, insertMeasurements]);

  return null;
}

export function BLEContextProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [manager] = React.useState(() => new BleManager());

  const [characteristics, setCharacteristics] = React.useState<
    Characteristic[]
  >([]);

  return (
    <BLEContext.Provider
      value={{
        manager,
        connectToCharacteristic: React.useCallback(
          async ({ characteristic }) => {
            setCharacteristics(state =>
              state.includes(characteristic)
                ? state
                : [...state, characteristic]
            );
          },
          []
        )
      }}
    >
      {children}

      {characteristics.map(characteristic => (
        <CharacteristicConnection
          key={characteristic.deviceID}
          characteristic={characteristic}
        />
      ))}
    </BLEContext.Provider>
  );
}
