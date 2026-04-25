import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * NotificationService
 * Handles creation of customized notification channels based on user persona.
 */
export const NotificationService = {
    /**
     * Creates customized Android channels based on survey data.
     * @param {Object} surveyData - The data from OnboardingSurvey
     */
    setupPersonaChannels: async (surveyData) => {
        if (Platform.OS !== 'android' || !surveyData) return;

        try {
            const channels = [];

            // 1. Age Category
            if (surveyData.age) {
                channels.push({
                    id: `bentork-age-${surveyData.age.toLowerCase().replace(/ /g, '-')}`,
                    name: `Age Group`,
                    description: 'Notifications tailored to your age group',
                });
            }

            // 2. Gender Category
            if (surveyData.gender) {
                channels.push({
                    id: `bentork-gender-${surveyData.gender.toLowerCase()}`,
                    name: `Gender`,
                    description: 'Notifications customized for your gender preference',
                });
            }

            // 3. Occupation Category
            if (surveyData.occupation) {
                channels.push({
                    id: `bentork-job-${surveyData.occupation.toLowerCase().replace(/ /g, '-')}`,
                    name: `${surveyData.occupation}`,
                    description: 'Updates relevant to your professional background',
                });
            }

            // 4. Marital Status
            if (surveyData.maritalStatus) {
                channels.push({
                    id: `bentork-lifestyle-${surveyData.maritalStatus.toLowerCase()}`,
                    name: `${surveyData.maritalStatus}`,
                    description: 'Content based on your lifestyle and marital status',
                });
            }

            // 5. Interests (Up to 5)
            if (surveyData.interests && Array.isArray(surveyData.interests)) {
                surveyData.interests.forEach(interest => {
                    channels.push({
                        id: `bentork-interest-${interest.toLowerCase().replace(/ /g, '-')}`,
                        name: `${interest}`,
                        description: `Exclusive updates about ${interest}`,
                    });
                });
            }

            // Always create a General channel as fallback
            channels.push({
                id: 'bentork-general',
                name: 'General Notifications',
                description: 'Service updates and general announcements',
                importance: AndroidImportance.HIGH,
            });

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

            console.log(`Successfully configured ${channels.length} personalized notification channels.`);
        } catch (error) {
            console.error('Failed to setup persona channels:', error);
        }
    },

    /**
     * Returns a list of all potential channel IDs for documentation.
     */
    getAllPotentialChannelIds: () => {
        const base = [
            'bentork-age-18-25', 'bentork-age-26-35', 'bentork-age-36-50', 'bentork-age-50+',
            'bentork-gender-male', 'bentork-gender-female', 'bentork-gender-other',
            'bentork-job-private-sector', 'bentork-job-government-sector', 'bentork-job-self-employed', 'bentork-job-student', 'bentork-job-other',
            'bentork-lifestyle-single', 'bentork-lifestyle-married',
            'bentork-general'
        ];
        
        const interests = [
            'technology', 'travel', 'music', 'fitness', 'dining', 
            'gaming', 'automotive', 'sustainability', 'finance', 'art',
            'sports', 'photography', 'movies', 'reading', 'fashion'
        ].map(i => `bentork-interest-${i}`);

        return [...base, ...interests];
    }
};
