import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@charging_history';

// Constants for calculations
const CO2_FACTOR_KG_PER_KWH = 0.85; // Approx savings vs ICE
const ICE_COST_PER_KM = 10; // ₹10/km for petrol car
const EV_KWH_EFFICIENCY = 6.5; // km per kWh for EV
const MONEY_SAVED_FACTOR = (EV_KWH_EFFICIENCY * ICE_COST_PER_KM); // ~65

export const statsService = {
    /**
     * Save a completed session to local history.
     * Calculates derived metrics like CO2 saved and Money saved.
     */
    saveSession: async (session) => {
        try {
            // 1. Get existing history
            const existingData = await AsyncStorage.getItem(STORAGE_KEY);
            let history = existingData ? JSON.parse(existingData) : [];

            // 2. Check for duplicates (by ID)
            if (history.some(item => item.id === session.id)) {
                console.log("Session already saved:", session.id);
                return;
            }

            // 3. Calculate Derived Metrics
            const energy = parseFloat(session.energyDelivered) || 0;
            const cost = parseFloat(session.cost) || 0;

            const co2Saved = (energy * CO2_FACTOR_KG_PER_KWH).toFixed(2);
            // Money Saved = (Standard ICE Cost for same distance) - (Actual Charging Cost)
            // Distance covered by this energy = energy * efficiency
            const estimatedDistance = energy * EV_KWH_EFFICIENCY;
            const iceCost = estimatedDistance * ICE_COST_PER_KM;
            const moneySaved = Math.max(0, (iceCost - cost)).toFixed(2);

            // 4. Create History Item
            const newHistoryItem = {
                id: session.id,
                timestamp: Date.now(),
                stationName: session.stationName || 'Unknown Station',
                location: session.location || 'Unknown Location',
                energyDelivered: energy,
                durationSeconds: session.duration || 0,
                cost: cost,
                co2SavedKg: parseFloat(co2Saved),
                moneySaved: parseFloat(moneySaved),
                rate: session.rate,
                connectorType: session.connectorType
            };

            // 5. Prepend and Save
            history.unshift(newHistoryItem);

            // Limit history size if needed (e.g. keep last 100 sessions)
            if (history.length > 100) {
                history = history.slice(0, 100);
            }

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            console.log("Saved session to history:", newHistoryItem.id);
            return newHistoryItem;

        } catch (error) {
            console.error("Failed to save session stats:", error);
            throw error;
        }
    },

    /**
     * Get full charging history
     */
    getHistory: async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Failed to get history:", error);
            return [];
        }
    },

    /**
     * Get aggregated stats for the dashboard
     */
    getAggregatedStats: async () => {
        try {
            const history = await statsService.getHistory();

            const totalEnergy = history.reduce((sum, item) => sum + (item.energyDelivered || 0), 0);
            const totalSessions = history.length;
            const totalCo2Saved = history.reduce((sum, item) => sum + (item.co2SavedKg || 0), 0);
            const totalMoneySaved = history.reduce((sum, item) => sum + (item.moneySaved || 0), 0);

            // Calculate "Green Level"
            let level = 'Seedling';
            if (totalCo2Saved > 50) level = 'Sapling';
            if (totalCo2Saved > 200) level = 'Tree Hugger';
            if (totalCo2Saved > 1000) level = 'Forest Guardian';

            return {
                totalEnergy: totalEnergy.toFixed(1),
                totalSessions,
                totalCo2Saved: totalCo2Saved.toFixed(1),
                totalMoneySaved: totalMoneySaved.toFixed(0),
                greenLevel: level,
                history // Return raw history for charts
            };
        } catch (error) {
            console.error("Failed to get aggregates:", error);
            return {
                totalEnergy: 0,
                totalSessions: 0,
                totalCo2Saved: 0,
                totalMoneySaved: 0,
                greenLevel: 'Seedling',
                history: []
            };
        }
    },

    /**
     * Clear history (Dev/Debug)
     */
    clearHistory: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
    }
};

export default statsService;
