export async function getLines({
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

  // console.log('hasWraparound', hasWraparound, edges);

  firstTsOfForeground =
    firstTsOfForeground != null
      ? firstTsOfForeground + wraparoundMillis < lastTs
        ? firstTsOfForeground +
          wraparoundMillis *
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
