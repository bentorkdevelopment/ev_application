import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Modal, Animated, Easing, Dimensions, Platform, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
// Custom Icons
import ArrowBackIcon from '../assets/icons/Outlined/arrow_back_ios_new_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WalletIcon from '../assets/icons/Outlined/wallet_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import AddIcon from '../assets/icons/Outlined/add_24dp_E3E3E3_FILL0_wght400_GRAD-25_opsz24.svg';
import RemoveIcon from '../assets/icons/Rounded Fill/substract.svg';
import { X, Check, Calendar, Clock } from 'lucide-react-native';
import { format, addDays, isSameDay } from 'date-fns';

import Svg, { Path, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { Colors } from '../styles/GlobalStyles';

import { plansApi, authApi, userApi, sessionApi, slotsApi, slotBookingApi } from '../services/api';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';

const { width, height } = Dimensions.get('window');

const PATH_GREEN = "M41.3,-72.6C53.4,-65.3,63.2,-54.6,70.4,-42.1C77.6,-29.6,82.2,-15.3,81.3,-1.4C80.4,12.5,74,26,64.8,37.3C55.6,48.6,43.6,57.7,30.8,63.2C18,68.7,4.4,70.6,-8.3,69.7C-21,68.8,-32.8,65.1,-43.2,58.3C-53.6,51.5,-62.6,41.6,-68.9,30.1C-75.2,18.6,-78.8,5.5,-75.9,-6.2C-73,-17.9,-63.6,-28.2,-53.4,-36.5C-43.2,-44.8,-32.2,-51.1,-20.9,-58.5C-9.6,-65.9,2,-74.4,14.5,-76.6C27,-78.8,40.4,-74.7,41.3,-72.6Z";

const GradientBolt = ({ size = 24, style, isGrey = false }) => {
    return (
        <Svg width={size} height={size} viewBox="0 -960 960 960" style={style}>
            <Defs>
                <SvgGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="60%" stopColor={isGrey ? "#555" : "#39E29B"} />
                    <Stop offset="100%" stopColor={isGrey ? "#333" : "#008f45"} />
                </SvgGradient>
            </Defs>
            <Path d="M360-360H236q-24 0-35.5-21.5T203-423l299-430q10-14 26-19.5t33 .5q17 6 25 21t6 32l-32 259h155q26 0 36.5 23t-6.5 43L416-100q-11 13-27 17t-31-3q-15-7-23.5-21.5T328-139l32-221Z" fill="url(#boltGrad)" />
        </Svg>
    );
};

// Global Status Icon Component
const StatusBolt = ({ size = 32, isAvailable, isReady }) => {
    const boltPulse = useRef(new Animated.Value(1)).current;
    const colorTransition = useRef(new Animated.Value(0)).current; // 0 = Grey, 1 = Active Color

    const isActive = isAvailable && isReady;

    useEffect(() => {
        // Balanced 'Power Up' and 'Power Down' transitions
        Animated.timing(colorTransition, {
            toValue: isActive ? 1 : 0,
            duration: isActive ? 1000 : 700, // Slightly faster lit-down for responsive feel
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
        }).start();

        if (isActive) {
            // Smoothly initiate pulsing
            Animated.loop(
                Animated.sequence([
                    Animated.timing(boltPulse, {
                        toValue: 0.6,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(boltPulse, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            // Smoothly stop pulsing and return to solid opacity as it lits down
            boltPulse.stopAnimation();
            Animated.timing(boltPulse, {
                toValue: 1,
                duration: 600, // Sync with color transition for overall smoothness
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true
            }).start();
        }
    }, [isActive]);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {/* Layer 1: The Base Grey Static Bolt */}
            <Animated.View style={{ 
                position: 'absolute',
                opacity: colorTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
            }}>
                <GradientBolt size={size} isGrey={true} />
            </Animated.View>

            {/* Layer 2: The Glowing Green Pulsing Bolt */}
            {/* We multiply the cross-fade opacity with the pulse opacity */}
            <Animated.View style={{ 
                position: 'absolute',
                opacity: Animated.multiply(colorTransition, boltPulse)
            }}>
                <GradientBolt size={size} isGrey={false} />
            </Animated.View>
        </View>
    );
};

const BlobLayer = ({ path, color, direction = 1, scaleRange = [1, 1.2], opacity = 0.6, duration = 8000, delay = 0, pulseDelayHigh = 0, pulseDelayLow = 0, style, animatedOpacity, animatedTranslateX, animatedTranslateY, animatedTranslateXLoop }) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.delay(pulseDelayHigh),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.delay(pulseDelayLow)
                ])
            ).start()
        };

        const timer = setTimeout(startAnimation, delay);
        return () => clearTimeout(timer);
    }, [duration, delay, pulseDelayHigh, pulseDelayLow])

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['5deg', `${10 * direction}deg`]
    })

    const scale = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [scaleRange[0], scaleRange[1]]
    })

    // Combine entrance X and loop X
    const finalTranslateX = Animated.add(
        animatedTranslateX || new Animated.Value(0),
        animatedTranslateXLoop || new Animated.Value(0)
    );

    return (
        <Animated.View style={[
            StyleSheet.absoluteFill,
            style,
            {
                justifyContent: 'center',
                alignItems: 'center',
                transform: [
                    { translateX: finalTranslateX },
                    { translateY: animatedTranslateY || 0 }, // Diagonal motion
                    { rotate },
                    { scale }
                ],
                opacity: animatedOpacity
            }
        ]}>
            <Svg height="150%" width="150%" viewBox="0 0 200 200">
                <G transform="translate(100, 100)">
                    <Path d={path} fill={color} />
                </G>
            </Svg>
        </Animated.View>
    )
}

export default function ConfigScreen({ route }) {
    const navigation = useNavigation();
    const { showAlert } = useAlert();
    const { stationId, stationName, chargerId, boxId, chargerType, maxPower, connectorType, status, latitude, longitude, rate } = route.params || {};

    // Logic for Status Display & Button State
    const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
    const isChargerAvailable = formattedStatus === 'Available';

    // Unified State Group
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customPower, setCustomPower] = useState(1);
    const [walletBalance, setWalletBalance] = useState('0.00');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [processingTransaction, setProcessingTransaction] = useState(false);

    // Slot Booking State
    const initialTab = route.params?.initialTab || 'Charge';
    const [configTab, setConfigTab] = useState(initialTab); // 'Charge' | 'Book'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlotId, setSelectedSlotId] = useState(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [showBookingSuccess, setShowBookingSuccess] = useState(false);
    const [showPastSlots, setShowPastSlots] = useState(false);
    const [bookedSlotData, setBookedSlotData] = useState(null);
    const [isStatusReady, setIsStatusReady] = useState(false);
    const tabAnim = useRef(new Animated.Value(initialTab === 'Charge' ? 0 : 1)).current;
    const pagerRef = useRef(null);
    const today = new Date();

    // Refs
    const blob1Opacity = useRef(new Animated.Value(0)).current;
    const blob2Opacity = useRef(new Animated.Value(0)).current;
    const blob3Opacity = useRef(new Animated.Value(0)).current;
    const blob1X = useRef(new Animated.Value(-width * 1.5)).current;
    const blob2X = useRef(new Animated.Value(-width * 1.5)).current;
    const blob3X = useRef(new Animated.Value(-width * 1.5)).current;
    const blob1Y = useRef(new Animated.Value(height * -1.25)).current;
    const blob2Y = useRef(new Animated.Value(height * -1.25)).current;
    const blob3Y = useRef(new Animated.Value(height * -1.25)).current;
    const blob1XLoop = useRef(new Animated.Value(0)).current;
    const blob2XLoop = useRef(new Animated.Value(0)).current;
    const blob3XLoop = useRef(new Animated.Value(0)).current;
    const animationStarted = useRef(false);

    useEffect(() => {
        // Combined effects: Status delay and Tab bounce
        const timer = setTimeout(() => setIsStatusReady(true), 800);

        Animated.spring(tabAnim, {
            toValue: configTab === 'Charge' ? 0 : 1,
            useNativeDriver: true,
            bounciness: 7, // Reduced from 12 for more realism
            speed: 12,
        }).start();

        return () => clearTimeout(timer);
    }, [configTab]);

    const tabPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
            onPanResponderRelease: (_, g) => {
                if (g.dx > 40 && configTab === 'Book') handleTabPress('Charge');
                if (g.dx < -40 && configTab === 'Charge') handleTabPress('Book');
            }
        })
    ).current;

    const handleTabPress = (tab) => {
        setConfigTab(tab);
        pagerRef.current?.scrollTo({ x: tab === 'Charge' ? 0 : width, animated: true });
    };

    const handleScroll = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / width);
        const newTab = page === 0 ? 'Charge' : 'Book';
        if (newTab !== configTab) {
            setConfigTab(newTab);
        }
    };

    useEffect(() => {
        if (isChargerAvailable && !animationStarted.current) {
            animationStarted.current = true;

            const config = {
                duration: 1500, // Slower for smoothness
                easing: Easing.out(Easing.exp), // Very smooth ease out
                useNativeDriver: true
            };

            const startLoopAnimation = () => {
                // Slower, gentler loop
                const loopDuration = 3000;
                const loopConfig = {
                    duration: loopDuration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                };

                const createLoop = (animValue, offset) => {
                    return Animated.loop(
                        Animated.sequence([
                            // Move Right
                            Animated.timing(animValue, { toValue: offset, ...loopConfig }),
                            // Move Back to Center
                            Animated.timing(animValue, { toValue: 0, ...loopConfig }),
                            // Move Left
                            Animated.timing(animValue, { toValue: -offset, ...loopConfig }),
                            // Move Back to Center
                            Animated.timing(animValue, { toValue: 0, ...loopConfig })
                        ])
                    );
                };

                Animated.parallel([
                    createLoop(blob1XLoop, 20),
                    createLoop(blob2XLoop, -25),
                    createLoop(blob3XLoop, 15)
                ]).start();
            };

            Animated.stagger(300, [
                Animated.parallel([
                    Animated.timing(blob1Opacity, { toValue: 0.9, ...config }),
                    Animated.timing(blob1X, { toValue: 0, ...config }),
                    Animated.timing(blob1Y, { toValue: 0, ...config })
                ]),
                Animated.parallel([
                    Animated.timing(blob2Opacity, { toValue: 0.8, ...config }),
                    Animated.timing(blob2X, { toValue: 0, ...config }),
                    Animated.timing(blob2Y, { toValue: 0, ...config })
                ]),
                Animated.parallel([
                    Animated.timing(blob3Opacity, { toValue: 0.6, ...config }),
                    Animated.timing(blob3X, { toValue: 0, ...config }),
                    Animated.timing(blob3Y, { toValue: 0, ...config })
                ]),
            ]).start(({ finished }) => {
                if (finished) {
                    startLoopAnimation();
                }
            });
        }
    }, [isChargerAvailable]);

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        try {
            const token = await authService.getToken();
            const user = await authService.getUser();

            if (!token || !user) {
                console.log("No token or user found, redirecting to Login");
                showAlert("Authentication Required", "Please login to view plans.", [
                    { text: "OK", onPress: () => navigation.replace('Login') }
                ]);
                return;
            }
            fetchPlans();
            fetchWalletBalance(user.email);
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    const fetchWalletBalance = async (email) => {
        try {
            const userData = await userApi.getUserDetails(email);
            if (userData && userData.walletBalance !== undefined) {
                setWalletBalance(userData.walletBalance);
            }
        } catch (error) {
            console.error("Failed to fetch wallet balance", error);
        }
    }

    // Effect for Slots
    useEffect(() => {
        if (configTab === 'Book') {
            fetchAvailableSlots();
        }
    }, [configTab, chargerId, selectedDate]);

    const fetchAvailableSlots = async () => {
        if (!chargerId) return;
        try {
            setSlotsLoading(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            // Strategy: 
            // 1. Try to get specifically available slots for the selected date
            let response = await slotsApi.getAvailableSlots(chargerId, dateStr);
            console.log("DEBUG: slotsApi.getAvailableSlots response count:", (Array.isArray(response) ? response : (response?.data || response?.slots || [])).length);
            let slots = Array.isArray(response) ? response : (response?.data || response?.slots || []);
 
            // 2. Fallback: If we have no slots, OR if we are looking at a future date (since getAvailableSlots might be "today only")
            // fetch all slots for this charger and we will filter them in the UI.
            const isToday = isSameDay(selectedDate, new Date());
            if (slots.length === 0 || !isToday) {
                console.log("DEBUG: Fetching all charger slots (future date or empty response)");
                const allSlotsResponse = await slotsApi.getSlotsByCharger(chargerId);
                const allSlots = Array.isArray(allSlotsResponse) ? allSlotsResponse : (allSlotsResponse?.data || allSlotsResponse?.slots || []);
                
                // Merge or Replace? Let's use 'allSlots' as it's more comprehensive for future dates
                if (!isToday || slots.length === 0) {
                    slots = allSlots;
                } else {
                    // If today, merge unique ones? Overly complex, let's just use allSlots as the source of truth if we fetched it.
                    slots = allSlots;
                }
            }

            // Normalize slots (ensure startTime/endTime are populated and favor 'Only' fields)
            const normalizedSlots = slots.map(s => {
                // Prioritize 'Only' fields to strip date info if present in startTime
                let start = s.startTimeOnly || s.startTime || s.start_time;
                let end = s.endTimeOnly || s.endTime || s.end_time;

                return { ...s, startTime: start, endTime: end };
            });

            // Sort slots sequentially
            normalizedSlots.sort((a, b) => {
                const getTimeValue = (s) => {
                    const raw = s.startTimeOnly || s.startTime || s.start_time;
                    if (!raw) return 0;
                    if (typeof raw === 'string' && raw.includes(':') && !raw.includes('-')) {
                        const [h, m] = raw.split(':').map(Number);
                        return h * 60 + m;
                    }
                    if (Array.isArray(raw)) {
                        return (raw[3] || 0) * 60 + (raw[4] || 0);
                    }
                    const sStr = String(raw);
                    const normalized = sStr.replace('T', ' ').replace('Z', '').trim();
                    if (normalized.includes(' ')) {
                        const [_, timePart] = normalized.split(' ');
                        const [h, m] = timePart.split(':').map(Number);
                        return h * 60 + m;
                    }
                    const d = new Date(raw);
                    return isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes();
                };
                return getTimeValue(a) - getTimeValue(b);
            });

            setAvailableSlots(normalizedSlots);
            console.log("DEBUG: Fetched slots (Normalized count):", normalizedSlots.length);
            console.log("DEBUG: Normalized slots sample:", JSON.stringify(normalizedSlots.slice(0, 3), null, 2));
        } catch (error) {
            console.error("DEBUG: Failed to fetch slots", error);
            setAvailableSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleBookSlot = async () => {
        if (!selectedSlotId) {
            showAlert("Select Slot", "Please select a time slot to book.");
            return;
        }

        try {
            setProcessingTransaction(true);
            const result = await slotBookingApi.bookSlot(selectedSlotId);

            // Normalize result for consistent logging and UI
            const normalizedResult = { ...result };
            if (!normalizedResult.startTime && normalizedResult.startTimeOnly) {
                normalizedResult.startTime = normalizedResult.startTimeOnly;
            }
            if (!normalizedResult.endTime && normalizedResult.endTimeOnly) {
                normalizedResult.endTime = normalizedResult.endTimeOnly;
            }

            console.log("Slot Booking Result (Normalized):", JSON.stringify(normalizedResult, null, 2));
            setBookedSlotData(normalizedResult);
            setShowBookingSuccess(true);
        } catch (error) {
            console.error("Booking failed", error);

            // Map technical errors to friendly, actionable messages
            let displayMessage = "We couldn't complete your booking. This slot might no longer be available.";

            if (error.userMessage) {
                const msg = error.userMessage.toLowerCase();
                if (msg.includes("past")) {
                    displayMessage = "This time slot has already passed. Please select a different time slot.";
                } else if (msg.includes("already booked")) {
                    displayMessage = "This slot has just been reserved by someone else. Please pick a different time slot.";
                } else if (msg.includes("active booking")) {
                    displayMessage = "You already have an active booking for this charger. Please complete or cancel it before booking again.";
                }
            }

            showAlert("Booking Unavailable", displayMessage + "\n\nTip: You can refresh the list to see current availability.");
        } finally {
            setProcessingTransaction(false);
        }
    };

    const handleBookingSuccessClose = () => {
        setShowBookingSuccess(false);
        navigation.navigate('MyBookings');
    };

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const data = await plansApi.getAllPlans();


            // Filter plans based on chargerType match (AC vs DC)
            // NEW: Robust Filter Logic
            // 1. Validate 'chargerType' existence
            if (!chargerType) {
                console.error("ConfigScreen: Missing 'chargerType' in route params");
                showAlert("Configuration Error", "Charger details are incomplete. Please try again.", [
                    { text: "Go Back", onPress: () => navigation.goBack() }
                ]);
                return; // Stop execution
            }

            // 2. Strict Filtering
            const currentChargerType = chargerType.toString().toUpperCase();
            const isAC = currentChargerType.includes('AC');

            let filteredPlans = data || [];
            if (filteredPlans.length > 0) {
                // Filter out inactive plans (0 or false means inactive; 1, true, null, undefined means active)
                filteredPlans = filteredPlans.filter(p => {
                    const activeVal = p.is_active !== undefined ? p.is_active : p.isActive;
                    return activeVal !== 0 && activeVal !== false;
                });

                filteredPlans = filteredPlans.filter(p => {
                    const planType = (p.chargerType || '').toUpperCase();
                    // Strict Rule: 
                    // AC Charger -> ONLY AC Plans
                    // Non-AC (DC/Fast) Charger -> ONLY Non-AC Plans
                    return isAC ? planType.includes('AC') : !planType.includes('AC');
                });
            }


            setPlans(filteredPlans);
            // Default Select first plan
            if (filteredPlans && filteredPlans.length > 0) {
                setSelectedPlanId(filteredPlans[0].id);
                setIsCustomMode(false);
            } else {
                setIsCustomMode(true); // Default to custom if no plans
            }
        } catch (error) {
            console.error("Failed to fetch plans", error);
            if (error.response && error.response.status === 401) {
                showAlert("Session Expired", "Please login again.", [
                    {
                        text: "OK", onPress: () => {
                            authService.logout();
                            navigation.replace('Login');
                        }
                    }
                ]);
            } else {
                showAlert("Error", error.userMessage || "Could not fetch plans.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (id) => {
        setSelectedPlanId(id);
        setIsCustomMode(false);
    };

    const handleSelectCustom = () => {
        setIsCustomMode(true);
        setSelectedPlanId(null);
    };

    const handlePay = async () => {
        if (processingTransaction) return;

        if (!selectedPlanId && !isCustomMode) {
            showAlert("Select Option", "Please select a charging plan or Custom Mode to continue.");
            return;
        }

        setProcessingTransaction(true);

        try {
            // Check for existing active session to prevent parallel sessions
            const user = await authService.getUser();
            const userId = user?.id || user?.userId || user?.email; // Fallback
            if (userId) {
                const activeSession = await sessionApi.getActiveSession(userId);
                if (activeSession && activeSession.status === 'ACTIVE') {
                    showAlert("Action Denied", "You already have an active charging session.", [
                        { text: "View Session", onPress: () => navigation.navigate('Session', activeSession) },
                        { text: "OK", style: "cancel" }
                    ]);
                    setProcessingTransaction(false);
                    return;
                }
            }
        } catch (e) {
            console.warn("Session Check Failed", e);
        }

        setProcessingTransaction(false);
        setShowConfirmModal(true);
    };

    const confirmSession = () => {
        setShowConfirmModal(false);

        // Insufficient Balance Check
        const planDetails = plans.find(p => p.id === selectedPlanId);
        const cost = isCustomMode
            ? (Number(customPower) * (parseFloat(rate) || 0))
            : Number(planDetails?.walletDeduction || planDetails?.price || 0);

        if (Number(walletBalance) < cost) {
            showAlert("Insufficient Balance", "Your wallet balance is insufficient for this plan. Please top up your wallet.");
            return;
        }

        // Navigate to Session Screen

        // Safety Clamp for Custom Power
        const safeMaxPower = Number(maxPower) || 120;
        let finalCustomPower = null;
        if (isCustomMode) {
            // Ensure power is at least 1kW and at most safeMaxPower
            finalCustomPower = Math.min(Math.max(1, Number(customPower)), safeMaxPower);
        }

        console.log("Starting Session. Mode:", isCustomMode ? "Custom" : "Plan", "ID:", selectedPlanId || "N/A", "Power:", finalCustomPower);

        navigation.replace('Session', {
            planId: isCustomMode ? null : selectedPlanId, // Send null if custom
            chargerId: chargerId,
            boxId: boxId,
            stationName: stationName,
            stationId: stationId,
            selectedKwh: finalCustomPower, // Send validated custom power
            rate: planDetails?.rate || rate || 0, // Use station rate as fallback for custom sessions
            connectorType: connectorType || 'CCS2',
            chargerType: chargerType || 'Fast',
            latitude: latitude,
            longitude: longitude
        });
    };


    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    return (
        <View style={styles.container}>
            {/* Background Blobs & Blur - Confined to Top Area - Only when Available */}
            {false && isChargerAvailable && (
                <View style={[StyleSheet.absoluteFill, { height: height * 0.75, overflow: 'visible' }]}>
                    {/* Dark Green Blob - Top Right */}
                    <BlobLayer
                        path={PATH_GREEN}
                        color="#082f20"
                        duration={8000}
                        direction={-1}
                        scaleRange={[1.0, 1.1]}
                        style={{ top: -120, right: -80 }}
                        animatedOpacity={blob1Opacity}
                        animatedTranslateX={blob1X}
                        animatedTranslateY={blob1Y}
                        animatedTranslateXLoop={blob1XLoop}
                    />

                    {/* Main Brand Green Blob - Top Right */}
                    <BlobLayer
                        path={PATH_GREEN}
                        color="#008f45"
                        duration={6000}
                        direction={1}
                        scaleRange={[0.9, 1.05]}
                        style={{ top: -150, right: -40 }}
                        animatedOpacity={blob2Opacity}
                        animatedTranslateX={blob2X}
                        animatedTranslateY={blob2Y}
                        animatedTranslateXLoop={blob2XLoop}
                    />

                    {/* Light Glow Blob - Top Right - Only show on iOS for performance */}
                    {Platform.OS === 'ios' && (
                        <BlobLayer
                            path={PATH_GREEN}
                            color="#80e8b1"
                            duration={9000}
                            direction={1}
                            scaleRange={[1.1, 1.3]}
                            style={{ top: -160, right: -60 }}
                            animatedOpacity={blob3Opacity}
                            animatedTranslateX={blob3X}
                            animatedTranslateY={blob3Y}
                            animatedTranslateXLoop={blob3XLoop}
                        />
                    )}

                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={Platform.OS === 'android' ? 10 : 20}
                        reducedTransparencyFallbackColor="rgba(18,18,18,0.9)"
                    />
                </View>
            )}

            {/* ... (TopBar remains same) ... */}
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Top Bar with Blur effect simulation */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
                <View style={styles.topBarContent}>
                    <View style={styles.leftNav}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <ArrowBackIcon width={24} height={24} fill="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.pageTitle}>Charging Config</Text>
                    </View>

                    <View style={styles.rightNav}>

                        <TouchableOpacity style={styles.walletPill} onPress={() => navigation.navigate('Wallet')}>
                            <WalletIcon width={20} height={20} fill="#fff" />
                            <Text style={styles.walletText}>₹ {Number(walletBalance).toLocaleString('en-IN')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Charger Card */}
                <View style={styles.chargerCard}>
                    <View style={styles.chargerInfo}>
                        <Text style={styles.chargerName}>{stationName || 'Bentork Charger'}</Text>
                        <Text style={styles.chargerMeta}>
                            {connectorType || 'CCS 2'} • {maxPower || '120'}kW {chargerType || 'Fast'} Charging {'\n'}
                            <Text style={{ color: '#aaa', fontSize: 13 }}>ID: {chargerId || 'Unknown'}</Text>
                        </Text>

                        {/* Status Pill */}
                        <View style={[
                            styles.statusPill,
                            {
                                backgroundColor: isChargerAvailable ? 'rgba(76, 175, 80, 0.2)' : (formattedStatus === 'Busy' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(244, 67, 54, 0.2)'),
                                borderColor: isChargerAvailable ? Colors.primaryContainer : (formattedStatus === 'Busy' ? '#FF9800' : '#F44336'),
                                borderWidth: 0
                            }
                        ]}>
                            {/* <View style={[styles.statusDot, { backgroundColor: isChargerAvailable ? Colors.primaryContainer : (formattedStatus === 'Busy' ? '#FF9800' : '#F44336') }]} /> */}
                            <Text style={[styles.statusText, { color: isChargerAvailable ? Colors.primaryContainer : (formattedStatus === 'Busy' ? '#FF9800' : '#F44336') }]}>
                                {formattedStatus}
                            </Text>
                        </View>
                    </View>
                    {/* Placeholder for Charger Image - Now using conditional StatusBolt */}
                    <View style={styles.chargerImgBox}>
                        <StatusBolt size={32} isAvailable={isChargerAvailable} isReady={isStatusReady} />
                    </View>
                </View>

                {/* Tab Switcher with Bouncing Indicator and Swipe Support */}
                <View style={styles.tabContainer} {...tabPanResponder.panHandlers}>
                    <Animated.View style={[
                        styles.tabIndicator,
                        {
                            transform: [{
                                translateX: tabAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, (width - 32 - 8) / 2]
                                })
                            }]
                        }
                    ]} />
                    <TouchableOpacity
                        style={styles.tabBtn}
                        onPress={() => handleTabPress('Charge')}
                    >
                        <BoltIcon width={20} height={20} fill={configTab === 'Charge' ? '#121212' : '#aaa'} />
                        <Text style={[styles.tabText, configTab === 'Charge' && styles.tabTextActive]}>Charge Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tabBtn}
                        onPress={() => handleTabPress('Book')}
                    >
                        <Calendar size={20} color={configTab === 'Book' ? '#121212' : '#aaa'} />
                        <Text style={[styles.tabText, configTab === 'Book' && styles.tabTextActive]}>Book Slot</Text>
                    </TouchableOpacity>
                </View>

                {/* Swipeable Tab Content Area */}
                <ScrollView
                    ref={pagerRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ width: width * 2 }}
                    nestedScrollEnabled={true}
                    contentOffset={{ x: initialTab === 'Charge' ? 0 : width, y: 0 }}
                >
                    {/* Page 1: Charge Now */}
                    <View style={{ width: width }}>
                        {/* Custom Power Control */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Charging Mode</Text>
                        </View>

                        {/* Custom Session Option */}
                        <TouchableOpacity
                            style={[
                                styles.planItem,
                                isCustomMode && styles.planActive,
                                { marginBottom: 15, flexDirection: 'column', alignItems: 'flex-start', marginHorizontal: 16 }
                            ]}
                            onPress={handleSelectCustom}
                            activeOpacity={0.9}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                                <View>
                                    <Text style={styles.planName}>Custom Session</Text>
                                    <Text style={styles.planMeta}>Set your own power limit</Text>
                                </View>
                                <View style={styles.radioCircle}>
                                    {isCustomMode && <View style={styles.radioInner} />}
                                </View>
                            </View>

                            {/* Show Controls Only When Active */}
                            {isCustomMode && (
                                <View style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={{ color: '#ccc', fontSize: 14 }}>Power Limit (kW)</Text>
                                        <Text style={{ color: Colors.primaryContainer, fontSize: 14 }}>Max: {maxPower || 120} kW</Text>
                                    </View>

                                    {/* Dynamic Step Size Logic */}
                                    {(() => {
                                        const isAC = (chargerType || '').toString().toUpperCase().includes('AC');
                                        const stepSize = isAC ? 1 : 5; // 1kW for AC, 5kW for DC

                                        return (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 5 }}>
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        setCustomPower(p => Math.max(1, p - stepSize));
                                                    }}
                                                    style={styles.powerBtn}
                                                >
                                                    <RemoveIcon width={20} height={20} fill="#fff" />
                                                </TouchableOpacity>
                                                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', minWidth: 80, textAlign: 'center' }}>
                                                    {customPower} <Text style={{ fontSize: 14, color: '#888' }}>kW</Text>
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        setCustomPower(p => Math.min(Number(maxPower) || 120, p + stepSize));
                                                    }}
                                                    style={styles.powerBtn}
                                                >
                                                    <AddIcon width={20} height={20} fill="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })()}
                                    <Text style={{ color: '#888', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                                        Adjustable based on car capability
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Plans Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Select Plan</Text>
                            <View style={[styles.lastUsedPill, { display: 'none' }]}>
                                <Text style={styles.lastUsedText}>Last Used</Text>
                            </View>
                        </View>

                        {
                            loading ? (
                                <ActivityIndicator size="large" color={Colors.primaryContainer} style={{ marginTop: 50 }} />
                            ) : (
                                <View style={styles.plansContainer}>
                                    {Array.isArray(plans) && plans.length > 0 ? (
                                        plans.map((plan) => (
                                            <TouchableOpacity
                                                key={plan.id}
                                                style={[
                                                    styles.planItem,
                                                    (selectedPlanId === plan.id && !isCustomMode) && styles.planActive
                                                ]}
                                                onPress={() => handleSelectPlan(plan.id)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    <View style={[styles.radioCircle, { marginRight: 15 }]}>
                                                        {(selectedPlanId === plan.id && !isCustomMode) && <View style={styles.radioInner} />}
                                                    </View>
                                                    <View style={styles.planInfo}>
                                                        <Text style={styles.planName}>
                                                            {plan.planName.split(' ').map(word =>
                                                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                            ).join(' ')}
                                                        </Text>
                                                        <Text style={styles.planMeta}>{plan.description || `${plan.durationMin || 'Auto'} mins`}</Text>
                                                        <Text style={styles.planRate}>@ ₹{plan.rate || 0}/kWh</Text>
                                                    </View>
                                                </View>
                                                <View>
                                                    <Text style={styles.planPrice}>₹ {plan.walletDeduction || plan.price || '0'}</Text>
                                                    {plan.walletDeduction !== plan.price && plan.price > plan.walletDeduction && (
                                                        <Text style={{ color: Colors.statusGreen, fontSize: 12, textAlign: 'right' }}>Save ₹{plan.price - plan.walletDeduction}</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))) : (
                                        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No plans available.</Text>
                                    )}
                                </View>
                            )
                        }
                    </View>

                    {/* Page 2: Book Slot */}
                    <View style={{ width: width }}>
                        <View style={styles.slotContainer}>
                        {/* Date Selector removed as per request */}


                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Available Slots</Text>
                            <TouchableOpacity onPress={fetchAvailableSlots} style={{ padding: 4 }}>
                                <Text style={{ color: Colors.primaryContainer, fontSize: 12 }}>Refresh</Text>
                            </TouchableOpacity>
                        </View>

                        {slotsLoading ? (
                            <ActivityIndicator size="large" color={Colors.primaryContainer} style={{ marginTop: 50 }} />
                        ) : (
                            <View style={styles.slotsGrid}>
                                {(() => {
                                    // ... filtering logic ...
                                    const slotsForSelectedDate = availableSlots.filter(s => !!(s.startTimeOnly || s.startTime || s.start_time));
                                    // console.log("DEBUG: slotsForSelectedDate count:", slotsForSelectedDate.length);

                                    const filteredSlots = slotsForSelectedDate.filter(s => {
                                        const rawStart = s.startTimeOnly || s.startTime || s.start_time;
                                        let slotDate;

                                        if (typeof rawStart === 'string' && rawStart.includes(':') && !rawStart.includes('-')) {
                                            const [h, min] = rawStart.split(':').map(Number);
                                            slotDate = new Date(selectedDate);
                                            slotDate.setHours(h, min, 0, 0);
                                        } else if (Array.isArray(rawStart)) {
                                            slotDate = new Date(rawStart[0], rawStart[1] - 1, rawStart[2], rawStart[3], rawStart[4]);
                                        } else {
                                            const sStr = String(rawStart);
                                            const normalized = sStr.replace('T', ' ').replace('Z', '').trim();
                                            if (normalized.includes(' ')) {
                                                const [datePart, timePart] = normalized.split(' ');
                                                const [y, m, d] = datePart.split('-').map(Number);
                                                const [h, min] = timePart.split(':').map(Number);
                                                slotDate = new Date(y, m - 1, d, h, min);
                                            } else {
                                                slotDate = new Date(rawStart);
                                            }
                                        }

                                        // 1. Must be the selected day
                                        if (!isSameDay(slotDate, selectedDate)) return false;

                                        // 2. Must not be booked
                                        const isBooked = s.isBooked === true || s.booked === true || s.booked === 1 || s.isBooked === 1;
                                        if (isBooked) return false;

                                        // 3. Must not be in the past (if today)
                                        if (isSameDay(selectedDate, new Date()) && !showPastSlots && !isNaN(slotDate.getTime())) {
                                            const now = new Date();
                                            if (slotDate.getTime() < (now.getTime() - 5 * 60000)) {
                                                return false;
                                            }
                                        }

                                        return true;
                                    });
                                    // console.log("DEBUG: filteredSlots count (to display):", filteredSlots.length);

                                    if (filteredSlots.length === 0) {
                                        const hasStaleSlots = availableSlots.length > 0;
                                        let message = "No slots available for today.";

                                        if (hasStaleSlots) {
                                            const firstSlot = availableSlots[0];
                                            const raw = firstSlot.startTime || firstSlot.start_time;
                                            let slotDate;
                                            if (Array.isArray(raw)) {
                                                slotDate = new Date(raw[0], (raw[1] || 1) - 1, raw[2] || 1, raw[3] || 0, raw[4] || 0);
                                            } else {
                                                slotDate = new Date(raw);
                                            }
                                            if (!isNaN(slotDate.getTime()) && !isSameDay(slotDate, today)) {
                                                console.log("DEBUG: No slots found for today, found stale slots from previous date", slotDate);
                                                message = `No slots available for today.`;
                                            }
                                        }

                                        return (
                                            <View style={{ alignItems: 'center', width: '100%', marginTop: 20 }}>
                                                <Text style={styles.noSlotsText}>{message}</Text>
                                                {/* <TouchableOpacity onPress={fetchAvailableSlots} style={{ marginTop: 20, padding: 10 }}>
                                                    <Text style={{ color: Colors.primaryContainer, fontSize: 13 }}>Refresh List</Text>
                                                </TouchableOpacity> */}
                                            </View>
                                        );
                                    }

                                    // Check if we are showing slots from a different date
                                    const firstSlot = filteredSlots[0];
                                    const raw = firstSlot.startTimeOnly || firstSlot.startTime || firstSlot.start_time;
                                    let firstSlotDate;
                                    if (firstSlot.startTimeOnly) {
                                        firstSlotDate = new Date();
                                    } else if (Array.isArray(raw)) {
                                        firstSlotDate = new Date(raw[0], (raw[1] || 1) - 1, raw[2] || 1, raw[3] || 0, raw[4] || 0);
                                    } else {
                                        firstSlotDate = new Date(raw);
                                    }
                                    const isStale = !firstSlot.startTimeOnly && !isNaN(firstSlotDate.getTime()) && !isSameDay(firstSlotDate, today);

                                    return (
                                        <View style={{ width: '100%' }}>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                                {filteredSlots.map((slot, index) => {
                                                    const rawStart = slot.startTimeOnly || slot.startTime || slot.start_time;
                                                    let slotDate;
                                                    if (typeof rawStart === 'string' && rawStart.includes(':') && !rawStart.includes('-')) {
                                                        const [h, min] = rawStart.split(':').map(Number);
                                                        slotDate = new Date();
                                                        slotDate.setHours(h, min, 0, 0);
                                                    } else if (Array.isArray(rawStart)) {
                                                        slotDate = new Date(rawStart[0], (rawStart[1] || 1) - 1, rawStart[2] || 1, rawStart[3] || 0, rawStart[4] || 0);
                                                    } else {
                                                        slotDate = new Date(rawStart);
                                                    }

                                                    if (isNaN(slotDate.getTime())) return null; // skip invalid
                                                    const timeLabel = format(slotDate, 'hh:mm a');
                                                    const isSelected = selectedSlotId === (slot.id || slot._id);
                                                    const isBooked = slot.isBooked === true || slot.booked === true || slot.booked === 1 || slot.isBooked === 1;

                                                    return (
                                                        <TouchableOpacity
                                                            key={slot.id || index}
                                                            style={[
                                                                styles.slotChip,
                                                                isSelected && styles.slotChipActive,
                                                                isBooked && { opacity: 0.5, backgroundColor: '#222' }
                                                            ]}
                                                            onPress={() => !isBooked && setSelectedSlotId(slot.id || slot._id)}
                                                            disabled={isBooked}
                                                        >
                                                            <Text style={[
                                                                styles.slotTime,
                                                                isSelected && styles.slotTimeActive,
                                                                isBooked && { color: '#666' }
                                                            ]}>
                                                                {timeLabel}
                                                            </Text>
                                                            {isBooked && <Text style={{ fontSize: 8, color: '#444' }}>Out</Text>}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>


                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            </ScrollView >

            {/* Pay Button */}
            {!loading && (
                <View style={styles.bottomContainer}>
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                        {/* Book in Advance - disabled for now */}
                        {configTab === 'Book' && (
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#333',
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                    elevation: 0,
                                }}
                                onPress={() => {}}
                                disabled={true}
                                activeOpacity={1}
                            >
                                {/* <Calendar size={18} color="#888" /> */}
                                <Text style={{ color: '#888', fontSize: 14, fontWeight: 'bold' }}>Book in Advance</Text>
                            </TouchableOpacity>
                        )}

                        {/* Main action button */}
                        <TouchableOpacity
                            style={[
                                styles.payBtn,
                                { flex: 1 },
                                !((configTab === 'Charge' && !isChargerAvailable) || (configTab === 'Book' && !selectedSlotId) || processingTransaction)
                                ? { backgroundColor: '#fff' }
                                : { backgroundColor: '#333' }
                            ]}
                            onPress={configTab === 'Charge' ? handlePay : handleBookSlot}
                            disabled={
                                (configTab === 'Charge' && !isChargerAvailable) ||
                                (configTab === 'Book' && !selectedSlotId) ||
                                processingTransaction
                            }
                        >
                            {processingTransaction ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[
                                    styles.payBtnText,
                                    ((configTab === 'Charge' && !isChargerAvailable) || (configTab === 'Book' && !selectedSlotId))
                                        ? { color: '#888' }
                                        : { color: '#000' }
                                ]}>
                                    {configTab === 'Charge'
                                        ? (isChargerAvailable ? 'Start Charging' : `Charger ${formattedStatus}`)
                                        : (selectedSlotId ? 'Confirm Slot' : 'Select a Slot')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Confirmation Modal */}
            <Modal
                transparent={true}
                visible={showConfirmModal}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirm Session</Text>
                            <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                                <X color="#ccc" size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDesc}>
                            You are about to start a charging session.
                        </Text>

                        <View style={styles.modalStats}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Station</Text>
                                <Text style={styles.statValue}>{stationName || "Unknown"}</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Mode</Text>
                                <Text style={[styles.statValue, { color: Colors.primaryContainer }]}>
                                    {isCustomMode ? "Custom Session" : (selectedPlan?.planName || "Plan Session")}
                                </Text>
                            </View>
                            {isCustomMode && (
                                <View style={styles.statRow}>
                                    <Text style={styles.statLabel}>Power Limit</Text>
                                    <Text style={styles.statValue}>{customPower} kW</Text>
                                </View>
                            )}
                            <View style={[styles.statRow, { marginTop: 8 }]}>
                                <Text style={styles.statLabel}>{isCustomMode ? 'Est. Cost' : 'Total Pay'}</Text>
                                <Text style={[
                                    styles.statValue,
                                    { color: Colors.primaryContainer, fontSize: 16 },
                                    Number(walletBalance) < (isCustomMode
                                        ? (Number(customPower) * (parseFloat(rate) || 0))
                                        : Number(selectedPlan?.walletDeduction || selectedPlan?.price || 0)) && { color: '#F44336' }
                                ]}>
                                    {isCustomMode
                                        ? `₹ ${(customPower * (parseFloat(rate) || 0)).toFixed(2)}/kWh`
                                        : `₹ ${selectedPlan?.walletDeduction || selectedPlan?.price || '0'}`}
                                </Text>
                            </View>
                            {isCustomMode && (
                                <Text style={{ color: '#888', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
                                    Rate: ₹{parseFloat(rate) || 0}/kWh × {customPower} kW
                                </Text>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.confirmBtn, { overflow: 'hidden' }]} onPress={confirmSession}>
                                {/* <LinearGradient
                                    colors={Colors.primaryGradient}
                                    locations={[0.1, 1]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                /> */}
                                <Text style={styles.confirmBtnText}>Start</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Booking Success Modal */}
            <Modal
                transparent={true}
                visible={showBookingSuccess}
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 230, 118, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                                <Check size={32} color={Colors.statusGreen} />
                            </View>
                            <Text style={styles.modalTitle}>Booking Confirmed!</Text>
                            <Text style={[styles.modalDesc, { textAlign: 'center' }]}>
                                Your slot has been successfully booked.
                            </Text>
                        </View>

                        <View style={styles.modalStats}>

                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Time</Text>
                                <Text style={styles.statValue}>
                                    {(() => {
                                        const slot = availableSlots.find(s => (s.id || s._id) === selectedSlotId);
                                        if (!slot) return 'N/A';

                                        const rawStart = slot.startTimeOnly || slot.startTime || slot.start_time;
                                        let slotDate;

                                        if (slot.startTimeOnly) {
                                            const [h, min] = String(slot.startTimeOnly).split(':').map(Number);
                                            slotDate = new Date(selectedDate);
                                            slotDate.setHours(h, min, 0, 0);
                                        } else if (Array.isArray(rawStart)) {
                                            slotDate = new Date(rawStart[0], rawStart[1] - 1, rawStart[2], rawStart[3], rawStart[4]);
                                        } else {
                                            slotDate = new Date(rawStart);
                                        }

                                        return isNaN(slotDate.getTime()) ? 'Invalid' : format(slotDate, 'hh:mm a');
                                    })()}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Station</Text>
                                <Text style={styles.statValue}>{stationName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmBtn, { flex: 0, width: '100%', marginTop: 20, justifyContent: 'center' }]}
                            onPress={handleBookingSuccessClose}
                        >
                            <Text style={[styles.confirmBtnText, { color: '#000000' }]}>View My Bookings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Matte black
    },
    topBar: {
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    topBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        height: 60,
    },
    leftNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    pageTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    rightNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconBtn: {
        padding: 5,
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    walletText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    tabBtnActive: {
        // Handled by tabIndicator background now
    },
    tabIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        width: (width - 32 - 8) / 2, // Container is width-32, internal padding is 4+4=8
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    tabText: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#121212',
        fontWeight: 'bold',
    },
    // Slot UI Styles
    slotContainer: {
        marginTop: 10,
    },
    dateSelector: {
        marginBottom: 20,
    },
    dateChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#1E1E1E',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    dateChipActive: {
        backgroundColor: Colors.primaryContainer,
        borderColor: Colors.primaryContainer,
    },
    dateDay: {
        color: '#aaa',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    dateNumber: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dateTextActive: {
        color: '#121212',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 10,
    },
    slotChip: {
        width: (width - 32 - 20) / 3, // 3 columns
        paddingVertical: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    slotChipActive: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
        borderColor: Colors.statusGreen,
    },
    slotTime: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '500',
    },
    slotTimeActive: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
    },
    noSlotsText: {
        color: '#666',
        textAlign: 'center',
        width: '100%',
        marginTop: 20,
        fontStyle: 'italic',
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Charger Card
    chargerCard: {
        backgroundColor: 'rgba(30, 30, 30, 0.35)', // Glassmorphism
        margin: 16,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    chargerInfo: {
        flex: 1,
    },
    chargerName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    chargerMeta: {
        color: '#aaa',
        fontSize: 13,
        lineHeight: 18,
    },
    chargerImgBox: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(57, 226, 155, 0.1)', // Keep rgba for opacity or use hex to rgba utility if available
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Plans
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
        marginTop: 10,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    lastUsedPill: {
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    lastUsedText: {
        color: Colors.primaryContainer,
        fontSize: 10,
        fontWeight: 'bold',
    },
    plansContainer: {
        paddingHorizontal: 16,
        gap: 12,
    },
    planItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    planActive: {
        backgroundColor: '#252525',
        borderColor: Colors.primaryContainer,
        borderWidth: 2,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    planMeta: {
        color: '#888',
        fontSize: 12,
    },
    planRate: {
        color: '#aaa',
        fontSize: 11,
        marginTop: 2,
    },
    planPrice: {
        color: Colors.primaryContainer, // Green price
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Bottom
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    payBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 5,
        overflow: 'hidden',
    },
    payBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    powerBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },

    // Modal Styles
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
        elevation: 10,
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
        padding: 16,
        marginBottom: 24,
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        color: '#ccc',
        fontSize: 14,
    },
    statValue: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    cancelBtnText: {
        color: '#888',
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: Colors.white,
        alignItems: 'center',
        overflow: 'hidden',
    },
    confirmBtnText: {
        color: '#000', // Assuming primary is bright/green
        fontWeight: 'bold',
    },
    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#555',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: Colors.primaryContainer,
    },
});
