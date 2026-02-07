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
    },
    register: async (userData) => {
        try {
            const response = await publicApi.post('/user/signup', userData);
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
                console.log(`[DEBUG] Found ${sessions.length} total sessions from backend.`);

                const activeSessions = sessions.filter(s => {
                    // Normalization
                    const status = String(s.status || '').toUpperCase();
                    const sUserId = s.userId;
                    const sUserEmail = s.user?.email; // Sometimes user is object
                    const sUserObjId = s.user?.id;

                    // Check both ID and Email/String ID
                    // The 'userId' param passed in might be an ID (123) or email (om.lok...)
                    // We need loose comparison (==) for IDs
                    const matchesUser = (sUserObjId == userId || sUserId == userId || sUserEmail === userId);
                    const isActive = ['ACTIVE', 'CHARGING', 'STARTED'].includes(status);

                    if (matchesUser) {
                        console.log(`[DEBUG] User Match! Session ${s.id}: Status=${status}, IsActive=${isActive}`);
                    }

                    // Strict check: User match + Status match
                    return matchesUser && isActive;
                });

                console.log(`[DEBUG] Active sessions for user ${userId}: ${activeSessions.length}`);

                // Sort by ID descending to get the LATEST session
                activeSessions.sort((a, b) => b.id - a.id);

                const activeSession = activeSessions[0];

                if (activeSession) {
                    console.log(`Found Active Session ID: ${activeSession.id}, Status: ${activeSession.status}`);

                    // Parse LocalDateTime array [2024, 5, 20, 10, 30, 45] -> Timestamp
                    let startTimeTs = Date.now();
                    if (Array.isArray(activeSession.startTime)) {
                        const [y, m, d, h, min, s] = activeSession.startTime;
                        startTimeTs = new Date(y, m - 1, d, h, min, s || 0).getTime();
                    } else if (activeSession.startTime) {
                        startTimeTs = new Date(activeSession.startTime).getTime();
                    }

                    return {
                        sessionId: activeSession.id,
                        status: 'ACTIVE',
                        chargerId: activeSession.charger?.id, // Accessing Charger entity
                        boxId: activeSession.boxId,
                        stationName: activeSession.stationName || activeSession.charger?.station?.name || activeSession.charger?.name || "Unknown Station",
                        startTime: startTimeTs,
                        selectedKwh: activeSession.selectedKwh || null, // Not in Session model? Check Receipt/Plan relation if needed later
                        planId: null, // Session model doesn't directly link Plan, might need derived logic or ignored for now
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
    registerFcmToken: async (userId, token) => {
        if (!userId || String(userId) === 'undefined') return null;
        try {
            const response = await api.post(`/notifications/user/${userId}/fcm-token`, { token });
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

export default api;
