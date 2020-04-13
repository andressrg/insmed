import 'react-native';
import { parseData } from '../../src/utils';

it('Should parse data', () => {
  test(
    ['t2831p10.2;t3131p12.2;t3531p14.2;'],
    [
      {
        pressure: [
          { t: 2831, p: 10.2 },
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
    ]
  );

  test(
    ['t1831p10.2;', 'sp10;', 'sb12;', 'si13;', 't2831p10.2;t3131'],
    [
      { pressure: [{ t: 1831, p: 10.2 }] },
      {
        pressure: [],
        presControl: 10,
      },
      {
        pressure: [],
        bpm: 12,
      },
      {
        pressure: [],
        ieRatio: 13,
      },
      { pressure: [{ t: 2831, p: 10.2 }] },
    ]
  );

  test(
    ['t2831p10.2;t3131', 'p12.2;t3531p14.2'],
    [
      { pressure: [{ t: 2831, p: 10.2 }] },
      {
        pressure: [
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
    ]
  );
  test(
    ['t283', '1p10.2;t3131p12.2;t3531p14.2'],
    [
      { pressure: [] },
      {
        pressure: [
          { t: 2831, p: 10.2 },
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
    ]
  );
  test(
    ['t283', '0.2;t3131p12.2;t3531p14.2'],
    [
      { pressure: [] },
      {
        pressure: [
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
    ]
  );

  test(
    ['t283', '0.2;t3131p12.2;t3531p14.2', ';'],
    [
      { pressure: [] },
      {
        pressure: [
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
      { pressure: [] },
    ]
  );
  test(
    ['t283', '0.2;t3131p12.2;t3531p14.2', ';;;'],
    [
      { pressure: [] },
      {
        pressure: [
          { t: 3131, p: 12.2 },
          { t: 3531, p: 14.2 },
        ],
      },
      { pressure: [] },
    ]
  );
});

function test(cases, expectedList) {
  const cacheRef = { current: '' };
  cases.forEach((caseItem, index) => {
    expect(parseData({ data: caseItem, cacheRef })).toEqual(
      expectedList[index]
    );
  });
}
