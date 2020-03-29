import React from 'react';

import { VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';

const X_DURATION = 0.5 * 60 * 1000;

export function Chart({ data }: { data: { x: number; y: number }[] }) {
  // const [data, setData] = React.useState<{ x: number; y: number }[]>([]);
  // const [newData, setNewData] = React.useState<{ x: number; y: number }[]>([]);
  // const [startTime] = React.useState(() => Date.now());
  const [startTime, setStartTime] = React.useState(() => 0);
  const [startData, setStartData] = React.useState(() => 0);

  React.useEffect(() => {
    if (startTime === 0 && data.length > 0) {
      // setStartTime(Date.now());
      setStartData(data[0].x);
    }
  }, [data, startTime]);

  // React.useEffect(() => {
  //   let stop = false;
  //   const fn = () => {
  //     if (stop) return;

  //     Math.random() > 0.1 &&
  //       (() => {
  //         const point = {
  //           // x: (Date.now() / 1000) % (X_DURATION / 1000),
  //           x: Date.now(),
  //           // y: Math.random() * 5
  //           y: 5 * Math.sin(((Date.now() / 1000) % (X_DURATION / 1000)) / 1)
  //         };

  //         setData(state => [...state, point]);
  //       })();

  //     requestAnimationFrame(fn);
  //   };

  //   requestAnimationFrame(fn);

  //   return () => (stop = true);
  // }, []);

  const [time, setTime] = React.useState(() => Date.now());

  React.useEffect(() => {
    let stop = false;
    const fn = () => {
      if (stop) return;

      setTime(Date.now());

      requestAnimationFrame(fn);
    };

    requestAnimationFrame(fn);

    return () => (stop = true);
  }, []);

  const currentTime = ((time - startTime) / 1000) % (X_DURATION / 1000);

  const prevTimeRef = React.useRef(currentTime);

  const [timeCutoff, setTimeCutoff] = React.useState(time);
  React.useEffect(() => {
    if (currentTime < prevTimeRef.current) {
      setTimeCutoff(time);
    }
  }, [currentTime, time]);

  React.useEffect(() => {
    prevTimeRef.current = currentTime;
  });

  const calcData = React.useMemo(
    () =>
      data
        .filter(
          p =>
            ((p.x - startTime) / 1000) % (X_DURATION / 1000) <
              ((data[data.length - 1].x - startTime) / 1000) %
                (X_DURATION / 1000) &&
            data[data.length - 1].x - startTime - X_DURATION < p.x
        )
        .map(p => ({
          ...p,
          x: ((p.x - startTime) / 1000) % (X_DURATION / 1000)
        })),
    [data, startTime]
  );

  return (
    <VictoryChart
      // animate={{ duration: 500 }}
      theme={VictoryTheme.material}
      domainPadding={20}
      domain={{
        x: [0, X_DURATION / 1000],
        y: [-5, 5]
        // y: [
        //   Math.min(0, ...data.map(d => d.y)),
        //   Math.max(0, ...data.map(d => d.y))
        // ]
      }}
    >
      {/* <VictoryLine
        samples={25}
        y={d => Math.sin(5 * Math.PI * d.x)}
        interpolation="natural"
      /> */}
      {/* <VictoryLine
        style={{ data: { stroke: 'red' } }}
        data={[
          {
            x: currentTime,
            y: -100
          },
          {
            x: currentTime,
            y: 100
          }
        ]}
      /> */}

      <VictoryLine
        // animate={{ duration: 500 }}
        // samples={100}
        // style={{ data: { stroke: 'red' } }}
        data={calcData}
        // interpolation="natural"
      />
    </VictoryChart>
  );
}
