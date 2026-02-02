import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

// Import config from env if needed (e.g. for creating channels or handling data)
// import { FCM_TOPIC } from '@env';

import notifee, { AndroidImportance } from '@notifee/react-native';

export const requestUserPermission = async () => {
    try {
        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            if (enabled) {
                console.log('Authorization status:', authStatus);
                return true;
            }
        } else if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Notification permission granted');
                return true;
            }
        }
    } catch (error) {
        console.warn('Permission request error:', error);
    }
    return false;
};

export const getFCMToken = async () => {
    try {
        // Register device (iOS specific, safe to call on Android)
        if (!messaging().isDeviceRegisteredForRemoteMessages) {
            await messaging().registerDeviceForRemoteMessages();
        }

        const token = await messaging().getToken();
        if (token) {
            console.log('<<< FCM Token:', token);
            // TODO: Send this token to your backend via API
            // await api.post('/users/fcm-token', { token });
        } else {
            console.log('No FCM token received');
        }
        return token;
    } catch (error) {
        console.error('FCM Token Error:', error);
    }
};

export const NotificationListener = () => {
    // 1. Foreground Message Handler
    const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));

        // Display Notification using Notifee
        try {
            const channelId = await notifee.createChannel({
                id: 'default',
                name: 'Default Channel',
                importance: AndroidImportance.HIGH,
            });

            await notifee.displayNotification({
                title: remoteMessage.notification?.title || 'New Notification',
                body: remoteMessage.notification?.body || 'You have a new update',
                android: {
                    channelId,
                    // smallIcon: 'ic_launcher', // default
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        } catch (error) {
            console.error('Notifee Error:', error);
        }
    });

    // 2. Background State Message (Tap on notification)
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log(
            'Notification caused app to open from background state:',
            remoteMessage.notification,
        );
        // Navigation logic can go here
    });

    // 3. Quit State Message (Tap on notification)
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log(
                    'Notification caused app to open from quit state:',
                    remoteMessage.notification,
                );
                // Navigation logic can go here
            }
        });

    return unsubscribe;
};

// Background Handler
// Ensure this is imported in index.js to run in background
export const setupBackgroundHandler = () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
    });
};
