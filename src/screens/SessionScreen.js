import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Animated, Easing, Switch, Image, BackHandler, ScrollView, Linking, Platform, PermissionsAndroid, ToastAndroid, UIManager, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Flag, X, Info, ChevronDown, Coffee, Utensils, ShoppingBag, MapPin, RefreshCw, Sun, Cloud, Thermometer } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { sessionApi } from '../services/api';
import placesService from '../services/placesService';
import { useAlert } from '../context/AlertContext';
import { MOCK_CAFES } from '../data/mockCafes';
import statsService from '../services/statsService';
import EmergencyContactDialog from '../components/EmergencyContactDialog';
import AddReviewModal from '../components/AddReviewModal';
import GetLocation from 'react-native-get-location';
import environmentalService from '../services/environmentalService';
import LinearGradient from 'react-native-linear-gradient';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';

// SVG icons no longer needed for notification toggle
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SessionScreen({ navigation, route }) {
    // Session State
    const [percentage, setPercentage] = useState(0);
    const [kwh, setKwh] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
    const [isActive, setIsActive] = useState(true);
    const [isStopping, setIsStopping] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    const [notify, setNotify] = useState(true); // Default ON
    const [showEmergency, setShowEmergency] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [viewMode, setViewMode] = useState('stats'); // 'stats' or 'amenities'
    const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
    const [weatherData, setWeatherData] = useState(null);
    const [airQualityData, setAirQualityData] = useState(null);

    // Shared Element Transition Config
    const toggleViewMode = (mode) => {
        LayoutAnimation.configureNext({
            duration: 500,
            create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        setViewMode(mode);
    };



    // Warmup / Initialization State
    const [isInitializing, setIsInitializing] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Establishing secure connection...");
    const [messageIndex, setMessageIndex] = useState(0);

    const loadingMessages = [
        "Establishing secure connection...",
        "Verifying station status...",
        "Checking safety protocols...",
        "Initiating power flow..."
    ];

    // Animation Values
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Params (e.g. from ConfigScreen)
    const { planId, chargerId, boxId, selectedKwh, stationName, stationId, rate, connectorType, chargerType, resumeSessionId, startTime: resumeStartTime, autoStop, isDev, latitude, longitude } = route.params || {};
    const { showAlert } = useAlert();

    const [sessionId, setSessionId] = useState(null);
    const startTimeRef = useRef(Date.now());
    const isStoppingRef = useRef(false);

    // Dynamic Nearby Places State
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [cityIndex, setCityIndex] = useState(0); // For switching cafe sets (0=Pune, 1=Mumbai, etc)
    const [hasSentStartNotification, setHasSentStartNotification] = useState(false);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
    const fadeAnimPlaces = useRef(new Animated.Value(0)).current;

    // Trigger local push notification securely
    const sendLocalCompletionNotification = async () => {
        if (!notify) return;
        try {
            await notifee.requestPermission();
            const channelId = await notifee.createChannel({
                id: 'session_complete_high',
                name: 'Session Completion Alerts',
                importance: AndroidImportance.HIGH,
            });

            await notifee.displayNotification({
                title: 'Charging Complete ⚡',
                body: `Your EV session at ${stationName || 'the station'} has successfully finished.`,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    smallIcon: 'ic_launcher',
                    style: {
                        type: AndroidStyle.BIGTEXT,
                        text: `Your EV session at ${stationName || 'the station'} has successfully finished.`,
                    },
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        } catch (error) {
            console.warn("Failed to send local notification:", error);
        }
    };

    const sendLocalStartNotification = async (placeName) => {
        if (!notify) return;
        try {
            await notifee.requestPermission();
            const channelId = await notifee.createChannel({
                id: 'session_start_high',
                name: 'Session Start Alerts',
                importance: AndroidImportance.HIGH,
            });

            const bodyText = placeName ? `Why not explore ${placeName} while charging completes?` : `Why not explore the area while charging completes?`;

            await notifee.displayNotification({
                title: 'Charging started! ⚡',
                body: bodyText,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    smallIcon: 'ic_launcher',
                    style: {
                        type: AndroidStyle.BIGTEXT,
                        text: bodyText,
                    },
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        } catch (error) {
            console.warn("Failed to send start notification:", error);
        }
    };

    // Dynamic Start Notification Dispatcher
    useEffect(() => {
        if (!isInitializing && isActive && !resumeSessionId && nearbyPlaces.length > 0 && !hasSentStartNotification) {
            // Find the highest rated place within our nearby places
            const topPlace = nearbyPlaces.reduce((prev, current) => {
                const prevRating = prev.rating || 0;
                const currentRating = current.rating || 0;
                return (prevRating > currentRating) ? prev : current;
            }, nearbyPlaces[0]);

            setHasSentStartNotification(true);
            sendLocalStartNotification(topPlace?.name);
        }
    }, [isInitializing, isActive, resumeSessionId, nearbyPlaces, hasSentStartNotification]);

    // Auto-switch to amenities after 10 seconds
    useEffect(() => {
        if (isActive && timeElapsed >= 10 && !hasAutoSwitched && !isInitializing) {
            toggleViewMode('amenities');
            setHasAutoSwitched(true);
        }
    }, [timeElapsed, isActive, hasAutoSwitched, isInitializing]);

    useEffect(() => {
        fetchRealNearbyPlaces();
    }, [latitude, longitude, cityIndex]);

    const fetchRealNearbyPlaces = async () => {
        setIsLoadingPlaces(true);
        fadeAnimPlaces.setValue(0);

        try {
            let userLat = latitude;
            let userLng = longitude;

            try {
                const location = await GetLocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                });

                userLat = location.latitude;
                userLng = location.longitude;
                console.log("Using actual user location for amenities:", userLat, userLng);
            } catch (locationError) {
                console.warn("Could not get user location for amenities, falling back to params:", locationError.message);
            }

            if (userLat && userLng) {
                // Fetch amenities
                const places = await placesService.fetchNearbyAmenities(userLat, userLng);

                // Fetch live weather and air quality
                fetchEnvironmentalData(userLat, userLng);

                if (places && places.length > 0) {
                    const formattedPlaces = places.map((p) => {
                        let icon = Coffee;
                        let color = '#FFA500'; // Default Orange

                        const type = p.type || 'Cafe';

                        if (type === 'Restaurant' || type === 'Rest stop') {
                            icon = Utensils;
                            color = '#FF4213';
                        } else if (type === 'Shopping mall' || type === 'Mall') {
                            icon = ShoppingBag;
                            color = '#9C27B0';
                        }

                        const lat2 = p.geometry?.location?.lat;
                        const lng2 = p.geometry?.location?.lng;
                        let distanceStr = 'Nearby';

                        if (userLat && userLng && lat2 && lng2) {
                            const R = 6371; // km
                            const dLat = (lat2 - userLat) * (Math.PI / 180);
                            const dLon = (lng2 - userLng) * (Math.PI / 180);
                            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos(userLat * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            const d = R * c;
                            distanceStr = d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`;
                        }

                        return {
                            ...p,
                            icon: icon,
                            color: color,
                            distance: distanceStr,
                            latitude: lat2,
                            longitude: lng2
                        };
                    });

                    setNearbyPlaces(formattedPlaces);
                    return;
                }
            }

            // Fallback to mock data if API fails or no coordinates
            const mockData = MOCK_CAFES[cityIndex] || [];

            if (!mockData || mockData.length === 0) {
                generateFallbackPlaces();
                return;
            }

            const formattedMock = mockData.map((p) => {
                let icon = Coffee;
                let color = '#FFA500';
                const nameLower = (p.name || '').toLowerCase();

                if (nameLower.includes('pizza') || nameLower.includes('burger') || nameLower.includes('restaurant') || nameLower.includes('dining')) {
                    icon = Utensils;
                    color = '#FF4213';
                } else if (nameLower.includes('mart') || nameLower.includes('store') || nameLower.includes('shop')) {
                    icon = ShoppingBag;
                    color = '#9C27B0';
                }

                return { ...p, icon, color, type: 'Cafe', latitude: p.geometry?.location?.lat, longitude: p.geometry?.location?.lng };
            });

            setNearbyPlaces(formattedMock);

        } catch (error) {
            console.warn("Failed to fetch nearby places for Session:", error);
            generateFallbackPlaces();
        } finally {
            setIsLoadingPlaces(false);
            Animated.timing(fadeAnimPlaces, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    };

    const fetchEnvironmentalData = async (lat, lng) => {
        try {
            const [weather, aq] = await Promise.allSettled([
                environmentalService.getCurrentWeather(lat, lng),
                environmentalService.getAirQuality(lat, lng)
            ]);

            if (weather.status === 'fulfilled') {
                setWeatherData(weather.value);
            }
            if (aq.status === 'fulfilled') {
                setAirQualityData(aq.value);
            }
        } catch (error) {
            console.warn("Failed to fetch environmental data:", error);
        }
    };

    const generateFallbackPlaces = () => {
        // Keep a small fallback just in case API fails
        const places = [
            { id: 1, name: 'Local Cafe', icon: Coffee, color: '#795548', type: 'Coffee', distance: '100m', rating: 4.5 },
            { id: 2, name: 'Convenience Store', icon: ShoppingBag, color: '#FF9800', type: 'Shopping', distance: '150m', rating: 4.0 },
        ];
        setNearbyPlaces(places);
    };

    // Notification Permission Request
    useEffect(() => {
        const checkPermission = async () => {
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.log("Notification permission denied");
                    }
                } catch (err) {
                    console.warn(err);
                }
            }
        };
        checkPermission();
    }, []);

    // Hardware Back Button Handler -> Minimize
    useEffect(() => {
        const backAction = () => {
            // If active, go to Home with Minimized param
            if (isActive) {
                navigation.navigate('Home', { minimized: true });
                return true;
            }
            // If not active (e.g. stopped/finished), allow default back or prevent if processing
            if (isStopping) return true;

            return false; // Default behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [isActive, isStopping, navigation]);

    // Start Session & Warmup Logic
    useEffect(() => {
        let isMounted = true;

        const startChargingSession = async () => {
            // DEV MODE SHORTCUT
            if (isDev) {
                console.log("Starting DEV Session...");
                setIsInitializing(true);

                // Simulate Warmup
                for (let i = 0; i < loadingMessages.length; i++) {
                    if (!isMounted) return;
                    setLoadingMessage(loadingMessages[i]);
                    setMessageIndex(i);
                    await new Promise(r => setTimeout(r, 400)); // Faster for dev
                }

                if (isMounted) {
                    setSessionId('DEV-SESSION-' + Date.now());
                    startTimeRef.current = Date.now();
                    setIsActive(true);
                    setIsInitializing(false);
                }
                return;
            }

            // CHECK FOR RESUME
            if (resumeSessionId) {
                console.log("Resuming session:", resumeSessionId);
                setSessionId(resumeSessionId);
                setIsActive(true);
                setIsInitializing(false);

                let startTs = 0;
                // If resuming, calculate correct start time
                if (resumeStartTime) {
                    console.log("Resume Start Time Raw:", resumeStartTime);

                    if (Array.isArray(resumeStartTime)) {
                        startTs = new Date(
                            resumeStartTime[0],
                            resumeStartTime[1] - 1,
                            resumeStartTime[2],
                            resumeStartTime[3],
                            resumeStartTime[4],
                            resumeStartTime[5] || 0
                        ).getTime();
                    } else {
                        startTs = new Date(resumeStartTime).getTime();
                    }

                    // Sanity Check
                    if (!isNaN(startTs) && startTs > 1672531200000) {
                        startTimeRef.current = startTs;
                    } else {
                        console.warn("Invalid Resume Time, resetting.");
                        startTimeRef.current = Date.now();
                        startTs = Date.now();
                    }
                } else {
                    startTs = Date.now();
                    startTimeRef.current = startTs;
                }

                // CHECK AUTO-STOP
                if (autoStop) {
                    console.log("Auto-Stop Triggered from Home");
                    setIsStopping(true);
                    try {
                        const result = await sessionApi.stopSession(resumeSessionId);
                        const duration = Math.floor((Date.now() - startTs) / 1000);

                        // Save Stats Locally
                        statsService.saveSession({
                            id: resumeSessionId,
                            energyDelivered: result?.energyUsed || 0,
                            duration: result?.duration || duration,
                            cost: result?.cost || 0,
                            stationName,
                            rate,
                            connectorType,
                            chargerType
                        });

                        navigation.replace('Invoice', {
                            sessionData: result || {},
                            sessionId: resumeSessionId,
                            finalEnergy: result?.energyUsed || 0,
                            finalDuration: result?.duration || duration,
                            stationName, rate, connectorType, chargerType
                        });
                    } catch (err) {
                        console.error("AutoStop Failed:", err);
                        showAlert("Error", "Failed to stop session automatically.");
                        setIsStopping(false);
                    }
                }
                return;
            }

            // Start with warmup
            setIsInitializing(true);

            if (!chargerId || !boxId) {
                showAlert("Error", "Missing charger information.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
                setIsInitializing(false);
                return;
            }

            // TRIGGER API IN PARALLEL
            // We start the request but don't await it yet. This allows hardware to warm up while animation plays.
            const sessionStartPromise = sessionApi.startSession({
                chargerId,
                boxId,
                planId,
                selectedKwh
            }).catch(err => ({ error: err })); // Catch errors to allow animation to finish gracefully

            // Cycle through messages (Warmup Animation)
            // Total time: 4 messages * 2200ms = 8.8 seconds (Matches hardware warmup time)
            for (let i = 0; i < loadingMessages.length; i++) {
                if (!isMounted) return;
                setLoadingMessage(loadingMessages[i]);
                setMessageIndex(i);
                await new Promise(r => setTimeout(r, 2200));
            }

            try {
                // Await result after animation
                const startResponse = await sessionStartPromise;

                if (startResponse.error) {
                    throw startResponse.error;
                }

                if (startResponse && startResponse.sessionId) {
                    setSessionId(startResponse.sessionId);
                    setIsActive(true);
                    startTimeRef.current = Date.now();
                } else {
                    throw new Error(startResponse?.message || "Failed to start session");
                }

            } catch (error) {
                console.error("Session Start Error:", error);
                showAlert("Failed", error.userMessage || "Could not start charging session", [
                    { text: "OK", onPress: () => navigation.navigate('Home') } // Go Home on failure
                ]);
            } finally {
                if (isMounted) setIsInitializing(false);
            }
        };

        startChargingSession();

        return () => {
            isMounted = false;
        };
    }, [chargerId, boxId, planId, selectedKwh, navigation, resumeSessionId, resumeStartTime, isDev]);

    // Polling for Real-time Data and Status
    useEffect(() => {
        let interval;
        if (isActive && sessionId) {
            interval = setInterval(async () => {
                try {
                    // Update Time
                    const now = Date.now();
                    const seconds = Math.floor((now - startTimeRef.current) / 1000);
                    setTimeElapsed(seconds);

                    // DEV MODE SIMULATION
                    if (isDev) {
                        // Simulate values
                        setKwh(prev => prev + 0.001); // Simulated fast charging
                        setPercentage(prev => {
                            const nextPct = Math.min(prev + 0.001, 100);

                            // If it exactly reached 100% just now, complete the dev session
                            if (nextPct >= 100 && prev < 100) {
                                // Use setTimeout to escape the current update phase and avoid "update while rendering" errors
                                setTimeout(() => {
                                    sendLocalCompletionNotification();
                                    setIsActive(false);
                                    if (interval) clearInterval(interval);
                                    showAlert("Dev Session Ended", "The simulated charging session has ended.", [
                                        {
                                            text: "View Invoice",
                                            onPress: () => navigation.replace('Invoice', {
                                                sessionId,
                                                finalEnergy: kwh + 0.5, // Reference to kwh from closure or previous state
                                                finalDuration: timeElapsed,
                                                stationName,
                                                rate,
                                                connectorType,
                                                chargerType
                                            })
                                        }
                                    ]);
                                }, 0);
                            }
                            return nextPct;
                        });
                        return;
                    }

                    // Fetch Status
                    const status = await sessionApi.getSessionStatus(sessionId);
                    const statusUpper = status ? status.toUpperCase() : '';

                    // Check for Failure
                    if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
                        setIsActive(false);
                        clearInterval(interval);
                        showAlert("Session Failed", "The charging session failed to start or was interrupted unexpectedly.", [
                            { text: "OK", onPress: () => navigation.navigate('Home') }
                        ]);
                        return;
                    }

                    // Check for Remote Stop / Completion
                    if (['STOPPED', 'COMPLETED', 'FINISHED'].includes(statusUpper)) {
                        // Prevent double navigation if manual stop is in progress
                        if (isStoppingRef.current) return;

                        setIsActive(false);
                        clearInterval(interval);

                        // Fetch final energy one last time to be sure
                        let finalEnergy = kwh;
                        try {
                            finalEnergy = await sessionApi.getSessionEnergy(sessionId);
                        } catch (e) { }

                        // Save Stats Locally
                        statsService.saveSession({
                            id: sessionId,
                            energyDelivered: finalEnergy || kwh,
                            duration: timeElapsed,
                            cost: 0, // Cost might not be available in polling, will rely on Invoice or API
                            stationName,
                            rate,
                            connectorType,
                            chargerType
                        });

                        // Fire native push notification locally to guarantee delivery!
                        sendLocalCompletionNotification();

                        showAlert("Session Ended", "The charging session has ended.", [
                            {
                                text: "View Invoice",
                                onPress: () => navigation.replace('Invoice', {
                                    sessionId,
                                    finalEnergy: finalEnergy || kwh,
                                    finalDuration: timeElapsed,
                                    // Pass originally received details
                                    stationName,
                                    rate,
                                    connectorType,
                                    chargerType
                                })
                            }
                        ]);
                        return;
                    }

                    // Fetch Energy
                    const energy = await sessionApi.getSessionEnergy(sessionId);
                    setKwh(energy || 0);

                    // Calculate Percentage
                    if (selectedKwh && Number(selectedKwh) > 0) {
                        // Custom Target: Exact % progress
                        const pct = Math.min(((energy || 0) / Number(selectedKwh)) * 100, 100);
                        setPercentage(pct);
                    } else {
                        // Plan Based (Open Ended):
                        const visualPct = Math.min(((energy || 0) / 1) * 100, 100);
                        setPercentage(visualPct);
                    }

                } catch (err) {
                    console.log("Polling error:", err);
                }
            }, 1000); // Poll every 1 seconds
        }
        return () => clearInterval(interval);
    }, [isActive, sessionId, selectedKwh, navigation, isDev]);

    // Animate the circle stroke
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 800, // Slightly longer for smoothness
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease), // Smooth ease-in-out
        }).start();
    }, [percentage]);

    // Format Time Metrics
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStopPress = () => {
        setShowStopModal(true);
    };

    const confirmStop = async () => {
        setIsStopping(true);
        isStoppingRef.current = true;
        let result = null;
        try {
            if (isDev) {
                // Mock Stop Result for Dev
                result = {
                    energyUsed: kwh,
                    duration: timeElapsed,
                    cost: (kwh * (parseFloat(rate) || 15)).toFixed(2)
                };
            } else if (sessionId) {
                result = await sessionApi.stopSession(sessionId);
                console.log("Session Stopped:", result);

                // Final update with server result
                if (result.energyUsed) setKwh(result.energyUsed);
            }

            // Save Stats Locally
            if (sessionId || isDev) {
                statsService.saveSession({
                    id: sessionId || 'DEV_SESSION_' + Date.now(),
                    energyDelivered: result?.energyUsed || kwh,
                    duration: result?.duration || timeElapsed,
                    cost: result?.cost || 0,
                    stationName,
                    rate,
                    connectorType,
                    chargerType
                });
            }

            setIsActive(false);
            setShowStopModal(false);

            navigation.replace('Invoice', {
                sessionData: result || {},
                sessionId: sessionId,
                finalEnergy: result?.energyUsed || kwh,
                finalDuration: result?.duration || timeElapsed,
                // Pass originally received details
                stationName,
                rate,
                connectorType,
                chargerType
            });

        } catch (error) {
            console.error("Stop Error:", error);
            showAlert("Error", "Failed to stop session properly. Please try again or contact support.");
        } finally {
            setIsStopping(false);
        }
    };

    const handlePlaceDirection = (place) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${place.latitude},${place.longitude}`;
        const label = place.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const showToast = (message) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            // Unobtrusive fallback for iOS without custom libraries
            console.log(message);
        }
    };

    const handleRefresh = async () => {
        if (!sessionId) {
            showToast("Session not ready yet.");
            return;
        }

        try {
            showToast("Refreshing live data...");

            // Fetch Status
            const status = await sessionApi.getSessionStatus(sessionId);
            const statusUpper = status ? status.toUpperCase() : '';

            // Check for Failure
            if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
                setIsActive(false);
                showAlert("Session Failed", "The charging session was interrupted unexpectedly.", [
                    { text: "OK", onPress: () => navigation.navigate('Home') }
                ]);
                return;
            }

            // Check for Remote Stop / Completion
            if (['STOPPED', 'COMPLETED', 'FINISHED'].includes(statusUpper)) {
                if (isStoppingRef.current) return;

                setIsActive(false);
                let finalEnergy = kwh;
                try {
                    finalEnergy = await sessionApi.getSessionEnergy(sessionId);
                } catch (e) { }

                statsService.saveSession({
                    id: sessionId,
                    energyDelivered: finalEnergy || kwh,
                    duration: timeElapsed,
                    cost: 0,
                    stationName,
                    rate,
                    connectorType,
                    chargerType
                });

                sendLocalCompletionNotification();

                showAlert("Session Ended", "The charging session has ended.", [
                    {
                        text: "View Invoice",
                        onPress: () => navigation.replace('Invoice', {
                            sessionId,
                            finalEnergy: finalEnergy || kwh,
                            finalDuration: timeElapsed,
                            stationName,
                            rate,
                            connectorType,
                            chargerType
                        })
                    }
                ]);
                return;
            }

            // Fetch Energy
            const energy = await sessionApi.getSessionEnergy(sessionId);
            setKwh(energy || 0);

            // Calculate Percentage
            if (selectedKwh && Number(selectedKwh) > 0) {
                const pct = Math.min(((energy || 0) / Number(selectedKwh)) * 100, 100);
                setPercentage(pct);
            } else {
                const visualPct = Math.min(((energy || 0) / 1) * 100, 100);
                setPercentage(visualPct);
            }

            showToast("Data updated.");

        } catch (error) {
            console.error("Manual Refresh Error:", error);
            showToast("Failed to refresh session data.");
        }
    };

    const renderAmenities = (vertical = false) => {
        if (isLoadingPlaces) {
            return (
                <ScrollView
                    horizontal={!vertical}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={!vertical ? styles.amenitiesScroll : { gap: 12, paddingHorizontal: 20 }}
                >
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <View key={idx} style={[styles.amenityCard, vertical && { width: '100%', marginRight: 0, marginBottom: 12, flexDirection: 'row', height: 100 }, { borderColor: '#222' }]}>
                            <View style={[styles.amenityImagePlaceholder, vertical ? { width: 100, height: 100 } : { width: 140, height: 140 }, { backgroundColor: '#333' }]} />
                            <View style={styles.amenityCardContent}>
                                <View style={{ width: 100, height: 14, backgroundColor: '#444', borderRadius: 4, marginBottom: 8 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ width: 30, height: 12, backgroundColor: '#444', borderRadius: 4 }} />
                                    <View style={{ width: 40, height: 12, backgroundColor: '#444', borderRadius: 4 }} />
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            );
        }

        return (
            <Animated.View style={{ opacity: fadeAnimPlaces }}>
                <ScrollView
                    horizontal={!vertical}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={!vertical ? styles.amenitiesScroll : { gap: 12, paddingBottom: 20, paddingHorizontal: vertical ? 20 : 0 }}
                >
                    {nearbyPlaces.map((place, index) => (
                        <TouchableOpacity
                            key={`${place.id}_${index}`}
                            style={[
                                styles.amenityCard,
                                vertical && { width: '100%', marginRight: 0, marginBottom: 12, flexDirection: 'row', height: 100 }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => handlePlaceDirection(place)}
                        >
                            {place.photoUrl || place.image ? (
                                <Image
                                    source={{ uri: place.photoUrl || place.image }}
                                    style={vertical ? { width: 100, height: 100 } : styles.amenityImage}
                                />
                            ) : (
                                <View style={[styles.amenityImagePlaceholder, vertical && { width: 100, height: 100 }]}>
                                    <place.icon size={vertical ? 28 : 36} color="#D7CCC8" />
                                </View>
                            )}
                            <View style={[styles.amenityCardContent, vertical && { flex: 1, justifyContent: 'center' }]}>
                                <Text style={styles.amenityName} numberOfLines={1}>{place.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                    <Text style={styles.amenityRating}>★ {place.rating}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ color: place.isOpen !== false ? '#00E676' : '#FF4213', fontSize: 11, fontWeight: 'bold' }}>
                                            {place.isOpen !== false ? 'Open' : 'Closed'}
                                        </Text>
                                        {vertical && place.distance && (
                                            <Text style={{ color: '#666', fontSize: 11 }}>• {place.distance}</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>
        );
    };

    // Circular Progress Props
    const size = 280;
    const strokeWidth = 10; // Thicker for premium look
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Interpolate Dashoffset
    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    return (
        <View style={styles.container}>
            <View style={styles.background} />

            {/* WARMUP OVERLAY */}
            <Modal
                visible={isInitializing}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.overlayGlass}>
                    <View style={styles.initContent}>
                        <View style={styles.boltWrapper}>
                            <BoltIcon width={40} height={40} fill="#00E676" style={styles.initBolt} />
                        </View>
                        <Text style={styles.initTitle}>Starting Session</Text>
                        <Text style={styles.statusMsg}>{loadingMessage}</Text>

                        <View style={styles.loadingDots}>
                            {loadingMessages.map((_, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.dot,
                                        idx <= messageIndex && styles.dotActive
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={styles.helperText}>Connecting to your vehicle...</Text>
                    </View>
                </View>
            </Modal>

            <SafeAreaView style={styles.content} edges={['top', 'bottom']}>

                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['#212121ff', '#212121ff', 'hsla(0, 0%, 13%, 0.00)']}
                        locations={[0, 0.6, 1]}
                        style={[StyleSheet.absoluteFill, { left: -20, right: -20, bottom: -30, zIndex: -1 }]}
                    />

                    <TouchableOpacity
                        style={styles.minimizeBtn}
                        onPress={() => navigation.navigate('Home', { minimized: true })}
                    >
                        <ChevronDown color="#fff" size={28} />
                    </TouchableOpacity>

                    {/* Header Title */}
                    <Text style={styles.headerTitle}>Charging In Progress</Text>

                    {/* Refresh Button (Top Right) */}
                    <TouchableOpacity
                        style={styles.refreshHeaderBtn}
                        onPress={handleRefresh}
                        activeOpacity={0.7}
                    >
                        <RefreshCw color="#fff" size={24} />
                    </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Main Hero Section: Percentage Circle - Always rendered for smooth height animation */}
                    <View style={[
                        { overflow: 'hidden' },
                        viewMode === 'amenities' ? { height: 0, opacity: 0 } : { opacity: 1 }
                    ]}>
                        <View style={styles.heroSection}>
                            <View style={styles.circleContainer}>
                                <Svg width={size} height={size}>
                                    <Circle
                                        stroke="rgba(0, 230, 118, 0.1)"
                                        strokeWidth={strokeWidth}
                                        fill="none"
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                    />
                                    <AnimatedCircle
                                        stroke="#00E676"
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={`${circumference} ${circumference}`}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        fill="none"
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        rotation="-90"
                                        origin={`${size / 2}, ${size / 2}`}
                                    />
                                </Svg>

                                <View style={styles.circleInner}>
                                    <BoltIcon width={32} height={32} fill="#00E676" style={styles.pulseIcon} />
                                    <Text style={styles.percentText}>
                                        {(!selectedKwh || Number(selectedKwh) <= 0) ? '+' : ''}{percentage.toFixed(2)}<Text style={styles.unitText}>%</Text>
                                    </Text>
                                    <Text style={styles.statusText}>{isActive ? 'CHARGING' : 'COMPLETED'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {viewMode === 'stats' ? (
                        <>
                            {/* Full Metrics Cards */}
                            <View style={styles.metricsContainer}>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Energy Delivered</Text>
                                    <View style={styles.metricRow}>
                                        <Text style={styles.metricValue}>{kwh.toFixed(2)}</Text>
                                        <Text style={styles.metricUnit}>kWh</Text>
                                    </View>
                                </View>

                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>Session Duration</Text>
                                    <View style={styles.metricRow}>
                                        <Text style={styles.metricValue}>{formatTime(timeElapsed)}</Text>
                                    </View>
                                </View>
                            </View>



                            {/* Minimal Nearby Section */}
                            <View style={styles.amenitiesSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>While you wait</Text>
                                    <TouchableOpacity onPress={() => toggleViewMode('amenities')}>
                                        <Text style={styles.viewAllBtn}>Explore All</Text>
                                    </TouchableOpacity>
                                </View>
                                {renderAmenities()}
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Mini Stats Bar */}
                            <View style={[styles.miniStatsBar, { marginTop: 15, paddingVertical: 16 }]}>
                                <View style={{ flex: 1 }}>
                                    <View style={[styles.miniStatItem, { marginBottom: 8 }]}>
                                        <MapPin size={16} color="#00E676" />
                                        <Text style={[styles.miniStatValue, { fontSize: 17 }]} numberOfLines={1}>{stationName || 'Bentork Hub'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={styles.miniStatItem}>
                                            <Zap size={14} color="#00E676" />
                                            <Text style={styles.miniStatValue}>{kwh.toFixed(2)} <Text style={styles.miniStatUnit}>kWh</Text></Text>
                                        </View>
                                        <View style={styles.miniStatDivider} />
                                        <View style={styles.miniStatItem}>
                                            <Text style={styles.miniStatValue}>{formatTime(timeElapsed)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.expandStatsBtn}
                                    onPress={() => toggleViewMode('stats')}
                                >
                                    <Info size={24} color="#00E676" />
                                </TouchableOpacity>
                            </View>

                            {/* Weather & Environment Section */}
                            <View style={styles.weatherSection}>
                                <Text style={styles.sectionTitle}>Environment & Weather</Text>
                                <View style={styles.weatherGrid}>
                                    <View style={styles.weatherCard}>
                                        <View style={styles.weatherIconContainer}>
                                            <Sun size={24} color={weatherData ? "#FFD54F" : "#FFD54F"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.weatherTemp}>{weatherData ? `${Math.round(weatherData.temperature.degrees)}°C` : '...'}</Text>
                                            <Text style={styles.weatherDesc} numberOfLines={1}>
                                                {weatherData ? weatherData.weatherCondition.description.text : 'Fetching...'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.weatherCard}>
                                        <View style={styles.weatherIconContainer}>
                                            <Cloud size={24} color={airQualityData ? "#90CAF9" : "#90CAF9"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.weatherTemp}>
                                                {airQualityData ? `AQI ${airQualityData.indexes[0].aqi}` : '...'}
                                            </Text>
                                            <Text style={[styles.weatherDesc]} numberOfLines={1}>
                                                {airQualityData ? airQualityData.indexes[0].category : 'Fetching...'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Expanded Amenities Section */}
                            <View style={styles.amenitiesSection}>
                                <Text style={styles.sectionTitle}>Recommended for you</Text>
                                {renderAmenities()}
                            </View>
                        </>
                    )}
                </ScrollView>

                <View style={styles.footerWrapper}>
                    <LinearGradient
                        colors={['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 0.95)', '#121212']}
                        style={[StyleSheet.absoluteFill, { top: -40 }]}
                        pointerEvents="none"
                    />
                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Flag color="#aaa" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.stopBtn, (isStopping || !isActive) && styles.disabledBtn]}
                            onPress={handleStopPress}
                            disabled={isStopping || !isActive}
                        >
                            <Text style={styles.stopBtnText}>
                                {isStopping ? "Stopping..." : "End Session"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Powered By Branding */}
                    <View style={styles.poweredByContainer}>
                        <Text style={styles.poweredByText}>Powered by</Text>
                        <Image
                            source={require('../assets/images/logo_inverted.png')}
                            style={styles.poweredByLogo}
                            resizeMode="contain"
                        />
                    </View>
                </View>

            </SafeAreaView>

            {/* Stop Confirmation Modal */}
            <Modal
                transparent={true}
                visible={showStopModal}
                animationType="fade"
                onRequestClose={() => setShowStopModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Stop Session?</Text>
                            <TouchableOpacity onPress={() => setShowStopModal(false)}>
                                <X color="#ccc" size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>Are you sure you want to stop the charging session?</Text>

                        <View style={styles.modalStats}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Time Elapsed</Text>
                                <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Energy Used</Text>
                                <Text style={styles.statValue}>{kwh.toFixed(2)} kWh</Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStopModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmStop}>
                                <Text style={styles.confirmBtnText}>Stop Charging</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <EmergencyContactDialog
                visible={showEmergency}
                onClose={() => setShowEmergency(false)}
                stationId={stationId}
            />

            <AddReviewModal
                visible={showReviewModal}
                onClose={() => {
                    setShowReviewModal(false);
                    // Navigate home after closing review modal (whether submitted or cancelled)
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }}
                stationId={stationId}
                onReviewSubmitted={() => {
                    // Optional: Show success toast
                    console.log("Review submitted");
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#121212',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        width: '100%',
        marginBottom: 0, // Add spacing below header
    },
    minimizeBtn: {
        position: 'absolute',
        left: 0,
        padding: 10,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshHeaderBtn: {
        position: 'absolute',
        right: 0,
        padding: 10,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Hero
    heroSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    circleContainer: {
        width: 280,
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleInner: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseIcon: {
        marginBottom: 10,
    },
    percentText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    unitText: {
        fontSize: 24,
        color: '#888',
        fontWeight: 'normal',
    },
    statusText: {
        color: '#aaa',
        fontSize: 12,
        letterSpacing: 2,
        marginTop: 5,
        fontWeight: '600',
    },

    // Metrics
    metricsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 12,
        marginBottom: 5,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
    },
    metricLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 5,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    metricValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricUnit: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
    },
    poweredByContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: -8,
        marginBottom: -24,
        opacity: 0.9,
    },
    poweredByText: {
        color: '#888',
        fontSize: 11,
        fontWeight: '500',
    },
    poweredByLogo: {
        width: 70,
        height: 72,
        tintColor: '#fff',
    },
    miniStatsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginTop: -10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    miniStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    miniStatValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    miniStatUnit: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'normal',
    },
    miniStatDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 15,
    },
    expandStatsBtn: {
        marginLeft: 'auto',
        padding: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    weatherSection: {
        marginBottom: 25,
        paddingHorizontal: 2,
    },
    weatherGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    weatherCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 10,
    },
    weatherIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    weatherTemp: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    weatherDesc: {
        color: '#888',
        fontSize: 12,
    },
    viewAllBtn: {
        color: '#00E676',
        fontSize: 12,
        fontWeight: '600',
    },

    // Amenities
    amenitiesSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    amenitiesScroll: {
        paddingRight: 20,
        gap: 12,
    },
    amenityCard: {
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        marginRight: 12,
        width: 140,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    amenityImage: {
        width: 140,
        height: 140, // 1:1 Aspect Ratio
        resizeMode: 'cover',
    },
    amenityImagePlaceholder: {
        width: 140,
        height: 140,
        backgroundColor: '#3E2723',
        justifyContent: 'center',
        alignItems: 'center',
    },
    amenityCardContent: {
        padding: 12,
        paddingTop: 10,
    },
    amenityName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    amenityRating: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Footer
    footerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: -20,
        right: -20,
        paddingHorizontal: 20,
        paddingBottom: 10,
        zIndex: 100,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconBtn: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(40,40,40,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopBtn: {
        flex: 1,
        height: 52,
        backgroundColor: '#FF4213',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF4213',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    stopBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledBtn: {
        opacity: 0.6,
    },


    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalDesc: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 20,
    },
    modalStats: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        color: '#ccc',
        fontSize: 14,
    },
    statValue: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#888',
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#EF4444',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Warmup / Overlay Styles
    overlayGlass: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    initContent: {
        alignItems: 'center',
        padding: 20,
    },
    boltWrapper: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.3)',
    },
    initBolt: {
        shadowColor: "#00E676",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    initTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusMsg: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 24,
        height: 24,
        textAlign: 'center',
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#444',
    },
    dotActive: {
        backgroundColor: '#00E676',
        transform: [{ scale: 1.2 }],
    },
    helperText: {
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
    },
});
