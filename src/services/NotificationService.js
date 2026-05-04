import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * NotificationService
 * Handles creation of customized notification channels based on user persona.
 */
export const NotificationService = {
    /**
     * Creates standard Android channels.
     */
    setupPersonaChannels: async () => {
        if (Platform.OS !== 'android') return;

        try {
            const channels = [
                {
                    id: 'bentork-navigation',
                    name: 'Navigation',
                    description: 'Real-time navigation and routing alerts',
                    importance: AndroidImportance.HIGH,
                },
                {
                    id: 'bentork-general',
                    name: 'General Notifications',
                    description: 'Service updates and general announcements',
                    importance: AndroidImportance.DEFAULT,
                },
                {
                    id: 'bentork-session',
                    name: 'Session notifications',
                    description: 'Updates regarding your active charging sessions',
                    importance: AndroidImportance.HIGH,
                }
            ];

            // Create all channels
            for (const channel of channels) {
                await notifee.createChannel({
                    id: channel.id,
                    name: channel.name,
                    description: channel.description,
                    importance: channel.importance || AndroidImportance.DEFAULT,
                    visibility: AndroidVisibility.PUBLIC,
                });
            }

            console.log(`Successfully configured ${channels.length} standard notification channels.`);
        } catch (error) {
            console.error('Failed to setup notification channels:', error);
        }
    },

    /**
     * Returns a list of all standard channel IDs for documentation.
     */
    getAllPotentialChannelIds: () => {
        return [
            'bentork-navigation',
            'bentork-general',
            'bentork-session'
        ];
    }
};
