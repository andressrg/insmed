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
  const array = data.split(';').filter((s) => s !== '');

  let presControl;
  let bpm;
  let ieRatio;

  let dataArray: IData[] = [];

  for (let item of array) {
    item = cacheRef.current + item;

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
        const p = item.slice(indexOfP + 1, item.length);
        const t = item.slice(indexOfT + 1, indexOfP);

        cacheRef.current = '';

        dataArray.push({ t: parseInt(t, 10), p: parseFloat(p) });
      } else if (indexOfP < 0 && cacheRef.current !== '') {
        cacheRef.current = '';
      } else {
        cacheRef.current = item.slice(indexOfT, item.length);
      }
    }
  }

  return {
    pressure: dataArray,

    presControl,
    ieRatio,
    bpm,
  };
};
