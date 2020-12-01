type IData = {
  t: number;
  p: number;
};

function isDigitOrDot(val: string) {
  return /^[\d\.-]$/.test(val);
}

export const parseData = ({
  data,
  cacheRef,
}: {
  data: string;
  cacheRef: { current: string };
}): {
  pressure?: IData[];
  flow?: IData[];

  presControl?: number;
  bpm?: number;
  ieRatio?: number;

  pip?: number;
  peep?: number;
  volume?: number;
  mode?: number;
  cycleCount?: number;
  sens?: number;
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
  let sens: number | undefined;
  let volume: number | undefined;
  let mode: number | undefined;

  let pressureDataArray: IData[] = [];
  let flowDataArray: IData[] = [];

  for (let item of array) {
    if (item.startsWith('sp')) {
      const itemNoS = item.replace('sp', '');

      const parsed = parseInt(itemNoS, 10);

      if (Number.isNaN(parsed) === false) presControl = parsed;
    } else if (item.startsWith('sb')) {
      const itemNoS = item.replace('sb', '');

      const parsed = parseInt(itemNoS, 10);

      if (Number.isNaN(parsed) === false) bpm = parsed;
    } else if (item.startsWith('si')) {
      const itemNoS = item.replace('si', '');

      const parsed = parseInt(itemNoS, 10);

      if (Number.isNaN(parsed) === false) ieRatio = parsed;
    } else if (item.startsWith('sm')) {
      const itemNoS = item.replace('sm', '');

      const parsed = parseInt(itemNoS, 10);

      if (Number.isNaN(parsed) === false) mode = parsed;
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
      let flow: number | undefined;
      let time: number | undefined;

      for (const part of parts) {
        if (part.startsWith('p')) {
          pressure = parseFloat(part.replace('p', ''));
        } else if (part.startsWith('f')) {
          flow = parseFloat(part.replace('f', ''));
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
        } else if (part.startsWith('j')) {
          const parsed = parseFloat(part.replace('j', ''));
          if (Number.isNaN(parsed) === false) sens = parsed;
        } else if (part.startsWith('v')) {
          const parsed = parseFloat(part.replace('v', ''));
          if (Number.isNaN(parsed) === false) volume = parsed;
        } else if (part.startsWith('m')) {
          const parsed = parseInt(part.replace('m', ''), 10);
          if (Number.isNaN(parsed) === false) mode = parsed;
        }
      }

      if (
        time != null &&
        !Number.isNaN(time) &&
        pressure != null &&
        !Number.isNaN(pressure)
      ) {
        pressureDataArray.push({ t: time, p: pressure });
      }
      if (
        time != null &&
        !Number.isNaN(time) &&
        flow != null &&
        !Number.isNaN(flow)
      ) {
        flowDataArray.push({ t: time, p: flow });
      }
    }
  }

  if (lastItem != null) {
    cacheRef.current += lastItem ?? '';
  }

  return {
    pressure: pressureDataArray,
    flow: flowDataArray.length > 0 ? flowDataArray : undefined,

    presControl,
    ieRatio,
    bpm,

    pip,
    peep,
    volume,
    mode,
    cycleCount,
    sens,
  };
};
