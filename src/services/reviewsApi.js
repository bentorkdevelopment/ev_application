import api from './api';

export const reviewsApi = {
    // Create a new review
    createReview: async (reviewData) => {
        try {
            const response = await api.post(`/station-reviews`, reviewData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Update an existing review
    updateReview: async (reviewId, reviewData) => {
        try {
            const response = await api.put(`/station-reviews/${reviewId}`, reviewData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Delete a review
    deleteReview: async (reviewId) => {
        try {
            const response = await api.delete(`/station-reviews/${reviewId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Get all reviews for a station
    getStationReviews: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/station/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Get all reviews by a user
    getUserReviews: async (userId) => {
        try {
            const response = await api.get(`/station-reviews/user/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Get summary for a station (avg rating, count)
    getStationRatingSummary: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/summary/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Check if current user has reviewed a station
    getMyReview: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/my-review/${stationId}`);
            return response.data;
        } catch (error) {
            // 404 means no review found, which is valid
            if (error.response && error.response.status === 404) {
                return null;
            }
            throw error;
        }
    }
};

export default reviewsApi;
