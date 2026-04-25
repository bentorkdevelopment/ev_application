import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const WEATHER_BASE_URL = 'https://weather.googleapis.com/v1';
const AIR_QUALITY_BASE_URL = 'https://airquality.googleapis.com/v1';

export const environmentalService = {
    /**
     * Fetches current weather conditions for a given location.
     * Uses Google Maps Weather API (Public Preview)
     */
    getCurrentWeather: async (latitude, longitude) => {
        try {
            const response = await axios.get(`${WEATHER_BASE_URL}/currentConditions:lookup`, {
                params: {
                    key: GOOGLE_MAPS_API_KEY,
                    'location.latitude': latitude,
                    'location.longitude': longitude,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching weather data:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Fetches current air quality conditions for a given location.
     * Uses Google Maps Air Quality API
     */
    getAirQuality: async (latitude, longitude) => {
        try {
            const response = await axios.post(`${AIR_QUALITY_BASE_URL}/currentConditions:lookup?key=${GOOGLE_MAPS_API_KEY}`, {
                location: {
                    latitude,
                    longitude,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching air quality data:', error.response?.data || error.message);
            throw error;
        }
    },
};

export default environmentalService;
