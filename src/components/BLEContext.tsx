import React from 'react';
import { BleManager } from 'react-native-ble-plx';

export const BLEContext = React.createContext<{
  manager?: BleManager;
}>({});

export function BLEContextProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [manager] = React.useState(() => new BleManager());

  return (
    <BLEContext.Provider
      value={{
        manager
      }}
    >
      {children}
    </BLEContext.Provider>
  );
}
