// const UART_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const UART_CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';

export async function validateDevice({
  device,
  manager,
  signal,
}): Promise<
  | {
      device: import('react-native-ble-plx').Device;
      uartCharacteristic?: import('react-native-ble-plx').Characteristic;
    }
  | undefined
> {
  const deviceId = device.id;

  await manager.connectToDevice(deviceId);

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const deviceWithCharacteristics = await manager.discoverAllServicesAndCharacteristicsForDevice(
    deviceId
  );

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const services = await deviceWithCharacteristics.services();

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const characteristics = (
    await Promise.all(services.map((service) => service.characteristics()))
  ).flat();

  if (signal.aborted) {
    manager.cancelDeviceConnection(deviceId);
    return;
  }

  const uartCharacteristic = characteristics.find(
    (char) => char.uuid.toLowerCase() === UART_CHARACTERISTIC_UUID.toLowerCase()
  );

  return {
    device,
    uartCharacteristic,
  };
}
