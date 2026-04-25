import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_SIMULATE_RELEASE_KEY = '@dev_simulate_release';

/**
 * Developer Settings Utility
 * 
 * Controls whether the app behaves like a "release" build even when running in debug.
 * When "Simulate Release" is ON, maintenance remote config values are respected.
 * When OFF (default in debug), maintenance remote config is ignored.
 * 
 * In actual release builds (__DEV__ === false), maintenance is ALWAYS respected
 * regardless of this toggle.
 */

/**
 * Returns true if maintenance remote config should be respected.
 * - In release builds: always true
 * - In debug builds: depends on the "Simulate Release" toggle
 */
export const shouldRespectMaintenance = async () => {
    if (!__DEV__) return true; // Always respect in release builds

    try {
        const val = await AsyncStorage.getItem(DEV_SIMULATE_RELEASE_KEY);
        return val === 'true';
    } catch (e) {
        return false; // Default: ignore maintenance in debug
    }
};

/**
 * Synchronous cache for use in renders / quick checks.
 * Must call `loadDevSettings()` first to populate.
 */
let _cachedSimulateRelease = false;

export const isSimulatingRelease = () => {
    if (!__DEV__) return true;
    return _cachedSimulateRelease;
};

export const loadDevSettings = async () => {
    if (!__DEV__) return;
    try {
        const val = await AsyncStorage.getItem(DEV_SIMULATE_RELEASE_KEY);
        _cachedSimulateRelease = val === 'true';
    } catch (e) {
        _cachedSimulateRelease = false;
    }
};

export const setSimulateRelease = async (value) => {
    try {
        await AsyncStorage.setItem(DEV_SIMULATE_RELEASE_KEY, value ? 'true' : 'false');
        _cachedSimulateRelease = value;
    } catch (e) {
        console.warn('Failed to save dev setting:', e);
    }
};

export const getSimulateRelease = async () => {
    try {
        const val = await AsyncStorage.getItem(DEV_SIMULATE_RELEASE_KEY);
        return val === 'true';
    } catch (e) {
        return false;
    }
};
