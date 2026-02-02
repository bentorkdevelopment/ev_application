// src/navigation/AppNavigator.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'

import SplashScreen from '../screens/SplashScreen'
import HomeScreen from '../screens/HomeScreen'
import LoginScreen from '../screens/LoginScreen'
import ConfigScreen from '../screens/ConfigScreen'
import SessionScreen from '../screens/SessionScreen'
import WalletScreen from '../screens/WalletScreen'
import AccountsScreen from '../screens/AccountsScreen'
import AboutScreen from '../screens/AboutScreen'
import FAQScreen from '../screens/FAQScreen'
import NotificationScreen from '../screens/NotificationScreen'
import MapScreen from '../screens/MapScreen'

const Stack = createStackNavigator()

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Config" component={ConfigScreen} />
                <Stack.Screen name="Session" component={SessionScreen} />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen name="Accounts" component={AccountsScreen} />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="FAQ" component={FAQScreen} />
                <Stack.Screen name="Notification" component={NotificationScreen} />
                <Stack.Screen name="Map" component={MapScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    )
}
