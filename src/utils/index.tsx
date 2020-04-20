type IData = {
  t: number;
  p: number;
};

function isDigitOrDot(val: string) {
  return /^[\d\.]$/.test(val);
}

export const parseData = ({
  data,
  cacheRef,
}: {
  data: string;
  cacheRef: { current: string };
}): {
  pressure?: IData[];

  presControl?: number;
  bpm?: number;
  ieRatio?: number;

  pip?: number;
  peep?: number;
  cycleCount?: number;
} => {
  const dataToParse = cacheRef.current + data;
  cacheRef.current = '';
  let array = dataToParse.split(';').filter((s) => s !== '');

  const endsWithColon = dataToParse.endsWith(';');
  let lastItem: string | undefined;
  if (endsWithColon === false) {
    lastItem = array.slice(-1)[0];
    array = array.slice(0, -1);
  }

  let presControl: number | undefined;
  let bpm: number | undefined;
  let ieRatio: number | undefined;

  let pip: number | undefined;
  let peep: number | undefined;
  let cycleCount: number | undefined;

  let dataArray: IData[] = [];

  for (let item of array) {
    if (item.startsWith('sp')) {
      const itemNoS = item.replace('sp', '');

      const parsed = parseInt(itemNoS);

      if (Number.isNaN(parsed) === false) presControl = parsed;
    } else if (item.startsWith('sb')) {
      const itemNoS = item.replace('sb', '');

      const parsed = parseInt(itemNoS);

      if (Number.isNaN(parsed) === false) bpm = parsed;
    } else if (item.startsWith('si')) {
      const itemNoS = item.replace('si', '');

      const parsed = parseInt(itemNoS);

      if (Number.isNaN(parsed) === false) ieRatio = parsed;
    } else {
      let parts: string[] = [];
      for (const char of item) {
        if (isDigitOrDot(char)) {
          parts[parts.length - 1] += char;
        } else {
          parts.push(char);
        }
      }

      let pressure: number | undefined;
      let time: number | undefined;

      for (const part of parts) {
        if (part.startsWith('p')) {
          pressure = parseFloat(part.replace('p', ''));
        } else if (part.startsWith('t')) {
          time = parseInt(part.replace('t', ''), 10);
        } else if (part.startsWith('i')) {
          const parsed = parseFloat(part.replace('i', ''));
          if (Number.isNaN(parsed) === false) pip = parsed;
        } else if (part.startsWith('e')) {
          const parsed = parseFloat(part.replace('e', ''));
          if (Number.isNaN(parsed) === false) peep = parsed;
        } else if (part.startsWith('n')) {
          const parsed = parseFloat(part.replace('n', ''));
          if (Number.isNaN(parsed) === false) cycleCount = parsed;
        }
      }

      if (
        time != null &&
        !Number.isNaN(time) &&
        pressure != null &&
        !Number.isNaN(pressure)
      ) {
        dataArray.push({ t: time, p: pressure });
      }
    }
  }

  if (lastItem != null) {
    cacheRef.current += lastItem ?? '';
  }

  return {
    pressure: dataArray,

    presControl,
    ieRatio,
    bpm,

    pip,
    peep,
    cycleCount,
  };
};
