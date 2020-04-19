type IData = {
  t: number;
  p: number;
};

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
      const indexOfP: number = item.indexOf('p');
      const indexOfT: number = item.indexOf('t');

      if (indexOfP >= 0) {
        const p = parseFloat(item.slice(indexOfP + 1, item.length));
        const t = parseInt(item.slice(indexOfT + 1, indexOfP), 10);

        if (!Number.isNaN(t) && !Number.isNaN(p)) {
          dataArray.push({ t, p });
        }
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
  };
};
