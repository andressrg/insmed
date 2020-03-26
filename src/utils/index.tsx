type data = {
  t: number;
  p: number;
};

export const parseData = ({
  data,
  cacheRef
}: {
  data: string;
  cacheRef: { current: string };
}): data[] => {
  const array = data.split(';').filter(s => s !== '');

  const dataArray = array.map(item => {
    if (cacheRef.current !== '') {
      item = cacheRef.current + item;
    }

    const indexOfP: number = item.indexOf('p');
    const indexOfT: number = item.indexOf('t');

    if (indexOfP >= 0) {
      const p = item.slice(indexOfP + 1, item.length);
      const t = item.slice(indexOfT + 1, indexOfP);

      cacheRef.current = '';

      return { t: parseInt(t, 10), p: parseFloat(p) };
    } else if (indexOfP < 0 && cacheRef.current !== '') {
      cacheRef.current = '';
    } else {
      cacheRef.current = item.slice(indexOfT, item.length);
    }

    return null;
  });

  return dataArray.filter(x => x != null) as data[];
};
