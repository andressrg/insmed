import React from 'react';
import SQLite from 'react-native-sqlite-storage';
import { useAsync, AsyncState } from 'react-async';

const DATABASE_NAME = 'insmed.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'SQLite insmed Database';
const DATABASE_SIZE = 200000;

if (__DEV__) {
  SQLite.DEBUG(true);
}

SQLite.enablePromise(true);

function getRows<T>(rows: { length: number; item: (i: number) => T }) {
  const len = rows.length;

  let items: T[] = [];
  for (let i = 0; i < len; i++) {
    items.push(rows.item(i));
  }

  return items;
}

async function runQuery<T>(conn, query, args?): Promise<T[]> {
  const [result] = await conn.executeSql(query, args);

  return getRows(result.rows);
}

export const SQLiteContext = React.createContext<{
  getMeasurements?: (p: {
    deviceId;
    first?: number;
    cursor?: number;
  }) => Promise<
    {
      id: number;
      timestamp: number;
      external_timestamp: number;
      name: string;
      value: number;
      raw: string;
    }[]
  >;

  insertMeasurements?: (
    t: {
      device_id: number;
      timestamp: number;
      external_timestamp: number;
      type: string;
      value: number;
      raw: string;
    }[]
  ) => // ) => Promise<{ id: string }[]>;
  Promise<void>;

  getDevices?: () => Promise<
    {
      id: number;
      hardware_id: string;
      name: string;
    }[]
  >;

  getDeviceById?: (p: {
    hardware_id: string;
  }) => Promise<
    {
      id: number;
      hardware_id: string;
      name: string;
    }[]
  >;

  devicesAsync?: AsyncState<
    {
      id: number;
      hardware_id: string;
      name: string;
    }[]
  >;

  getOrCreateDevice?: (p: {
    hardware_id: string;
    name: string;
  }) => Promise<{ id }>;
}>({});

async function setupDb(): Promise<{ db }> {
  await SQLite.echoTest();

  const db = await SQLite.openDatabase(
    DATABASE_NAME,
    DATABASE_VERSION,
    DATABASE_DISPLAY_NAME,
    // @ts-ignore
    DATABASE_SIZE
  );

  const dbStatus = await runQuery<{ version_id: number }>(
    db,
    ` SELECT * FROM version LIMIT 1`
  ).then(
    (rows) => rows[0] ?? null,
    () => null
  );

  if (dbStatus && dbStatus.version_id < 2) {
    await SQLite.deleteDatabase(
      // @ts-ignore
      DATABASE_NAME
    );

    return setupDb();
  } else if (dbStatus == null) {
    db.executeSql(`PRAGMA foreign_keys = ON`);

    await db.transaction(async (trx) => {
      trx.executeSql(
        `
          CREATE TABLE IF NOT EXISTS version(
            version_id INTEGER PRIMARY KEY NOT NULL
          );
        `
      );

      trx.executeSql('INSERT INTO version (version_id) values (2);');

      trx.executeSql(
        `
          CREATE TABLE IF NOT EXISTS device (
            id INTEGER PRIMARY KEY,
            hardware_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
          );
        `
      );

      trx.executeSql(
        `
          CREATE TABLE IF NOT EXISTS measurement (
            id INTEGER PRIMARY KEY,
            device_id INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            external_timestamp INTEGER NOT NULL,
            type TEXT NOT NULL,
            value REAL NOT NULL,
            raw TEXT NOT NULL,

            FOREIGN KEY (device_id)
              REFERENCES device (id)
          );
        `
      );

      trx.executeSql(
        `
          CREATE INDEX idx_measurement_device_type_timestamp_value
          ON measurement (device_id, type, timestamp desc, value);
        `
      );
    });

    // if (__DEV__) {
    //   await db.transaction(async trx => {
    //     trx.executeSql(
    //       `
    //         INSERT INTO device (id, name, created_at)
    //         VALUES (?, ?, ?);
    //       `,
    //       [1, 'Test device', Date.now()]
    //     );

    //     const values = Array.from(Array(100)).map(() => ({
    //       device_id: 1,
    //       timestamp: Date.now(),
    //       external_timestamp: Date.now(),
    //       type: 'pressure',
    //       value: Math.random() * 70,
    //       raw: 'raw'
    //     }));

    //     trx.executeSql(
    //       `
    //         INSERT INTO measurement (device_id, timestamp, external_timestamp, type, value, raw)
    //         VALUES
    //           ${values.map(() => `(?, ?, ?, ?, ?, ?)`)};
    //       `,
    //       values.reduce(
    //         (acc, row) => [
    //           ...acc,
    //           row.device_id,
    //           row.timestamp,
    //           row.external_timestamp,
    //           row.type,
    //           row.value,
    //           row.raw
    //         ],
    //         [] as any
    //       )
    //     );
    //   });
    // }
  }

  // await SQLite.deleteDatabase(
  //   // @ts-ignore
  //   DATABASE_NAME
  // );

  return { db };
}

export function SQLiteContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbPromise = useAsync({
    promiseFn: setupDb,
  });

  const getDevices = React.useCallback(
    () =>
      dbPromise.promise.then(({ db }) =>
        runQuery<{
          id: number;
          hardware_id: string;
          name: string;
        }>(
          db,
          `
            SELECT
              id,
              hardware_id,
              name

            FROM device

            order by device.name
          `
        )
      ),
    [dbPromise.promise]
  );

  const devicesAsync = useAsync({
    promiseFn: getDevices,
  });

  const getDeviceById = React.useCallback(
    ({ hardware_id }) =>
      dbPromise.promise.then(({ db }) =>
        runQuery<{
          id: number;
          hardware_id: string;
          name: string;
        }>(
          db,
          `
            SELECT
              id,
              hardware_id,
              name

            FROM device
            where hardware_id = ?1
            order by device.name
          `,
          [hardware_id]
        )
      ),
    [dbPromise.promise]
  );

  return (
    <SQLiteContext.Provider
      value={{
        getMeasurements: React.useCallback(
          ({ deviceId, first = 500, cursor }) => {
            return dbPromise.promise.then(({ db }) =>
              runQuery<{
                id: number;
                timestamp: number;
                external_timestamp: number;
                name: string;
                value: number;
                raw: string;
              }>(
                db,
                `
                  SELECT
                    id,
                    timestamp,
                    external_timestamp,
                    value

                  FROM measurement

                  where
                    measurement.type = 'pressure'
                    and device_id = ?1
                    ${cursor == null ? '' : 'and ?3 <= measurement.id'}

                  order by
                    measurement.id desc

                  limit ?2
                `,
                cursor == null ? [deviceId, first] : [deviceId, first, cursor]
              )
            );
          },
          [dbPromise.promise]
        ),

        getDevices,

        getDeviceById,

        devicesAsync,

        insertMeasurements: React.useCallback(
          async (p) => {
            const { db } = await dbPromise.promise;

            await db.executeSql(
              `
                INSERT INTO measurement (device_id, timestamp, external_timestamp, type, value, raw)
                VALUES
                  ${p.map(() => `(?, ?, ?, ?, ?, ?)`)};
              `,
              p.reduce(
                (acc, row) => [
                  ...acc,
                  row.device_id,
                  row.timestamp,
                  row.external_timestamp,
                  row.type,
                  row.value,
                  row.raw,
                ],
                [] as any
              )
            );
          },
          [dbPromise.promise]
        ),

        getOrCreateDevice: React.useCallback(
          async (p) => {
            const { db } = await dbPromise.promise;

            const deviceId = await runQuery<{ id: number }>(
              db,
              `
                select id
                from device
                where
                  device.hardware_id = ?
              `,
              [p.hardware_id]
            ).then(
              (rows) =>
                rows[0]?.id ??
                db
                  .executeSql(
                    `
                      INSERT INTO device (hardware_id, name, created_at)
                      VALUES (?, ?, ?)
                    `,
                    [p.hardware_id, p.name, Date.now()]
                  )
                  .then((result) => result[0].insertId as number)
            );

            await devicesAsync.reload();

            return { id: deviceId };
          },
          [dbPromise.promise, devicesAsync]
        ),
      }}
    >
      {children}
    </SQLiteContext.Provider>
  );
}
