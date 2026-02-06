// src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { DeviceEventEmitter } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import OtpScreen from '../screens/OtpScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import ConfigScreen from '../screens/ConfigScreen';
import SessionScreen from '../screens/SessionScreen';
import WalletScreen from '../screens/WalletScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AboutScreen from '../screens/AboutScreen';
import FAQScreen from '../screens/FAQScreen';
import NotificationScreen from '../screens/NotificationScreen';
import MapScreen from '../screens/MapScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import SearchScreen from '../screens/SearchScreen';

import { useAlert } from '../context/AlertContext';
import { authService } from '../services/auth';

// Navigation Reference for external access or handling resets
export const navigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();

export default function AppNavigator() {
    const { showAlert } = useAlert();

    useEffect(() => {
        // Listen for Session Expired Events (401 from API)
        const subscription = DeviceEventEmitter.addListener('auth_session_expired', async () => {
            console.log("Session Expired Event Received");
            await authService.logout();

            showAlert(
                "Session Expired",
                "Your session has expired. Please login again to continue.",
                [{
                    text: "Login",
                    onPress: () => {
                        if (navigationRef.isReady()) {
                            navigationRef.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    }
                }]
            );
        });

        return () => subscription.remove();
    }, []);

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                <Stack.Screen name="OtpLogin" component={OtpScreen} />
                <Stack.Screen name="DeveloperOptions" component={DeveloperScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Config" component={ConfigScreen} />
                <Stack.Screen name="Session" component={SessionScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="Accounts" component={AccountsScreen} />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="FAQ" component={FAQScreen} />
                <Stack.Screen name="Notification" component={NotificationScreen} />
                <Stack.Screen name="Map" component={MapScreen} />
                <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                <Stack.Screen name="Invoice" component={InvoiceScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
