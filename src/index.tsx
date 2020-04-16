import React from 'react';
import { View, Button } from 'react-native';
import codePush from 'react-native-code-push';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { SQLiteContextProvider } from './components/SQLContext';
import { BLEContextProvider } from './components/BLEContext';
import { ThemeContextProvider } from './components/ThemeContext';
import { COLOR_2 } from './components/UI';

import { DevicesListScreen } from './screens/DevicesListScreen';
import { DeviceScanScreen } from './screens/DeviceScan';
import { DeviceDetailScreen } from './screens/DeviceDetail';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

function MainStackScreen() {
  const navigation = useNavigation();

  return (
    <MainStack.Navigator initialRouteName="Home">
      <MainStack.Screen
        name="Home"
        component={DevicesListScreen}
        options={{
          title: 'Dispositivos',

          headerRight: () => (
            <View style={{ paddingRight: 10 }}>
              <Button
                onPress={() => navigation.navigate('DeviceScan')}
                title="Buscar"
                color={COLOR_2}
              />
            </View>
          ),
        }}
      />
    </MainStack.Navigator>
  );
}

const AppWithContext = () => (
  <ThemeContextProvider>
    <SQLiteContextProvider>
      <NavigationContainer theme={DarkTheme}>
        <BLEContextProvider>
          <RootStack.Navigator mode="modal">
            <RootStack.Screen
              name="Main"
              component={MainStackScreen}
              options={{ headerShown: false }}
            />

            <RootStack.Screen
              name="DeviceScan"
              options={{
                title: 'Dispositivos cercanos',
              }}
              component={DeviceScanScreen}
            />

            <RootStack.Screen
              name="DeviceDetail"
              options={{
                title: 'Dispositivo',
                headerShown: false,
              }}
              component={DeviceDetailScreen}
            />
          </RootStack.Navigator>
        </BLEContextProvider>
      </NavigationContainer>
    </SQLiteContextProvider>
  </ThemeContextProvider>
);

export default __DEV__
  ? AppWithContext
  : codePush({
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE,
    })(AppWithContext);
