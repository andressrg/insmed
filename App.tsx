import React from 'react';
import { Text, View, Button, TouchableOpacity, ScrollView } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Permissions } from 'react-native-unimodules';
import codePush from 'react-native-code-push';

import {
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryTheme
} from 'victory-native';

const UART_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const UART_CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

const X_DURATION = 0.5 * 60 * 1000;

function Chart() {
  const [data, setData] = React.useState<{ x: number; y: number }[]>([]);
  const [newData, setNewData] = React.useState<{ x: number; y: number }[]>([]);
  const [startTime] = React.useState(() => Date.now());

  React.useEffect(() => {
    let stop = false;
    const fn = () => {
      if (stop) return;

      Math.random() > 0.1 &&
        (() => {
          const point = {
            // x: (Date.now() / 1000) % (X_DURATION / 1000),
            x: Date.now(),
            // y: Math.random() * 5
            y: 5 * Math.sin(((Date.now() / 1000) % (X_DURATION / 1000)) / 1)
          };

          setData(state => [...state, point]);
        })();

      requestAnimationFrame(fn);
    };

    requestAnimationFrame(fn);

    return () => (stop = true);
  }, []);

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
    // console.log('currentTime', currentTime, 'prevTime', prevTimeRef.current);
    if (currentTime < prevTimeRef.current) {
      setTimeCutoff(time);
    }
  });

  React.useEffect(() => {
    prevTimeRef.current = currentTime;
  });

  const calcData = React.useMemo(
    () =>
      data
        .filter(p => timeCutoff < p.x)
        .map(p => ({
          ...p,
          x: ((p.x - startTime) / 1000) % (X_DURATION / 1000)
        })),
    [data]
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
      <VictoryLine
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
      />

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

function App() {
  const [manager] = React.useState(() => new BleManager());

  const [findDevices, setFindDevices] = React.useState(false);

  const [devices, setDevices] = React.useState<{
    [id: string]: { foundAt: Date; device: Device };
  }>({});

  React.useEffect(() => {
    let deactivators = [];

    if (findDevices) {
      Permissions.askAsync(Permissions.LOCATION).then(({ status }) => {
        if (status !== 'granted') {
          alert('BLE no autorizado');
          return;
        }

        function scanAndConnect() {
          manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
              // Handle error (scanning will be stopped automatically)
              alert(error);
              return;
            }

            setDevices(state => ({
              ...state,

              [device.id]: {
                foundAt: new Date(),
                device
              }
            }));
          });

          deactivators.push(() => manager.stopDeviceScan());
        }

        let stopStateChangeSubscription;

        const subscription = manager.onStateChange(state => {
          deactivators.push(stopStateChangeSubscription);
          if (state === 'PoweredOn') {
            scanAndConnect();
            stopStateChangeSubscription();
            deactivators = deactivators.filter(
              fn => fn !== stopStateChangeSubscription
            );
          }
        }, true);

        stopStateChangeSubscription = () => subscription.remove();
      });
    }

    return () => deactivators.forEach(fn => fn());
  }, [manager, findDevices]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 20 }} />

      <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
        Dispositivos cercanos:
      </Text>

      <View style={{ height: 20 }} />

      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        {findDevices &&
          Object.values(devices)
            .map(({ device, ...rest }) => ({
              ...rest,
              device,
              title: device.name ?? device.id
            }))
            .sort((a, b) => ('' + a.title).localeCompare(b.title))
            .map(({ device, title }) => (
              <React.Fragment key={device.id}>
                <TouchableOpacity
                  onPress={() => {
                    manager.connectToDevice(device.id).then(
                      // () => {
                      //   const subscription = device.monitorCharacteristicForService(
                      //     UART_SERVICE_UUID,
                      //     UART_CHARACTERISTIC_UUID,
                      //     (error, characteristic) => {
                      //       console.log('received', characteristic.value);
                      //     }
                      //   );
                      // },
                      () =>
                        device.discoverAllServicesAndCharacteristics().then(
                          async device => {
                            alert(
                              'services: ' +
                                JSON.stringify(device.serviceData, null, 2)
                            );
                          },
                          err => {
                            alert('failed');
                          }
                        ),

                      err => {
                        alert('Fallo de conexión');
                      }
                    );
                  }}
                >
                  <Text>{title}</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />
              </React.Fragment>
            ))}
      </ScrollView>

      {/* <VictoryBar /> */}

      {!findDevices && <Chart />}

      <View style={{ alignItems: 'center' }}>
        <Button
          onPress={() => {
            setDevices({});
            setFindDevices(state => !state);
          }}
          title={
            findDevices
              ? 'Parar la busqueda'
              : 'Buscar dispositivos disponibles'
          }
        />
      </View>
      <View style={{ height: 20 }} />
    </View>
  );
}

export default __DEV__
  ? App
  : codePush({
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE
    })(App);
