import 'react-native';

async function getLines({
  cursor,
  wraparoundMillis,
  firstTsOfForeground,
  query
}: {
  cursor?: string;
  wraparoundMillis: number;
  firstTsOfForeground?: number;
  query: (p: {
    first: number;
    cursor?: number;
  }) => Promise<{
    edges: { ts: number; y: number }[];
    cursor?: string;
  }>;
}) {
  const { edges } = await query({
    first: 500,
    cursor: firstTsOfForeground && firstTsOfForeground - wraparoundMillis
  });

  const firstTs = edges[0]?.ts;
  const lastTs = edges[edges.length - 1]?.ts;

  const hasWraparound = wraparoundMillis < (lastTs ?? 0) - (firstTs ?? 0);

  firstTsOfForeground =
    firstTsOfForeground != null
      ? firstTsOfForeground + wraparoundMillis < lastTs
        ? firstTsOfForeground +
          WRAPAROUND_MILLIS *
            Math.floor((lastTs - firstTsOfForeground) / wraparoundMillis)
        : firstTsOfForeground
      : hasWraparound
      ? lastTs
      : firstTs;

  const offset =
    (hasWraparound ? firstTsOfForeground : edges[0]?.ts ?? 0) %
    wraparoundMillis;

  return {
    background: (hasWraparound
      ? edges.filter(
          p =>
            firstTsOfForeground! - wraparoundMillis <= p.ts &&
            p.ts < firstTsOfForeground!
        )
      : []
    ).map(p => ({
      x: (p.ts - offset) % wraparoundMillis,
      y: p.y
    })),

    foreground: (hasWraparound
      ? edges.filter(p => firstTsOfForeground! <= p.ts)
      : edges
    ).map(p => ({
      x: (p.ts - offset) % wraparoundMillis,
      y: p.y
    })),

    firstTsOfForeground
  };
}

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
      query: async ({ cursor }) => ({
        edges: [
          { ts: baseTs - (WRAPAROUND_MILLIS + 10), y: 1 },
          { ts: baseTs - (WRAPAROUND_MILLIS - 10), y: 2 },
          { ts: baseTs, y: 3 },
          { ts: baseTs + 10, y: 4 },
          { ts: baseTs + WRAPAROUND_MILLIS + 10, y: 5 }
        ]
      })
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
