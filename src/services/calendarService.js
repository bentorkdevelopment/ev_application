import axios from 'axios';

/**
 * Service to fetch public calendar events.
 * Switched to Nager.date API for public holidays as Google Calendar API 
 * now strictly requires OAuth2 tokens even for public holiday calendars 
 * in many project configurations.
 */
export const calendarService = {
    /**
     * Fetches upcoming public holidays in India.
     * @returns {Promise<Array>} - List of mapped event objects
     */
    fetchPublicEvents: async () => {
        try {
            // Using Nager.date API - a free, public holiday API that doesn't require OAuth
            const countryCode = 'IN';
            const response = await axios.get(`https://date.nager.at/api/v3/NextPublicHolidays/${countryCode}`);

            if (response.data && Array.isArray(response.data)) {
                return response.data.slice(0, 5).map(item => ({
                    id: `${item.date}-${item.name}`,
                    title: item.name,
                    start: item.date,
                    description: item.localName || 'Public Holiday',
                }));
            }
            return [];
        } catch (error) {
            console.error('<<< Holiday API Error:', error.message);
            return [];
        }
    },
};

export default calendarService;
