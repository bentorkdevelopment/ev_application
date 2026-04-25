import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeService = {
    /**
     * Searches for EV-related videos.
     * @param {string} query - The search query (default: 'EV India charging reviews')
     * @returns {Promise<Array>} - List of mapped video objects
     */
    searchVideos: async (query = 'EV charging India guide 2025') => {
        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: {
                    part: 'snippet',
                    q: query,
                    maxResults: 5,
                    type: 'video',
                    key: GOOGLE_MAPS_API_KEY,
                },
            });

            if (response.data && response.data.items) {
                return response.data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    thumb: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                    publishedAt: item.snippet.publishedAt,
                    description: item.snippet.description,
                }));
            }
            return [];
        } catch (error) {
            console.error('YouTube API Error:', error.response?.data || error.message);
            return [];
        }
    },
};

export default youtubeService;
