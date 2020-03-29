import 'react-native';

import { getLines } from '../../src/utils/charts';

const WRAPAROUND_MILLIS = 1 * 60 * 1000;

it('works', async () => {
  const baseTs = Date.now();

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      query: async ({ cursor }) => ({ edges: [] })
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: []
    })
  );

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      query: async ({ cursor }) => ({
        edges: [{ ts: baseTs, y: 1 }]
      })
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: [{ x: 0, y: 1 }],
      firstTsOfForeground: baseTs
    })
  );

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      query: async ({ cursor }) => ({
        edges: [
          { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
          { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
          { ts: baseTs, y: 3 }
        ]
      })
    })
  ).toEqual(
    expect.objectContaining({
      background: [{ x: 10, y: 2 }],
      foreground: [{ x: 0, y: 3 }],
      firstTsOfForeground: baseTs
    })
  );

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      query: async ({ cursor }) => ({
        edges: [
          { ts: baseTs, y: 1 },
          { ts: baseTs + 10, y: 2 }
        ]
      })
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: [
        { x: 0, y: 1 },
        { x: 10, y: 2 }
      ],
      firstTsOfForeground: baseTs
    })
  );

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      firstTsOfForeground: baseTs,
      query: async ({ cursor }) => ({
        edges: [
          { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
          { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
          { ts: baseTs, y: 3 },
          { ts: baseTs + 10, y: 4 }
        ]
      })
    })
  ).toEqual(
    expect.objectContaining({
      background: [{ x: 10, y: 2 }],
      foreground: [
        { x: 0, y: 3 },
        { x: 10, y: 4 }
      ],
      firstTsOfForeground: baseTs
    })
  );

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      firstTsOfForeground: baseTs,
      query: async ({ cursor }) => {
        expect(cursor).toEqual(baseTs - WRAPAROUND_MILLIS);
        return {
          edges: [
            { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
            { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
            { ts: baseTs, y: 3 },
            { ts: baseTs + 10, y: 4 },
            { ts: baseTs + WRAPAROUND_MILLIS + 10, y: 5 }
          ]
        };
      }
    })
  ).toEqual(
    expect.objectContaining({
      background: [
        { x: 0, y: 3 },
        { x: 10, y: 4 }
      ],
      foreground: [{ x: 10, y: 5 }],
      firstTsOfForeground: baseTs + WRAPAROUND_MILLIS
    })
  );
});
