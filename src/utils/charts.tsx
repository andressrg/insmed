interface IContext {
  offset: number;
  prevMillis: number;
  cursor: number;
}

export function initCorrectTsRef(): IContext {
  return { offset: -1, prevMillis: -1, cursor: -1 };
}

export function correctTs<T>({
  contextRef,
  data
}: {
  contextRef: { current: IContext };
  data: { ts: number; millis: number; y: T }[];
}): { ts: number; y: T }[] {
  return data.map(p => {
    if (
      contextRef.current.offset < 0 ||
      (contextRef.current.prevMillis > 0 &&
        p.millis < contextRef.current.prevMillis)
    ) {
      contextRef.current.offset = p.ts - p.millis;
    }

    contextRef.current.prevMillis = p.millis;

    return { ts: p.millis + contextRef.current.offset, y: p.y };
  });
}

export async function getLines({
  wraparoundMillis,
  firstTsOfForeground,
  query,
  contextRef
}: {
  cursor?: string;
  wraparoundMillis: number;
  firstTsOfForeground?: number;
  contextRef: { current: IContext };
  query: (p: {
    first: number;
    cursor?: number;
  }) => Promise<{
    edges: { ts: number; millis: number; y: number }[];
    cursor?: string;
  }>;
}) {
  const edges = await query({
    first: 500,
    cursor: firstTsOfForeground && firstTsOfForeground - wraparoundMillis
  }).then(({ edges }) => correctTs({ contextRef, data: edges }));

  const firstTs = edges[0]?.ts;
  const lastTs = edges[edges.length - 1]?.ts;

  const hasWraparound = wraparoundMillis < (lastTs ?? 0) - (firstTs ?? 0);

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
