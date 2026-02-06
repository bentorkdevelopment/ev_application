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
        console.error('<<< API Error Response:', JSON.stringify(errorLog, null, 2));
    } else if (error.request) {
        console.error('<<< API No Response:', error.message);
    } else {
        console.error('<<< API Setup Error:', error.message);
    }

    // 2. Generate User-Friendly Message
    let userMessage = 'Something went wrong. Please try again.';

    if (error.response) {
        const { status, data } = error.response;

        // Check if server sent a specific message
        if (data && typeof data === 'string' && data.length > 0 && data.length < 100) {
            // Use server message if it's a short string (likely a message)
            userMessage = data;
        } else if (data && data.message) {
            userMessage = data.message;
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
            // Since /sessions/active returns count, we use /all/records to find the actual session
            const response = await api.get('/sessions/all/records');
            const data = response.data;
            const sessions = Array.isArray(data) ? data : (data?.data || []);

            if (Array.isArray(sessions)) {
                // Find all ACTIVE sessions for this user
                const activeSessions = sessions.filter(s => {
                    const matchesUser = (s.user?.id == userId || s.userId == userId);
                    const status = String(s.status || '').toUpperCase();
                    // STRICTER STATUS CHECK: Only truly active states to avoid stale 'INITIATED' ghosts
                    const isActive = ['ACTIVE', 'CHARGING'].includes(status);

                    // Reject sessions with invalid start times (prevents 1970 duration bug)
                    const hasValidTime = s.startTime && s.startTime !== 0; // null, undefined, or 0 are invalid

                    return matchesUser && isActive && hasValidTime;
                });

                // Sort by ID descending to get the LATEST session
                activeSessions.sort((a, b) => b.id - a.id);

                const activeSession = activeSessions[0];

                if (activeSession) {
                    console.log("Found Active Session for User", userId, ":", activeSession.id);
                    return {
                        sessionId: activeSession.id,
                        status: 'ACTIVE', // Normalized for frontend check
                        chargerId: activeSession.charger?.id || activeSession.chargerId,
                        boxId: activeSession.boxId,
                        stationName: activeSession.charger?.station?.name || activeSession.stationName || "Unknown Station",
                        startTime: activeSession.startTime,
                        // Fix for Percentage Logic on Resume:
                        selectedKwh: activeSession.selectedKwh || activeSession.targetEnergy || activeSession.energyLimit || null,
                        planId: activeSession.planId || activeSession.plan?.id || null,
                        rate: activeSession.charger?.rate || 0,
                        chargerType: activeSession.charger?.chargerType || 'Fast'
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn("Failed to check active session:", error);
            return null;
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
    getUnreadCount: async (userId) => {
        try {
            const response = await api.get(`/notifications/unread-count/${userId}`);
            return response.data; // Expecting { count: 5 } or just number
        } catch (error) {
            // console.warn("Notification Count Error", error); // Suppress log spam
            return 0; // Fallback
        }
    }
};

export default api;
