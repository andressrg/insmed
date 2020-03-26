import React from 'react';
import SQLite from 'react-native-sqlite-storage';
import { useAsync } from 'react-async';

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
  }) => Promise<
    {
      id: number;
      timestamp: number;
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
}>({});

async function setupDb() {
  await SQLite.echoTest();

  const db = await SQLite.openDatabase(
    DATABASE_NAME,
    DATABASE_VERSION,
    DATABASE_DISPLAY_NAME,
    // @ts-ignore
    DATABASE_SIZE
  );

  const [results] =
    ((await db
      .executeSql('SELECT * FROM version LIMIT 1')
      .catch(() => null)) as [{ rows: { item; length } }] | null) ?? [];

  const dbReady = results != null;

  if (!dbReady) {
    db.executeSql(`PRAGMA foreign_keys = ON`);

    await db.transaction(async trx => {
      trx.executeSql(
        `
          CREATE TABLE IF NOT EXISTS version(
            version_id INTEGER PRIMARY KEY NOT NULL
          );
        `
      );

      trx.executeSql('INSERT INTO version (version_id) values (1);');

      trx.executeSql(
        `
          CREATE TABLE IF NOT EXISTS device (
            id INTEGER PRIMARY KEY,
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

    if (__DEV__) {
      await db.transaction(async trx => {
        trx.executeSql(
          `
            INSERT INTO device (id, name, created_at)
            VALUES (?, ?, ?);
          `,
          [1, 'Test device', Date.now()]
        );

        const values = Array.from(Array(100)).map(() => ({
          device_id: 1,
          timestamp: Date.now(),
          external_timestamp: Date.now(),
          type: 'pressure',
          value: Math.random() * 70,
          raw: 'raw'
        }));

        trx.executeSql(
          `
            INSERT INTO measurement (device_id, timestamp, external_timestamp, type, value, raw)
            VALUES
              ${values.map(() => `(?, ?, ?, ?, ?, ?)`)};
          `,
          values.reduce(
            (acc, row) => [
              ...acc,
              row.device_id,
              row.timestamp,
              row.external_timestamp,
              row.type,
              row.value,
              row.raw
            ],
            [] as any
          )
        );
      });
    }
  }

  // await SQLite.deleteDatabase(
  //   // @ts-ignore
  //   DATABASE_NAME
  // );

  return { db };
}

export function SQLiteContextProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const dbPromise = useAsync({
    promiseFn: setupDb
  });

  return (
    <SQLiteContext.Provider
      value={{
        getMeasurements: React.useCallback(
          ({ deviceId }) =>
            dbPromise.promise.then(({ db }) =>
              runQuery<{
                id: number;
                timestamp: number;
                name: string;
                value: number;
                raw: string;
              }>(
                db,
                `
                  SELECT *
                  FROM measurement
                  where
                    measurement.type = 'pressure'
                    and device_id = ?
                  order by measurement.timestamp desc
                  limit 500
                `,
                [deviceId]
              )
            ),
          [dbPromise.promise]
        ),

        insertMeasurements: React.useCallback(
          async p => {
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
                  row.raw
                ],
                [] as any
              )
            );
          },
          [dbPromise.promise]
        )
      }}
    >
      {children}
    </SQLiteContext.Provider>
  );
}
