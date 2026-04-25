import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { notificationApi } from './api';
import { authService } from './auth';
import notifee, { AndroidImportance } from '@notifee/react-native';

export const requestUserPermission = async () => {
    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('[FCM] Authorization status:', authStatus);
        }
        return enabled;
    } catch (error) {
        console.error('[FCM] Permission Request Error:', error);
        return false;
    }
};

export const getFCMToken = async () => {
    try {
        // 1. Get token from Firebase
        // Register device (iOS specific, safe to call on Android)
        if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
            await messaging().registerDeviceForRemoteMessages();
        }

        const token = await messaging().getToken();
        if (!token) {
            console.log('[FCM] No token received from Firebase');
            return null;
        }

        console.log('<<< Firebase FCM Token:', token);

        // 2. Sync with Backend if user is logged in
        const user = await authService.getUser();
        if (user && user.id) {
            console.log(`[FCM] Syncing token for user ${user.id} to backend...`);
            try {
                await notificationApi.registerFcmToken(user.id, token);
                console.log('[FCM] Token registered successfully with backend');
            } catch (apiErr) {
                console.warn('[FCM] Failed to register token with backend:', apiErr.message);
            }
        }

        return token;
    } catch (error) {
        console.warn('[FCM] Error getting/syncing FCM token:', error.message);
        return null;
    }
};

export const NotificationListener = () => {
    // 1. Foreground Message Handler
    const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('[FCM] Foreground Message:', JSON.stringify(remoteMessage));

        try {
            // Get prospective channel ID from payload
            const channelId = remoteMessage.data?.channelId || remoteMessage.notification?.android?.channelId;
            
            if (!channelId) {
                console.log('[FCM] No channelId specified in payload. Skipping notification.');
                return;
            }

            // CHECK: Does this channel exist on the device?
            const channel = await notifee.getChannel(channelId);
            if (!channel) {
                console.warn(`[FCM] BLOCKING: Channel ID "${channelId}" does not exist on this device. Aborting display.`);
                return;
            }

            // If it exists, display the notification
            await notifee.displayNotification({
                title: remoteMessage.notification?.title || remoteMessage.data?.title || 'New Update',
                body: remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new update from Bentork',
                android: {
                    channelId: channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        } catch (error) {
            console.error('[FCM] Notifee Error:', error);
        }
    });

    // 2. Background State Message (Tap on notification)
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log(
            '[FCM] Notification opened app from background state:',
            remoteMessage.notification,
        );
    });

    // 3. Quit State Message (Tap on notification)
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log(
                    '[FCM] Notification opened app from quit state:',
                    remoteMessage.notification,
                );
            }
        });

    return unsubscribe;
};

// Background Handler
export const setupBackgroundHandler = () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('[FCM] Background Message Received:', JSON.stringify(remoteMessage));

        try {
            // Check channel existence even in background (requires Data message for 100% control)
            const channelId = remoteMessage.data?.channelId || remoteMessage.notification?.android?.channelId;
            
            if (channelId) {
                const channel = await notifee.getChannel(channelId);
                if (!channel) {
                    console.log(`[FCM] BLOCKING BACKGROUND: Channel ID "${channelId}" is invalid. Suppressing display.`);
                    return; // Prevent manual display if we were going to show one
                }
            } else {
                console.log('[FCM] No channelId in Background message.');
                return;
            }

            // NOTE: If this is a "Notification" message, the system already displayed it 
            // if we are in the background. To have NO notification shown for invalid channels,
            // always send messages as "Data only" (omit notification block).
            
            // For data messages, we display manually:
            if (!remoteMessage.notification) {
                await notifee.displayNotification({
                    title: remoteMessage.data?.title || 'New Update',
                    body: remoteMessage.data?.body || 'Check the app for details',
                    android: {
                        channelId: channelId,
                        pressAction: { id: 'default' },
                    },
                });
            }
        } catch (err) {
            console.error('[FCM] Background Display Error:', err);
        }
    });
};
