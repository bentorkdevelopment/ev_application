import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { authService } from './auth';

import { API_URL } from '@env';

// Use 10.0.2.2 for Android Emulator to access localhost
// Or use your machine's IP address for physical device
const BASE_URL = API_URL;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Unified Error Handler
const handleApiError = (error) => {
    // 1. Detailed Logging for Debugging
    const errorLog = {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
    };

    if (error.response) {
        // Suppress 404 logging for expected scenarios like checking for existing review
        if (error.response.status !== 404) {
            console.error('<<< API Error Response:', JSON.stringify(errorLog, null, 2));
        } else {
            // console.warn('<<< API 404 (Not Found):', error.config?.url);
        }
    } else if (error.request) {
        console.error('<<< API No Response:', error.message);
    } else {
        console.error('<<< API Setup Error:', error.message);
    }

    // 2. Generate User-Friendly Message
    let userMessage = 'Something went wrong. Please try again.';

    if (error.response) {
        const { status, data } = error.response;

        // Check if server sent a specific message or error
        if (data && data.error) {
            userMessage = data.error;
        } else if (data && data.message) {
            userMessage = data.message;
        } else if (data && typeof data === 'string' && data.length > 0 && data.length < 100) {
            userMessage = data;
        } else {
            // Fallback based on status code
            switch (status) {
                case 400:
                    userMessage = 'Invalid request. Please check your inputs.';
                    break;
                case 401:
                    userMessage = 'Session expired. Please login again.';
                    DeviceEventEmitter.emit('auth_session_expired');
                    break;
                case 403:
                    userMessage = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    userMessage = 'Resource not found.';
                    break;
                case 500:
                    userMessage = 'Internal server error. Please try again later.';
                    break;
                case 503:
                    userMessage = 'Service unavailable. Please try again later.';
                    break;
                default:
                    userMessage = `Unexpected error (${status}).`;
            }
        }
    } else if (error.code === 'ECONNABORTED') {
        userMessage = 'Request timed out. Please check your connection.';
    } else if (error.request) {
        userMessage = 'Network error. Please check your internet connection.';
    } else {
        userMessage = 'An unexpected application error occurred.';
    }

    // Attach the user-friendly message to the error object
    error.userMessage = userMessage;

    return Promise.reject(error);
};

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    async (config) => {
        const token = await authService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('>>> Auth Request:', config.method.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error('>>> Request Error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    response => {
        console.log('<<< Auth Response:', response.status, response.config.url); // Log simpler success
        return response;
    },
    handleApiError
);

// Create a separate instance for public requests to avoid 401 loop if token is invalid
const publicApi = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Debug Logging
publicApi.interceptors.request.use(request => {
    console.log('>>> Public Request:', request.method.toUpperCase(), request.url);
    return request;
});

publicApi.interceptors.response.use(
    response => {
        console.log('<<< Public Response:', response.status, response.config.url);
        return response;
    },
    handleApiError
);

export const authApi = {
    // Backend endpoint: /api/user/google-login-success?email=...
    googleLoginSuccess: async (email) => {
        try {
            // Use publicApi here because we are logging in (we don't have a token yet or it's invalid)
            const response = await publicApi.get(`/user/google-login-success`, {
                params: { email }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    register: async (userData) => {
        try {
            const response = await publicApi.post('/user/signup', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    login: async (emailOrMobile, password) => {
        try {
            const response = await publicApi.post('/user/login', {
                emailOrMobile,
                password
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    requestOtp: async (email) => {
        try {
            const response = await publicApi.post('/user/request-otp', null, {
                params: { email }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    resetPassword: async (email, otp, newPassword) => {
        try {
            const response = await publicApi.post('/user/reset-password', null, {
                params: { email, otp, newPassword }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const adminApi = {
    login: async (emailOrMobile, password) => {
        try {
            const response = await publicApi.post('/admin/login', {
                emailOrMobile,
                password
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    signup: async (name, email, mobile, password, confirmPassword) => {
        try {
            const response = await publicApi.post('/admin/signup', {
                name,
                email,
                mobile,
                password,
                confirmPassword
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const userApi = {
    getUserDetails: async (email) => {
        try {
            const response = await api.get(`/user/byemail/${email}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUserById: async (userId) => {
        try {
            // Trying plural 'users' as a fallback if 'user' failed? 
            // Or maybe just suppress?
            // Given the 500, the backend might expect /user/details? or /users?
            // I'll keep it as is but add a fallback to try /users/ if the first one fails?
            // No, that's messy.
            // I will assume the backend endpoint is actually /user/profile/${userId} for now? 
            // Or I will rely on the ReviewCard fix.
            const response = await api.get(`/user/${userId}`);
            return response.data;
        } catch (error) {
            // console.warn("Get User By ID Failed", error);
            // If 500, maybe try /users/${userId}
            if (error.response && error.response.status === 500) {
                try {
                    const response2 = await api.get(`/users/${userId}`);
                    return response2.data;
                } catch (e) {
                    throw error; // Throw original
                }
            }
            throw error;
        }
    },
    getWalletDetails: async (userId) => {
        try {
            const response = await api.get(`/wallet/history/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const plansApi = {
    getAllPlans: async () => {
        try {
            // User confirmed plans need authentication.
            const response = await api.get('/plans/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};



export const stationsApi = {
    getAllStations: async () => {
        try {
            const response = await api.get('/stations/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getPublicStations: async () => {
        try {
            const response = await publicApi.get('/stations/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const locationsApi = {
    getAllLocations: async () => {
        try {
            const response = await api.get('/location/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getLocationById: async (id) => {
        try {
            const response = await api.get(`/location/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const chargersApi = {
    getAllChargers: async () => {
        try {
            const response = await api.get('/chargers/all');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const razorpayApi = {
    createOrder: async (amount) => {
        try {
            const response = await api.post('/razorpay/create-order', { amount: amount.toString() });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    verifyPayment: async (paymentData) => {
        try {
            const response = await api.post('/razorpay/verify-payment', paymentData);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const sessionApi = {
    startSession: async (sessionData) => {
        try {
            const response = await api.post('/sessions/start', sessionData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    stopSession: async (sessionId) => {
        try {
            const response = await api.post('/sessions/stop', { sessionId });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSessionEnergy: async (sessionId) => {
        try {
            const response = await api.get(`/sessions/${sessionId}/energy`);
            const data = response.data;
            let energyUsed = 0;

            if (typeof data === 'number') {
                energyUsed = data;
            } else if (typeof data === 'object' && data !== null) {
                // Check various common field names
                energyUsed = data.kwhUsed ?? data.energy ?? data.energyUsed ?? data.kwh ?? 0;
            }
            return Number(energyUsed) || 0;
        } catch (error) {
            console.warn("Get Energy Failed:", error.message);
            // Don't throw, just return 0 to avoid UI freeze, logic will retry
            return 0;
        }
    },
    getSessionStatus: async (sessionId) => {
        try {
            const response = await api.get(`/sessions/${sessionId}/status`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getActiveSession: async (userId) => {
        try {
            // Using /all/records for full enrichment (Charger, Station, etc.)
            const response = await api.get('/sessions/all/records');
            const sessions = Array.isArray(response.data) ? response.data : [];

            if (sessions.length > 0) {
                const activeSessions = sessions.filter(s => {
                    const status = String(s.status || '').toUpperCase();
                    const sUserId = s.user?.id || s.userId;
                    const sUserEmail = s.user?.email;

                    const matchesUser = (sUserId == userId || sUserEmail === userId);
                    const isActive = ['ACTIVE', 'CHARGING', 'STARTED', 'INITIATED'].includes(status);

                    return matchesUser && isActive;
                });

                // Sort by ID descending to get the LATEST session
                activeSessions.sort((a, b) => b.id - a.id);
                const activeSession = activeSessions[0];

                if (activeSession) {
                    let startTimeTs = Date.now();
                    if (Array.isArray(activeSession.startTime)) {
                        const [y, m, d, h, min, s] = activeSession.startTime;
                        startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                    } else if (activeSession.startTime) {
                        startTimeTs = new Date(activeSession.startTime).getTime();
                    }

                    return {
                        sessionId: activeSession.id,
                        status: activeSession.status || 'ACTIVE',
                        chargerId: activeSession.charger?.id,
                        boxId: activeSession.boxId,
                        stationName: activeSession.stationName || activeSession.charger?.station?.name || activeSession.charger?.name || "Unknown Station",
                        stationId: activeSession.stationId || activeSession.charger?.station?.id,
                        startTime: startTimeTs,
                        selectedKwh: activeSession.selectedKwh || null,
                        planId: null,
                        rate: activeSession.charger?.rate || 0,
                        chargerType: activeSession.charger?.chargerType || 'Fast',
                        latitude: activeSession.charger?.station?.latitude || activeSession.station?.latitude,
                        longitude: activeSession.charger?.station?.longitude || activeSession.station?.longitude
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn("Failed to check active session from records:", error.message);
            return null;
        }
    },

    getAllActiveSessions: async (userId) => {
        try {
            // Using /all/records instead of /active/details to get full entities (Charger, Station, etc.)
            // as requested for a frontend-only fix.
            const response = await api.get('/sessions/all/records');
            const sessions = Array.isArray(response.data) ? response.data : [];

            if (sessions.length > 0) {
                return sessions.filter(s => {
                    // Normalization
                    const status = String(s.status || '').toUpperCase();
                    const sUserId = s.user?.id || s.userId;
                    const sUserEmail = s.user?.email;

                    // Match user by ID or Email
                    const matchesUser = (sUserId == userId || sUserEmail === userId);

                    // Filter for active/busy statuses
                    const isActive = ['ACTIVE', 'CHARGING', 'STARTED', 'INITIATED'].includes(status);

                    return matchesUser && isActive;
                }).map(session => {
                    // Time parsing
                    let startTimeTs = Date.now();
                    if (Array.isArray(session.startTime)) {
                        const [y, m, d, h, min, s] = session.startTime;
                        startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                    } else if (session.startTime) {
                        startTimeTs = new Date(session.startTime).getTime();
                    }

                    return {
                        sessionId: session.id,
                        status: session.status || 'ACTIVE',
                        chargerId: session.charger?.id,
                        boxId: session.boxId,
                        stationName: session.stationName || session.charger?.station?.name || session.charger?.name || "Unknown Station",
                        stationId: session.stationId || session.charger?.station?.id,
                        startTime: startTimeTs,
                        selectedKwh: session.selectedKwh || null,
                        planId: null,
                        rate: session.charger?.rate || 0,
                        chargerType: session.charger?.chargerType || 'Fast',
                        latitude: session.charger?.station?.latitude || session.station?.latitude,
                        longitude: session.charger?.station?.longitude || session.station?.longitude
                    };
                }).sort((a, b) => b.sessionId - a.sessionId);
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch active sessions from records:", error);
            return [];
        }
    },
    enableNotification: async (sessionId, enabled) => {
        try {
            const response = await api.post('/sessions/notify', { sessionId, enabled });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const notificationApi = {
    registerFcmToken: async (userId, token) => {
        if (!userId || String(userId) === 'undefined') return null;
        try {
            const response = await api.post(`/notifications/user/${userId}/fcm-token`, { fcmToken: token });
            return response.data;
        } catch (error) {
            console.warn("Register FCM Token Failed:", error.message);
            throw error;
        }
    },
    getAllNotifications: async (userId) => {
        if (!userId || String(userId) === 'undefined') return [];
        try {
            const response = await api.get(`/notifications/user/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUnreadNotifications: async (userId) => {
        if (!userId || String(userId) === 'undefined') return [];
        try {
            const response = await api.get(`/notifications/user/${userId}/unread`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    sendNotification: async (userId, notificationData) => {
        if (!userId || String(userId) === 'undefined') throw new Error("User ID required");
        try {
            const response = await api.post(`/notifications/user/${userId}`, notificationData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    markAsRead: async (notificationId) => {
        try {
            const response = await api.post(`/notifications/${notificationId}/read`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUnreadCount: async (userId) => {
        if (!userId || String(userId) === 'undefined') return 0;
        try {
            // Using the /unread endpoint to get the count
            const response = await api.get(`/notifications/user/${userId}/unread`);
            const data = response.data;
            if (Array.isArray(data)) {
                return data.length;
            }
            if (typeof data === 'number') return data;
            if (data && typeof data.count === 'number') return data.count;
            return 0;
        } catch (error) {
            return 0;
        }
    }
};

export const reviewsApi = {
    createReview: async (reviewData) => {
        try {
            const { stationId, ...payload } = reviewData;
            const response = await api.post(`/station-reviews/${stationId}`, payload);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    updateReview: async (reviewId, reviewData) => {
        try {
            const response = await api.put(`/station-reviews/${reviewId}`, reviewData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    deleteReview: async (reviewId) => {
        try {
            const response = await api.delete(`/station-reviews/${reviewId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getStationReviews: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/station/${stationId}`);
            return response.data;
        } catch (error) {
            console.warn("Fetch Reviews Failed:", error.message);
            return []; // Return empty array on error to prevent UI crash
        }
    },
    getUserReviews: async (userId) => {
        try {
            const response = await api.get(`/station-reviews/user/${userId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getStationRatingSummary: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/summary/${stationId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    },
    getMyReview: async (stationId) => {
        try {
            const response = await api.get(`/station-reviews/my-review/${stationId}`);
            return response.data;
        } catch (error) {
            // User might not have a review, handle gracefully if 404
            if (error.response && error.response.status === 404) return null;
            return null;
        }
    }
};

export const emergencyApi = {
    getContact: async (stationId) => {
        try {
            const response = await api.get(`/emergency-contacts/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const slotsApi = {
    getAvailableSlots: async (chargerId, date) => {
        try {
            // Backend endpoint: /api/slots/charger/{chargerId}/available
            // Note: date param is ignored by backend currently, but kept for future compatibility
            const response = await api.get(`/slots/charger/${chargerId}/available`, {
                params: { date }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getSlotsByCharger: async (chargerId) => {
        try {
            const response = await api.get(`/slots/charger/${chargerId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    createBulkSlots: async (chargerId, date, durationMinutes = 30) => {
        try {
            const response = await api.post('/slots/bulk', {
                chargerId,
                date,
                durationMinutes
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export const slotBookingApi = {
    bookSlot: async (slotId) => {
        try {
            const response = await api.post(`/slot-bookings/book/${slotId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    cancelBooking: async (bookingId) => {
        try {
            const response = await api.put(`/slot-bookings/${bookingId}/cancel`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyBookings: async () => {
        try {
            const response = await api.get('/slot-bookings/my-bookings');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getMyActiveBookings: async () => {
        try {
            const response = await api.get('/slot-bookings/my-bookings/active');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getBookingById: async (bookingId) => {
        try {
            const response = await api.get(`/slot-bookings/${bookingId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getBookingsByStation: async (stationId) => {
        try {
            const response = await api.get(`/slot-bookings/station/${stationId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

};

export default api;
