interface IContext {
  offset: number;
  prevMillis: number;
  cursor: number;
  firstTsOfForeground: number;
}

export function initCorrectTsRef(): IContext {
  return { offset: -1, prevMillis: -1, cursor: -1, firstTsOfForeground: -1 };
}

interface BasePoint {
  id: number;
  ts: number;
  millis: number;
  y: number;
}

export function correctTs<T extends BasePoint>({
  contextRef,
  data
}: {
  contextRef: { current: IContext };
  data: T[];
}): { ts: number; raw: T }[] {
  return data.map(p => {
    if (
      contextRef.current.offset < 0 ||
      (contextRef.current.prevMillis > 0 &&
        p.millis < contextRef.current.prevMillis)
    ) {
      contextRef.current.offset = p.ts - p.millis;
    }

    contextRef.current.prevMillis = p.millis;

    return { ts: p.millis + contextRef.current.offset, raw: p };
  });
}

export function getLines({
  data,
  contextRef,
  wraparoundMillis
}: {
  wraparoundMillis: number;
  contextRef: { current: IContext };
  data: { ts: number; y: number; id: number }[];
}) {
  const firstTs = data[0]?.ts as number | undefined;
  const lastTs = data[data.length - 1]?.ts as number | undefined;

  const hasWraparound = wraparoundMillis < (lastTs ?? 0) - (firstTs ?? 0);

  contextRef.current.firstTsOfForeground =
    contextRef.current.firstTsOfForeground > 0
      ? contextRef.current.firstTsOfForeground + wraparoundMillis <
        (lastTs ?? 0)
        ? contextRef.current.firstTsOfForeground +
          wraparoundMillis *
            Math.floor(
              ((lastTs ?? 0) - contextRef.current.firstTsOfForeground) /
                wraparoundMillis
            )
        : contextRef.current.firstTsOfForeground
      : hasWraparound
      ? lastTs ?? 0
      : firstTs ?? 0;

  const offset =
    (hasWraparound ? contextRef.current.firstTsOfForeground : firstTs ?? 0) %
    wraparoundMillis;

  return {
    background: (hasWraparound
      ? data.filter(
          p =>
            contextRef.current.firstTsOfForeground! - wraparoundMillis <=
              p.ts && p.ts < contextRef.current.firstTsOfForeground!
        )
      : []
    ).map(p => ({
      id: p.id,
      x: (p.ts - offset) % wraparoundMillis,
      y: p.y
    })),

    foreground: (hasWraparound
      ? data.filter(p => contextRef.current.firstTsOfForeground! <= p.ts)
      : data
    ).map(p => ({
      id: p.id,
      x: (p.ts - offset) % wraparoundMillis,
      y: p.y
    }))
  };
}
