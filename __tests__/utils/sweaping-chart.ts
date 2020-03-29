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
        { ts: 100, millis: 0, y: 1 },
        { ts: 100, millis: 1, y: 2 },
        { ts: 110, millis: 2, y: 3 },
        { ts: 110, millis: 0, y: 4 },
        { ts: 120, millis: 1, y: 5 }
      ]
    })
  ).toEqual([
    { ts: 100, y: 1 },
    { ts: 101, y: 2 },
    { ts: 102, y: 3 },
    { ts: 110, y: 4 },
    { ts: 111, y: 5 }
  ]);

  expect(
    correctTs({
      contextRef,
      data: [
        { ts: 130, millis: 2, y: 6 },
        { ts: 130, millis: 3, y: 7 },
        { ts: 140, millis: 0, y: 8 }
      ]
    })
  ).toEqual([
    { ts: 112, y: 6 },
    { ts: 113, y: 7 },
    { ts: 140, y: 8 }
  ]);
});

it('empty', async () => {
  const contextRef = { current: {} };

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef,
      query: async ({ cursor }) => ({ edges: [] })
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: []
    })
  );
});

it('works 3', async () => {
  const baseTs = Date.now();
  const contextRef = { current: initCorrectTsRef() };

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef,
      query: async ({ cursor }) => ({
        edges: [{ ts: baseTs, millis: 100, y: 1 }]
      })
    })
  ).toEqual(
    expect.objectContaining({
      background: [],
      foreground: [{ x: 0, y: 1 }],
      firstTsOfForeground: baseTs
    })
  );

  expect(contextRef.current).toEqual(expect.objectContaining({}));
});

it('works 2', async () => {
  const baseTs = Date.now();
  const contextRef = { current: initCorrectTsRef() };

  expect(
    await getLines({
      wraparoundMillis: WRAPAROUND_MILLIS,
      contextRef,
      query: async ({ cursor }) => ({
        edges: [
          { ts: baseTs - (WRAPAROUND_MILLIS + 10), millis: 0, y: 1 },
          { ts: baseTs - (WRAPAROUND_MILLIS - 10), millis: 20, y: 2 },
          { ts: baseTs, millis: WRAPAROUND_MILLIS + 10, y: 3 }
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
});

// it('works 2', async () => {
//   const baseTs = Date.now();
//   const contextRef = { current: {} };

//   expect(
//     await getLines({
//       wraparoundMillis: WRAPAROUND_MILLIS,
//       contextRef,
//       query: async ({ cursor }) => ({
//         edges: [
//           { ts: baseTs, y: 1 },
//           { ts: baseTs + 10, y: 2 }
//         ]
//       })
//     })
//   ).toEqual(
//     expect.objectContaining({
//       background: [],
//       foreground: [
//         { x: 0, y: 1 },
//         { x: 10, y: 2 }
//       ],
//       firstTsOfForeground: baseTs
//     })
//   );
// });

// it('works 2', async () => {
//   const baseTs = Date.now();
//   const contextRef = { current: {} };

//   expect(
//     await getLines({
//       wraparoundMillis: WRAPAROUND_MILLIS,
//       contextRef,
//       firstTsOfForeground: baseTs,
//       query: async ({ cursor }) => ({
//         edges: [
//           { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
//           { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
//           { ts: baseTs, y: 3 },
//           { ts: baseTs + 10, y: 4 }
//         ]
//       })
//     })
//   ).toEqual(
//     expect.objectContaining({
//       background: [{ x: 10, y: 2 }],
//       foreground: [
//         { x: 0, y: 3 },
//         { x: 10, y: 4 }
//       ],
//       firstTsOfForeground: baseTs
//     })
//   );
// });

// it('works 2', async () => {
//   const baseTs = Date.now();
//   const contextRef = { current: {} };

//   expect(
//     await getLines({
//       wraparoundMillis: WRAPAROUND_MILLIS,
//       contextRef,
//       firstTsOfForeground: baseTs,
//       query: async ({ cursor }) => {
//         expect(cursor).toEqual(baseTs - WRAPAROUND_MILLIS);
//         return {
//           edges: [
//             { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
//             { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
//             { ts: baseTs, y: 3 },
//             { ts: baseTs + 10, y: 4 },
//             { ts: baseTs + WRAPAROUND_MILLIS + 10, y: 5 }
//           ]
//         };
//       }
//     })
//   ).toEqual(
//     expect.objectContaining({
//       background: [
//         { x: 0, y: 3 },
//         { x: 10, y: 4 }
//       ],
//       foreground: [{ x: 10, y: 5 }],
//       firstTsOfForeground: baseTs + WRAPAROUND_MILLIS
//     })
//   );
// });
