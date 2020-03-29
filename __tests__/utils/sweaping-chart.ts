import 'react-native';

import { getLines, initCorrectTsRef, correctTs } from '../../src/utils/charts';

const WRAPAROUND_MILLIS = 1 * 60 * 1000;

it('corrects ts', () => {
  const contextRef = { current: initCorrectTsRef() };

  expect(correctTs({ contextRef, data: [] })).toEqual([]);

  expect(
    correctTs({
      contextRef,
      data: [
        { id: 1, ts: 100, millis: 0, y: 1 },
        { id: 2, ts: 100, millis: 1, y: 2 },
        { id: 3, ts: 110, millis: 2, y: 3 },
        { id: 4, ts: 110, millis: 0, y: 4 },
        { id: 5, ts: 120, millis: 1, y: 5 }
      ]
    })
  ).toEqual([
    { ts: 100, raw: expect.objectContaining({ y: 1 }) },
    { ts: 101, raw: expect.objectContaining({ y: 2 }) },
    { ts: 102, raw: expect.objectContaining({ y: 3 }) },
    { ts: 110, raw: expect.objectContaining({ y: 4 }) },
    { ts: 111, raw: expect.objectContaining({ y: 5 }) }
  ]);

  expect(
    correctTs({
      contextRef,
      data: [
        { id: 6, ts: 130, millis: 2, y: 6 },
        { id: 7, ts: 130, millis: 3, y: 7 },
        { id: 8, ts: 140, millis: 0, y: 8 }
      ]
    })
  ).toEqual([
    { ts: 112, raw: expect.objectContaining({ y: 6 }) },
    { ts: 113, raw: expect.objectContaining({ y: 7 }) },
    { ts: 140, raw: expect.objectContaining({ y: 8 }) }
  ]);
});

it('divides front and back lines', async () => {
  const baseTs = Date.now();

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: { current: initCorrectTsRef() },
      data: []
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: []
    })
  );

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: { current: initCorrectTsRef() },
      data: [{ ts: baseTs, y: 1, id: 1 }]
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: [{ x: 0, y: 1, id: 1 }]
    })
  );

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: { current: initCorrectTsRef() },
      data: [
        { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1, id: 1 },
        { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2, id: 2 },
        { ts: baseTs, y: 3, id: 3 }
      ]
    })
  ).toEqual(
    expect.objectContaining({
      background: [{ x: 10, y: 2, id: 2 }],
      foreground: [{ x: 0, y: 3, id: 3 }]
    })
  );

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: { current: initCorrectTsRef() },
      data: [
        { ts: baseTs, y: 1, id: 1 },
        { ts: baseTs + 10, y: 2, id: 2 }
      ]
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: [
        { x: 0, y: 1, id: 1 },
        { x: 10, y: 2, id: 2 }
      ]
    })
  );

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: {
        current: { ...initCorrectTsRef(), firstTsOfForeground: baseTs }
      },
      data: [
        { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1, id: 1 },
        { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2, id: 2 },
        { ts: baseTs, y: 3, id: 3 },
        { ts: baseTs + 10, y: 4, id: 4 }
      ]
    })
  ).toEqual(
    expect.objectContaining({
      background: [{ x: 10, y: 2, id: 2 }],
      foreground: [
        { x: 0, y: 3, id: 3 },
        { x: 10, y: 4, id: 4 }
      ]
    })
  );

  expect(
    getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef: {
        current: { ...initCorrectTsRef(), firstTsOfForeground: baseTs }
      },
      data: [
        { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1, id: 1 },
        { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2, id: 2 },
        { ts: baseTs, y: 3, id: 3 },
        { ts: baseTs + 10, y: 4, id: 4 },
        { ts: baseTs + WRAPAROUND_MILLIS + 10, y: 5, id: 5 }
      ]
    })
  ).toEqual(
    expect.objectContaining({
      background: [
        { x: 0, y: 3, id: 3 },
        { x: 10, y: 4, id: 4 }
      ],
      foreground: [{ x: 10, y: 5, id: 5 }]
    })
  );
});
