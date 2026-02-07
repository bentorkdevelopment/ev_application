import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Animated, Easing, Switch, Image, BackHandler, ScrollView, Linking, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Flag, Bell, X, Info, ChevronDown, Coffee, Utensils, ShoppingBag, MapPin } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { sessionApi } from '../services/api';
import placesService from '../services/placesService';
import { useAlert } from '../context/AlertContext';
import { MOCK_CAFES } from '../data/mockCafes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function SessionScreen({ navigation, route }) {
    // Session State
    const [percentage, setPercentage] = useState(0);
    const [kwh, setKwh] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
    const [isActive, setIsActive] = useState(true);
    const [isStopping, setIsStopping] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    const [notify, setNotify] = useState(true); // Default ON



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
    const { planId, chargerId, boxId, selectedKwh, stationName, rate, connectorType, chargerType, resumeSessionId, startTime: resumeStartTime, autoStop, isDev } = route.params || {};
    const { showAlert } = useAlert();

    const [sessionId, setSessionId] = useState(null);
    const startTimeRef = useRef(Date.now());
    const isStoppingRef = useRef(false);

    // Dynamic Nearby Places State
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [cityIndex, setCityIndex] = useState(0); // For switching cafe sets (0=Pune, 1=Mumbai, etc)


    useEffect(() => {
        fetchRealNearbyPlaces();
    }, [cityIndex]);

    const fetchRealNearbyPlaces = async () => {
        try {
            // Load from Mock Data based on City Index
            const places = MOCK_CAFES[cityIndex] || [];

            if (!places || places.length === 0) {
                console.log("No mock places found.");
                generateFallbackPlaces();
                return;
            }

            // Process places to add UI metadata (Icon, Color, Type label)
            const formattedPlaces = places.map((p) => {
                let icon = Coffee;
                let color = '#FFA500'; // Default Orange
                let typeLabel = 'Cafe';

                const nameLower = (p.name || '').toLowerCase();

                // Simple heuristic for icon/color based on types/name
                if (nameLower.includes('pizza') || nameLower.includes('burger') || nameLower.includes('restaurant') || nameLower.includes('dining')) {
                    icon = Utensils;
                    color = '#FF4213';
                } else if (nameLower.includes('mart') || nameLower.includes('store') || nameLower.includes('shop')) {
                    icon = ShoppingBag;
                    color = '#9C27B0';
                }

                return {
                    ...p,
                    icon: icon,
                    color: color,
                    type: typeLabel,
                    distance: p.vicinity || 'Nearby',
                    latitude: p.geometry?.location?.lat,
                    longitude: p.geometry?.location?.lng
                };
            });

            setNearbyPlaces(formattedPlaces);

        } catch (error) {
            console.warn("Failed to fetch nearby places for Session:", error);
            generateFallbackPlaces();
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
                        setKwh(prev => prev + 0.5); // Simulated fast charging
                        setPercentage(prev => Math.min(prev + 0.9, 100)); // Simulated progress
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

    const handleNotifyToggle = async (value) => {
        // Optimistic update or wait? Let's wait for confirmation to avoid sync issues, 
        // or update and revert on failure. Let's wait for smoother UX if fast, but user might tap quickly.
        // Given the reliable feeling requested, let's call API then update.

        if (isDev) {
            setNotify(value);
            setTimeout(() => {
                showAlert(
                    "Notification Settings",
                    value ? "You will be notified when charging is complete (Dev Simulation)." : "Notifications disabled."
                );
            }, 500);
            return;
        }

        if (!sessionId) {
            showAlert("Error", "No active session to set notifications for.");
            return;
        }

        try {
            // Call Backend
            const response = await sessionApi.enableNotification(sessionId, value);

            // On Success
            setNotify(value);
            showAlert("Success", response?.message || (value ? "Notifications enabled." : "Notifications disabled."));

        } catch (error) {
            console.error("Notify Error:", error);
            showAlert("Error", "Failed to update notification settings. Please try again.");
            // Keep previous state (notify is not updated)
        }
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
                            <Zap size={40} color="#00E676" style={styles.initBolt} />
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
                    <TouchableOpacity
                        style={styles.minimizeBtn}
                        onPress={() => navigation.navigate('Home', { minimized: true })}
                    >
                        <ChevronDown color="#fff" size={28} />
                    </TouchableOpacity>

                    {/* Logo/Brand */}
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Main Hero Section: Percentage Circle */}
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
                                <Zap size={32} color="#00E676" style={styles.pulseIcon} />
                                <Text style={styles.percentText}>
                                    {(!selectedKwh || Number(selectedKwh) <= 0) ? '+' : ''}{percentage.toFixed(2)}<Text style={styles.unitText}>%</Text>
                                </Text>
                                <Text style={styles.statusText}>{isActive ? 'CHARGING' : 'COMPLETED'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Metrics Cards */}
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

                    {/* Nearby Amenities Section */}
                    <View style={styles.amenitiesSection}>
                        <Text style={styles.sectionTitle}>While you wait</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amenitiesScroll}>
                            {nearbyPlaces.map((place) => (
                                <TouchableOpacity
                                    key={place.id}
                                    style={styles.amenityCard}
                                    onPress={() => handlePlaceDirection(place)}
                                >
                                    <View style={[styles.amenityIconBox, { backgroundColor: `${place.color}20` }]}>
                                        <place.icon size={20} color={place.color} />
                                    </View>
                                    <View style={styles.amenityInfo}>
                                        <Text style={styles.amenityName} numberOfLines={1}>{place.name}</Text>
                                        <View style={styles.amenityMeta}>
                                            <Text style={styles.amenityDistance}>{place.distance}</Text>
                                            <Text style={styles.amenityType}>• {place.rating} ★</Text>
                                        </View>
                                    </View>
                                    <View style={styles.goBtn}>
                                        <MapPin size={16} color="#aaa" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Notification Toggle */}
                    <View style={styles.notifyRow}>
                        <View style={styles.notifyInfo}>
                            <View style={styles.notifyIconBox}>
                                <Bell size={18} color="#fff" />
                            </View>
                            <Text style={styles.notifyText}>Notify when complete</Text>
                        </View>
                        <Switch
                            value={notify}
                            onValueChange={handleNotifyToggle}
                            trackColor={{ false: "#555", true: "rgba(0, 230, 118, 0.5)" }}
                            thumbColor={notify ? "#00E676" : "#f4f3f4"}
                        />
                    </View>
                </ScrollView>

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
                            {isStopping ? "Stopping..." : "Stop Charging"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.stationId}>Station ID: {stationName || '8839202'}</Text>

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
        marginBottom: 30, // Add spacing below header
    },
    minimizeBtn: {
        position: 'absolute',
        left: 0,
        padding: 10,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 40,
        tintColor: '#fff',
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 12,
        paddingRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 12,
        minWidth: 200,
    },
    amenityIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    amenityInfo: {
        flex: 1,
    },
    amenityName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    amenityMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amenityDistance: {
        color: '#00E676',
        fontSize: 12,
        fontWeight: '600',
    },
    amenityType: {
        color: '#888',
        fontSize: 12,
        marginLeft: 4,
    },
    goBtn: {
        marginLeft: 8,
    },

    // Notify
    notifyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 1,
    },
    notifyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notifyIconBox: {
        width: 32,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifyText: {
        color: '#eee',
        fontSize: 14,
        fontWeight: '600',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 10,
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
    stationId: {
        textAlign: 'center',
        color: '#444',
        fontSize: 10,
        marginTop: 5,
        fontFamily: 'monospace',
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
