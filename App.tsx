import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { requestUserPermission, getFCMToken, NotificationListener } from './src/services/fcmService';
import { AlertProvider } from './src/context/AlertContext';
import { NavigationProvider, TaskRemovedBehavior } from '@googlemaps/react-native-navigation-sdk';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const initFCM = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        await getFCMToken();
      }
    };
    initFCM();
    const unsubscribe = NotificationListener();
    return () => unsubscribe();
  }, []);

  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: 'Navigation Terms',
        companyName: 'Bentork',
        showOnlyDisclaimer: true,
      }}
      taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
    >
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AlertProvider>
          <AppNavigator />
        </AlertProvider>
      </SafeAreaProvider>
    </NavigationProvider>
  );
}

export default App;
