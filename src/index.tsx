import React from 'react';
import codePush from 'react-native-code-push';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import merge from 'lodash.merge';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { SQLiteContextProvider } from './components/SQLContext';
import { BLEContextProvider } from './components/BLEContext';
import { ThemeContextProvider, ThemeContext } from './components/ThemeContext';
import { DevicesListScreen } from './screens/DevicesListScreen';
import { DeviceScanScreen } from './screens/DeviceScan';
import { DeviceDetailScreen } from './screens/DeviceDetail';
import { AboutScreen } from './screens/About';
import { SettingsScreen } from './screens/Settings';
import { HistoryScreen } from './screens/History';

const MainStack = createStackNavigator();

function MainTabScreen() {
  const themeContext = React.useContext(ThemeContext);
  const Tab = createBottomTabNavigator();
  return (
    <Tab.Navigator
      tabBarOptions={{
        activeTintColor: themeContext.color.bottomTabBarActive,
        inactiveTintColor: themeContext.color.bottomTabBarInactive,
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Inicio') {
            iconName = 'home';
          } else if (route.name === 'Archivo') {
            iconName = 'assignment';
          } else if (route.name === 'Acerca de') {
            iconName = 'toc';
          } else if (route.name === 'Opciones') {
            iconName = 'settings';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DevicesListScreen} />
      <Tab.Screen name="Archivo" component={HistoryScreen} />
      <Tab.Screen name="Acerca de" component={AboutScreen} />
      <Tab.Screen name="Opciones" options={{}} component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppWithContext() {
  const themeContext = React.useContext(ThemeContext);

  return (
    <SQLiteContextProvider>
      <NavigationContainer
        theme={React.useMemo(
          () =>
            merge(DarkTheme, {
              colors: { background: themeContext.color.background },
            }),
          [themeContext.color.background]
        )}
      >
        <BLEContextProvider>
          <MainStack.Navigator initialRouteName="Home">
            <MainStack.Screen
              name="Home"
              component={MainTabScreen}
              options={{
                headerShown: false,
              }}
            />
            <MainStack.Screen
              name="DeviceScan"
              component={DeviceScanScreen}
              options={{
                headerShown: false,
              }}
            />
            <MainStack.Screen
              name="DeviceDetail"
              component={DeviceDetailScreen}
              options={{
                headerShown: false,
              }}
            />
          </MainStack.Navigator>
        </BLEContextProvider>
      </NavigationContainer>
    </SQLiteContextProvider>
  );
}

const AppWithTheme = () => (
  <ThemeContextProvider>
    <AppWithContext />
  </ThemeContextProvider>
);

export default __DEV__
  ? AppWithTheme
  : codePush({
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE,
    })(AppWithTheme);
