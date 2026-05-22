// src/screens/SessionScreen.js
// ─────────────────────────────────────────────────────────────────────────────
//  REDESIGNED SESSION SCREEN PROTOTYPE
//  Mock data only — no real APIs. Three tabs:
//    1. Session   — circular progress + live stats
//    2. Explore   — Weather · Air Quality · Nearby Places  (auto-opened on entry)
//    3. Content   — Blog posts · YouTube recommendations
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Animated,
    Easing,
    Dimensions,
    Image,
    FlatList,
    PanResponder,
    Linking,
    PermissionsAndroid,
    ActivityIndicator,
    Modal,
    LayoutAnimation,
} from 'react-native';
import GetLocation from 'react-native-get-location';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    ChevronDown,
    Zap,
    MapPin,
    Wind,
    Thermometer,
    Droplets,
    Sun,
    Cloud,
    Eye,
    Star,
    Play,
    Coffee,
    Utensils,
    ShoppingBag,
    Navigation,
    Newspaper,
    Youtube,
    ArrowUpRight,
    Compass,
    TrendingUp,
    Sparkles,
    Mail,
    Calendar,
    Video,
    CheckSquare,
    Users,
    X,
    Calendar as CalendarIcon,
} from 'lucide-react-native';
import placesService from '../services/placesService';
import environmentalService from '../services/environmentalService';
import youtubeService from '../services/youtubeService';
import calendarService from '../services/calendarService';
import { authService } from '../services/auth';
import { sessionApi, notificationApi, reviewsApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Animated Circle ──────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_WEATHER = {
    temp: 28,
    feelsLike: 31,
    condition: 'Partly Cloudy',
    humidity: 62,
    wind: 14,
    visibility: 8.5,
    uv: 6,
    icon: '⛅',
};

const MOCK_AQI = {
    aqi: 87,
    category: 'Moderate',
    color: '#FFD740',
    dominantPollutant: 'PM2.5',
    pm25: 34.2,
    pm10: 51.8,
    co: 0.8,
    o3: 42,
};

const MOCK_PLACES = [
    { id: 1, name: 'Third Wave Coffee', type: 'Coffee', distance: '180m', rating: 4.7, open: true, icon: Coffee, color: '#A1887F', thumb: 'https://images.unsplash.com/photo-1612026386803-e86e62e9c5e4?w=200&q=60' },
    { id: 2, name: 'Punjab Dhaba & Grill', type: 'Restaurant', distance: '240m', rating: 4.4, open: true, icon: Utensils, color: '#EF5350', thumb: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=60' },
    { id: 3, name: 'Reliance Smart Bazaar', type: 'Shopping', distance: '350m', rating: 4.1, open: true, icon: ShoppingBag, color: '#AB47BC', thumb: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=200&q=60' },
    { id: 4, name: 'Chai Point', type: 'Coffee', distance: '90m', rating: 4.5, open: false, icon: Coffee, color: '#FF7043', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=60' },
    { id: 5, name: 'McDonalds', type: 'Restaurant', distance: '500m', rating: 4.0, open: true, icon: Utensils, color: '#FDD835', thumb: 'https://images.unsplash.com/photo-1552895638-f7fe08d2f7d5?w=200&q=60' },
];

const MOCK_BLOGS = [
    {
        id: 1,
        title: 'How to Maximise Range on Your Electric Vehicle',
        source: 'Bentork Blog',
        readTime: '4 min read',
        tag: 'Tips & Tricks',
        tagColor: '#39E29B',
        thumb: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=60',
    },
    {
        id: 2,
        title: 'Why Fast Charging Is Safer Than You Think in 2025',
        source: 'EV World',
        readTime: '6 min read',
        tag: 'Technology',
        tagColor: '#42A5F5',
        thumb: 'https://images.unsplash.com/photo-1620803506177-3e6c38217bb4?w=400&q=60',
    },
    {
        id: 3,
        title: 'India\'s EV Charging Infrastructure: A 2025 Report',
        source: 'AutoToday',
        readTime: '8 min read',
        tag: 'Industry',
        tagColor: '#FFA726',
        thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=60',
    },
];

const MOCK_VIDEOS = [
    {
        id: 1,
        title: 'Tata Nexon EV Long Range — Real World Range Test 2025',
        channel: 'EV India Reviews',
        views: '1.2M views',
        duration: '18:42',
        thumb: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=60',
    },
    {
        id: 2,
        title: 'Is DC Fast Charging Bad for Your EV Battery?',
        channel: 'Tech & Charge',
        views: '847K views',
        duration: '12:15',
        thumb: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=60',
    },
    {
        id: 3,
        title: 'Hidden EV Settings That Can Save You 20% Battery',
        channel: 'GreenDriveIN',
        views: '2.1M views',
        duration: '9:33',
        thumb: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400&q=60',
    },
];


// ─────────────────────────────────────────────────────────────────────────────
// --- Extracted Timer Component ---
const TimerDisplay = ({ startTime, style }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const now = Date.now();
        setElapsed(Math.floor((now - startTime) / 1000));
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    return <Text style={style}>{formatTime(elapsed)}</Text>;
};
// ----------------------------------

export default function SessionScreen({ navigation, route, isOverlay = false }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    // Tabs: 0 = Session, 1 = Explore, 2 = Content
    const TABS = ['Session', 'Explore', 'Content'];
    const [activeTab, setActiveTab] = useState(0);
    const [activeSuggestedTab, setActiveSuggestedTab] = useState(0);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);

    // Session State Machine
    const SESSION_STATES = {
        PREPARING: 'PREPARING',
        CHARGING: 'CHARGING',
        STOPPING: 'STOPPING',
        COMPLETED: 'COMPLETED',
    };
    const [sessionState, setSessionState] = useState(SESSION_STATES.CHARGING);

    const [dots, setDots] = useState('.');
    useEffect(() => {
        if (sessionState === SESSION_STATES.PREPARING || sessionState === SESSION_STATES.STOPPING) {
            const interval = setInterval(() => {
                setDots(prev => {
                    if (prev === '.') return '..';
                    if (prev === '..') return '...';
                    return '.';
                });
            }, 500);
            return () => clearInterval(interval);
        } else {
            setDots('.');
        }
    }, [sessionState]);

    const [session, setSession] = useState(route.params || null);
    const sessionStateRef = useRef(sessionState);
    const sessionRef = useRef(session);

    useEffect(() => {
        sessionStateRef.current = sessionState;
    }, [sessionState]);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const [energyUsed, setEnergyUsed] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isFetchingSession, setIsFetchingSession] = useState(true);

    // User State for Dynamic Greeting
    const [user, setUser] = useState(null);

    // Environmental State
    const [weather, setWeather] = useState(null);
    const [aqi, setAqi] = useState(null);
    const [isFetchingEnvironmental, setIsFetchingEnvironmental] = useState(true);

    // YouTube Content State
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [isYouTubeModalVisible, setIsYouTubeModalVisible] = useState(false);

    // Calendar State
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
    const pollingLockedUntil = useRef(0);

    // Minimized Redirect State
    const [isMinimized, setIsMinimized] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const redirectAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);

    const activeTabRef = useRef(0);
    const suggestedCarouselRef = useRef(null);
    const tabAnim = React.useRef(new Animated.Value(0)).current;
    const contentFadeAnim = React.useRef(new Animated.Value(1)).current;

    // Circular progress animation
    const progressAnim = React.useRef(new Animated.Value(0)).current;
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    // AQI bar animation
    const aqiBarAnim = React.useRef(new Animated.Value(0)).current;
    const bannerPulseAnim = React.useRef(new Animated.Value(0.18)).current;

    // Draggable UI
    const pan = useRef(new Animated.Value(0)).current;
    const currentY = useRef(0);
    const sheetHeightRef = useRef(SCREEN_H - 140);

    useEffect(() => {
        const id = pan.addListener(({ value }) => {
            currentY.current = value;
        });
        return () => pan.removeListener(id);
    }, [pan]);

    const panResponder = useRef(
        PanResponder.create({
            // Disable dragging to minimize as per request
            onMoveShouldSetPanResponder: () => false,
            onStartShouldSetPanResponder: () => false,
            onPanResponderGrant: () => {
                pan.setOffset(currentY.current);
                pan.setValue(0);
            },
            onPanResponderMove: Animated.event(
                [null, { dy: pan }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                pan.flattenOffset();

                // Calculate max translation allowing about 80px peek from bottom
                const MAX_Y = Math.max(0, sheetHeightRef.current - 120);
                let toValue = 0;

                // Snap based on swipe speed and distance
                if (gestureState.vy > 0.8 || currentY.current > MAX_Y * 0.4) {
                    toValue = MAX_Y;
                    setIsMinimized(true);
                } else if (gestureState.vy < -0.8 || currentY.current <= MAX_Y * 0.4) {
                    toValue = 0;
                    setIsMinimized(false);
                }

                Animated.spring(pan, {
                    toValue,
                    useNativeDriver: false,
                    bounciness: 6,
                }).start();
            }
        })
    ).current;


    // Auto-switch to tab 1 (Explore) after a brief settle delay
    useEffect(() => {
        const t = setTimeout(() => switchTab(0), 10000);
        return () => clearTimeout(t);
    }, []);

    // Looping interval for Suggested Card
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSuggestedTab(prev => {
                const next = (prev + 1) % 3;
                if (suggestedCarouselRef.current) {
                    suggestedCarouselRef.current.scrollTo({ x: next * (SCREEN_W - 72), animated: true });
                }
                return next;
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Real Active Session
    const fetchSession = useCallback(async () => {
        if (Date.now() < pollingLockedUntil.current) return;
        try {
            const userData = await authService.getUser();
            if (userData) setUser(userData);

            const userId = userData?.id || userData?.userId || userData?.email;
            if (!userId) return;

            const activeSession = await sessionApi.getActiveSession(userId);

            if (activeSession) {
                setSession(activeSession);
                setSessionState(SESSION_STATES.CHARGING);
                // Initial energy fetch
                const energy = await sessionApi.getSessionEnergy(activeSession.sessionId);
                setEnergyUsed(energy);

                // Calculate elapsed time
                const now = Date.now();
                const start = activeSession.startTime || now;
                setElapsedSeconds(Math.floor((now - start) / 1000));
            } else {
                // If we were expecting a session from params but none is active, 
                // we might need to start it. This is handled by a separate effect.
                if (!route.params?.chargerId) {
                    setSession(null);
                }
            }
        } catch (err) {
            console.warn("Failed to fetch session:", err);
        } finally {
            setIsFetchingSession(false);
        }
    }, [route.params]);

    useEffect(() => {
        fetchSession();

        // Start session if params provided and no session active
        const startNewSession = async () => {
            if (route.params?.chargerId && !isOverlay) {
                try {
                    // Check if already started (to avoid double start on re-render)
                    const user = await authService.getUser();
                    const userId = user?.id || user?.userId || user?.email;
                    const active = await sessionApi.getActiveSession(userId);
                    
                    if (!active) {
                        console.log("Starting new session with params:", route.params);
                        setSessionState(SESSION_STATES.PREPARING);
                        await sessionApi.startSession(route.params);
                        await fetchSession();
                    } else {
                        setSession(active);
                        setSessionState(SESSION_STATES.CHARGING);
                    }
                } catch (e) {
                    console.error("Start session failed:", e);
                    setSessionState(SESSION_STATES.CHARGING); // Fallback
                }
            }
        };

        startNewSession();

        // Poll for energy updates every 10 seconds
        const interval = setInterval(async () => {
            if (sessionStateRef.current === SESSION_STATES.STOPPING || Date.now() < pollingLockedUntil.current) return;

            try {
                const user = await authService.getUser();
                if (!user) return;
                const userId = user.id || user.userId || user.email;
                const activeSession = await sessionApi.getActiveSession(userId);

                if (activeSession) {
                    setSession(activeSession);
                    setSessionState(SESSION_STATES.CHARGING);
                    const energy = await sessionApi.getSessionEnergy(activeSession.sessionId);
                    setEnergyUsed(energy);

                    const now = Date.now();
                    const start = activeSession.startTime || now;
                    setElapsedSeconds(Math.floor((now - start) / 1000));
                } else {
                    // If we were charging but now activeSession is null, it might have finished automatically
                    if (sessionStateRef.current === SESSION_STATES.CHARGING && sessionRef.current?.sessionId) {
                        console.log("Session seems to have finished automatically. Checking records...");
                        pollingLockedUntil.current = Date.now() + 60000;
                        try {
                            const finishedSession = await sessionApi.getSessionDetails(sessionRef.current.sessionId);
                            if (finishedSession) {
                                console.log("Found finished session record automatically:", finishedSession);
                                setSessionState(SESSION_STATES.COMPLETED);
                                navigation.replace('Invoice', {
                                    sessionData: finishedSession,
                                    sessionId: sessionRef.current.sessionId,
                                    finalEnergy: finishedSession.energyKwh || finishedSession.energyUsed || energyUsed,
                                    finalDuration: finishedSession.duration || elapsedSeconds,
                                    stationName: sessionRef.current?.stationName,
                                    rate: sessionRef.current?.rate,
                                    chargerType: sessionRef.current?.chargerType,
                                    stationId: sessionRef.current?.stationId
                                });
                                return;
                            }
                        } catch (err) {
                            console.warn("Failed to automatically retrieve finished session:", err);
                        }
                        
                        // Fallback if we cannot find the finished session details
                        navigation.replace('Home');
                    }
                    
                    if (!route.params?.chargerId) {
                        setSession(null);
                    }
                }
            } catch (e) {
                // Background poll fail is okay
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchSession, route.params, isOverlay]);

    // Local Timer for elapsed time (smooth updates)
    useEffect(() => {
        if (!session || sessionState !== SESSION_STATES.CHARGING) return;
        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [session, sessionState]);

    // Animate progress whenever energy or percentage changes
    useEffect(() => {
        if (!session) return;

        // Calculate percentage: (currentkWh / targetkWh) * 100
        const targetKwh = session.selectedKwh || 45; // Fallback to 45 if unknown
        const pct = Math.min(100, (energyUsed / targetKwh) * 100);

        Animated.timing(progressAnim, {
            toValue: pct,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [energyUsed, session?.selectedKwh]);

    // Fetch Nearby amenities & Environmental Data
    useEffect(() => {
        const loadAmbientData = async () => {
            // New Delhi mock or station coordinates fallback
            let lat = 28.5355;
            let lng = 77.3910;
            try {
                const location = await GetLocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                });
                lat = location.latitude;
                lng = location.longitude;
            } catch (err) {
                console.warn("Location fetch failed, using fallback:", err);
            }

            // 1. Fetch Amenities
            try {
                const res = await placesService.fetchNearbyAmenities(lat, lng);
                if (res && res.length > 0) {
                    const mapped = res.map((item, idx) => {
                        const isCoffee = item.type === 'Cafe';
                        const isRest = item.type === 'Restaurant';
                        return {
                            id: item.id || idx,
                            name: item.name,
                            type: item.type,
                            geometry: item.geometry,
                            distance: 'Nearby',
                            rating: item.rating ? item.rating.toFixed(1) : 4.0,
                            open: item.isOpen,
                            icon: isCoffee ? Coffee : isRest ? Utensils : ShoppingBag,
                            color: isCoffee ? '#A1887F' : isRest ? '#EF5350' : '#AB47BC',
                            thumb: item.photoUrl || 'https://images.unsplash.com/photo-1552895638-f7fe08d2f7d5?w=200&q=60'
                        };
                    });
                    setNearbyPlaces(mapped);
                }
            } catch (error) {
                console.log("Failed to load nearby places:", error);
            } finally {
                // Smooth layout transition for expansion
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsLoadingPlaces(false);
            }

            // 2. Fetch Environmental Data (Google API)
            try {
                const [weatherData, aqiData] = await Promise.all([
                    environmentalService.getCurrentWeather(lat, lng),
                    environmentalService.getAirQuality(lat, lng)
                ]);

                // Map Google responses (assuming standard or mapped structure)
                if (weatherData && weatherData.currentConditions) {
                    // Extracting based on Google Weather API structure
                    setWeather({
                        temp: Math.round(weatherData.currentConditions.temperature?.value || weatherData.currentConditions.temperature || 28),
                        condition: weatherData.currentConditions.summary || weatherData.currentConditions.condition || 'Sunny',
                        icon: '⛅'
                    });
                } else {
                    console.log("No weather currentConditions found, data might be nested differently:", weatherData);
                }

                if (aqiData && aqiData.indexes) {
                    // Extracting from main index
                    const mainIndex = aqiData.indexes[0] || {};
                    // Clean up category (e.g. "Moderate air quality" -> "Moderate")
                    let categoryText = mainIndex.category || 'Moderate';
                    if (categoryText.toLowerCase().includes(' air quality')) {
                        categoryText = categoryText.replace(/ air quality/gi, '');
                    }

                    setAqi({
                        aqi: mainIndex.aqi || 87,
                        category: categoryText,
                        pollutant: mainIndex.dominantPollutant || 'PM2.5'
                    });
                }
            } catch (envErr) {
                console.warn("Failed to fetch Google environmental data:", envErr.message);
            } finally {
                setIsFetchingEnvironmental(false);
            }

            // 3. Fetch YouTube Content
            try {
                const videos = await youtubeService.searchVideos();
                if (videos && videos.length > 0) {
                    setYoutubeVideos(videos);
                }
            } catch (ytErr) {
                console.warn("YouTube search failed:", ytErr.message);
            }

            // 4. Fetch Calendar Events
            try {
                const events = await calendarService.fetchPublicEvents();
                if (events && events.length > 0) {
                    setCalendarEvents(events);
                }
            } catch (calErr) {
                console.warn("Calendar fetch failed:", calErr.message);
            }
        };
        loadAmbientData();
    }, []);

    // Redirect Timer Logic
    useEffect(() => {
        if (isMinimized) {
            setCountdown(3);
            redirectAnim.setValue(0);
            
            // Animate progress ring
            Animated.timing(redirectAnim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start();

            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            redirectAnim.stopAnimation();
            redirectAnim.setValue(0);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isMinimized]);

    // Separate Effect for Navigation to avoid "update while rendering" error
    useEffect(() => {
        if (isMinimized && countdown === 0) {
            navigation.navigate('Home');
        }
    }, [countdown, isMinimized, navigation]);

    // Animate circle to mock percentage
    // useNativeDriver must be false: progressAnim drives SVG strokeDashoffset
    // AND a `width` interpolation — neither is supported by the native driver.

    // Pulse the bolt icon.
    // useNativeDriver: false — must match the rest of the component (progressAnim,
    // tabAnim, aqiBarAnim all use JS driver). Mixing native/JS drivers for Animated
    // values in the same component causes "moved to native" crashes on hot-reload
    // with React Native Fabric.
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // AQI bar
    useEffect(() => {
        Animated.timing(aqiBarAnim, {
            toValue: MOCK_AQI.aqi / 200,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, []);


    const switchTab = useCallback((idx) => {
        if (activeTabRef.current === idx) return;

        // Parallel animation: move tab indicator + fade out content
        Animated.timing(contentFadeAnim, {
            toValue: 0,
            duration: 125,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setActiveTab(idx);
                activeTabRef.current = idx;
                Animated.timing(contentFadeAnim, {
                    toValue: 1,
                    duration: 125,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }).start();
            }
        });

        Animated.timing(tabAnim, {
            toValue: idx,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [tabAnim, contentFadeAnim]);

    // Session banner pulse (subtle border breath)
    // const bannerPulseAnim = useSharedValue(0.18); // Handled in state setup

    // Banner pulse — slow breath on border opacity
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bannerPulseAnim, { toValue: 0.55, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
                Animated.timing(bannerPulseAnim, { toValue: 0.18, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ])
        ).start();
    }, []);

    // Circle math
    const CIRCLE_SIZE = 140;
    const STROKE = 8;
    const RADIUS = (CIRCLE_SIZE - STROKE) / 2;
    const CIRCUMFERENCE = RADIUS * 2 * Math.PI;
    
    const pulseStyle = { transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.18], outputRange: [1, 1.1] }) }] };
    const bannerStyle = { borderColor: bannerPulseAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(57,226,155,0)', 'rgba(57,226,155,1)'] }) };
    const progressBarStyle = { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) };
    const aqiBarStyle = { width: aqiBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) };
    const tabIndicatorStyle = { left: tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] }) };
    const tabContentStyle = { opacity: contentFadeAnim };
    
    // For Circle components, we'll pass props directly in JSX using interpolation
    // const mainRingProps = ... (deprecated)
    // const miniRingProps = ... (deprecated)

    
    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const TAB_W = (SCREEN_W - 40) / TABS.length;

    const currentPct = session ? Math.min(100, Math.round((energyUsed / (session.selectedKwh || 45)) * 100)) : 0;
    const estimatedCost = session ? (energyUsed * (session.rate || 0)).toFixed(2) : '0.00';

    const getDynamicGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        if (hour < 21) return "Good Evening";
        return "Good Night";
    };

    const userName = user?.name?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'Friend';

    // ── Render helpers ─────────────────────────────────────────────────────────
    const renderSessionBanner = () => (
        <Animated.View style={[
            styles.sessionBanner,
            bannerStyle,
        ]}>
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
                onPress={() => switchTab(0)}
                activeOpacity={0.82}
            >
                {/* Left: progress ring indicator */}
                <View style={styles.sessionBannerRing}>
                    <Svg width={46} height={46}>
                        <Circle
                            stroke="rgba(57,226,155,0.12)"
                            strokeWidth={4}
                            fill="none"
                            cx={23} cy={23} r={19}
                        />
                        <AnimatedCircle
                            stroke="#39E29B"
                            strokeWidth={4}
                            strokeDasharray={`${2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                            strokeDashoffset={progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: [2 * Math.PI * 19, 0],
                            })}
                            strokeLinecap="round"
                            fill="none"
                            cx={23} cy={23} r={19}
                            rotation="-90"
                            origin="23,23"
                        />
                    </Svg>
                    <View style={styles.sessionBannerRingInner}>
                        <Text style={styles.sessionBannerPct}>{currentPct}%</Text>
                    </View>
                </View>

                {/* Middle: key stats */}
                <View style={styles.sessionBannerInfo}>
                    <View style={styles.sessionBannerTitleRow}>
                        <View style={styles.sessionBannerDot} />
                        <Text style={styles.sessionBannerLabel}>Charging In Progress</Text>
                    </View>
                    <Text style={styles.sessionBannerStation} numberOfLines={1}>
                        {session?.stationName || 'Unknown Station'}
                    </Text>
                    <View style={styles.sessionBannerStats}>
                        <View style={styles.sessionBannerStat}>
                            <Zap size={11} color="#ffffffff" />
                            <Text style={styles.sessionBannerStatText}>{energyUsed.toFixed(2)} kWh</Text>
                        </View>
                        <View style={styles.sessionBannerDivider} />
                        <TimerDisplay startTime={session?.startTime} style={styles.sessionBannerStatText} />
                    </View>
                </View>

                {/* Right: chevron */}
                <View style={styles.sessionBannerChevron}>
                    <ChevronRight size={16} color="#888" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSessionTab = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

            {/* Circular Progress + Background Image */}
            <View style={styles.circleWrapper}>
                <Image
                    source={require('../assets/images/vehicles/e_bike.png')}
                    style={styles.circleImage}
                    resizeMode="contain"
                />
                <View style={styles.circleOverlay} />

                {/* Floating Progress Bar at bottom-right */}
                <View style={styles.floatingProgressContainer}>
                    {/* Background glow */}
                    <View style={styles.circleGlow} />
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                        <Defs>
                            <SvgGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#7bfbc6ff" />
                                <Stop offset="100%" stopColor="#007242ff" />
                            </SvgGradient>
                        </Defs>
                        {/* Track */}
                        <Circle
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth={STROKE}
                            fill="none"
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                        />
                        {/* Progress arc */}
                        <AnimatedCircle
                            stroke="url(#arcGrad)"
                            strokeWidth={STROKE}
                            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                            strokeDashoffset={progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: [CIRCUMFERENCE, 0],
                            })}
                            strokeLinecap="round"
                            fill="none"
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            rotation="-90"
                            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                        />
                    </Svg>
                    {/* Centre content */}
                    <View style={styles.circleInner}>
                        <Animated.View style={pulseStyle}>
                            <Zap size={14} color={sessionState === SESSION_STATES.CHARGING ? "#39E29B" : "#888"} fill={sessionState === SESSION_STATES.CHARGING ? "#39E29B" : "#888"} />
                        </Animated.View>
                        <Text style={styles.pctText}>{currentPct}<Text style={styles.pctUnit}>%</Text></Text>
                        <View style={[
                            styles.statusPill, 
                            { 
                                borderColor: sessionState === SESSION_STATES.CHARGING ? '#39E29B' : '#888',
                                backgroundColor: sessionState === SESSION_STATES.CHARGING ? 'rgba(57,226,155,0.1)' : 'rgba(136,136,136,0.1)'
                            }
                        ]}>
                            <View style={[
                                styles.activeDot, 
                                { backgroundColor: sessionState === SESSION_STATES.CHARGING ? '#39E29B' : '#888' }
                            ]} />
                            <Text style={[
                                styles.statusPillText, 
                                { color: sessionState === SESSION_STATES.CHARGING ? '#39E29B' : '#888' }
                            ]}>
                                LIVE
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsGrid}>
                <StatCard
                    label="Energy"
                    value={energyUsed.toFixed(2)}
                    unit="kWh"
                    subValue={`₹${session?.rate || '0.00'}/kWh`}
                    color="#ffffffff"
                />
                <StatCard
                    label="Duration"
                    value={<TimerDisplay startTime={session?.startTime} />}
                    unit=""
                    color="#ffffffff"
                />
            </View>

            {/* Session Detail Card (Dynamic) */}
            {session && (
                <View style={[styles.detailCard, { marginBottom: 16 }]}>
                    <View style={styles.detailStationRow}>
                        <MapPin size={16} color={C.primary} />
                        <Text style={styles.detailStationName} numberOfLines={1}>{session.stationName || 'Unknown Station'}</Text>
                        <View style={styles.connectorBadge}>
                            <Text style={styles.connectorBadgeText}>
                                {session.chargerType || 'Fast'} • {session.connectorType || 'CCS2'}
                            </Text>
                        </View>
                    </View>
                    {/* Removed Connector and Estimated Cost rows per user request */}
                </View>
            )}

            {/* While you wait */}
            <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <SectionHeader title="While You Wait" icon={<Coffee size={14} color="#FFD740" />} />
                </View>
                <View style={{ marginHorizontal: -20, position: 'relative' }}>
                    {isLoadingPlaces ? (
                        <View style={{ height: 140, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#39E29B" />
                        </View>
                    ) : (
                        <>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                                {nearbyPlaces.filter(p => p.type === 'Coffee' || p.type === 'Restaurant' || p.type === 'Cafe').slice(0, 5).map((place, idx) => (
                                    <SquareCafeCard key={place.id} place={place} index={idx} />
                                ))}
                            </ScrollView>
                            <LinearGradient colors={['#0A0A0A', 'rgba(10,10,10,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1 }} />
                            <LinearGradient colors={['rgba(10,10,10,0)', '#0A0A0A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 1 }} />
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );

    const renderExploreTab = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* ── Ongoing Session Banner ────────────────────────── */}
            {renderSessionBanner()}
            {/* ── Trending Highlights Card ─────────────────── */}
            <TouchableOpacity
                style={styles.trendingCard}
                onPress={() => switchTab(2)}
                activeOpacity={0.8}
            >
                <View style={styles.trendingInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} color="#FFD740" />
                        <Text style={styles.trendingTitle}>What's Trending Now?</Text>
                    </View>
                    <Text style={styles.trendingSub}>Discover the latest EV news & videos</Text>
                </View>
                <View style={styles.sessionBannerChevron}>
                    <TrendingUp size={16} color={C.primary} />
                </View>
            </TouchableOpacity>
            {/* ── Weather + Air Quality (combined) ─────────────── */}
            {/* <SectionHeader title="Weather & Air Quality" icon={<Thermometer size={14} color="#FFD740" />} /> */}
            <View style={styles.weatherCard}>
                {/* Two-column hero row: Weather | AQI */}
                <View style={styles.weatherHeroRow}>
                    {/* Left — Temperature */}
                    <View style={styles.weatherHeroSection}>
                        <View style={styles.weatherHeroValueRow}>
                            <Text style={styles.weatherEmojiSm}>{MOCK_WEATHER.icon}</Text>
                            <Text style={styles.weatherTempSm}>{MOCK_WEATHER.temp}°C</Text>
                        </View>
                        <Text style={styles.weatherCond}>{MOCK_WEATHER.condition}</Text>
                        <Text style={styles.weatherFeels}>Feels like {MOCK_WEATHER.feelsLike}°C</Text>
                    </View>

                    {/* Vertical divider */}
                    <View style={styles.weatherVertDivider} />

                    {/* Right — AQI */}
                    <View style={styles.weatherHeroSection}>
                        <View style={styles.weatherHeroValueRow}>
                            <Text style={styles.weatherEmojiSm}>💨</Text>
                            <Text style={[styles.weatherTempSm, { color: MOCK_AQI.color }]}>{MOCK_AQI.aqi}</Text>
                        </View>
                        <Text style={styles.weatherCond}>{MOCK_AQI.category}</Text>
                        <Text style={styles.weatherFeels}>AQI · {MOCK_AQI.dominantPollutant}</Text>
                    </View>
                </View>

                {/* Bottom stats: Humidity + Visibility */}
                <View style={styles.weatherAqiDivider} />
                <View style={styles.weatherGrid}>
                    <WeatherStat icon={<Droplets size={14} color="#90CAF9" />} label="Humidity" value={`${MOCK_WEATHER.humidity}%`} />
                    <WeatherStat icon={<Eye size={14} color="#CE93D8" />} label="Visibility" value={`${MOCK_WEATHER.visibility} km`} />
                </View>
            </View>

            {/* ── Nearby Places ─────────────────────────────────── */}
            <SectionHeader title="Nearby Places" icon={<MapPin size={14} color="#39E29B" />} />
            <View style={{ marginHorizontal: -20, position: 'relative' }}>
                {isLoadingPlaces ? (
                    <View style={{ height: 140, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#39E29B" />
                    </View>
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                            {nearbyPlaces.map((place, idx) => (
                                <SquareCafeCard key={place.id} place={place} index={idx} />
                            ))}
                        </ScrollView>
                        <LinearGradient colors={['#0A0A0A', 'rgba(10,10,10,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1 }} />
                        <LinearGradient colors={['rgba(10,10,10,0)', '#0A0A0A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 1 }} />
                    </>
                )}
            </View>
        </ScrollView>
    );

    const renderContentTab = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* ── Ongoing Session Banner ────────────────────────── */}
            {renderSessionBanner()}

            {/* ── Blog Posts ────────────────────────────────────── */}
            <SectionHeader title="EV Blog" icon={<Newspaper size={14} color="#CE93D8" />} />
            {MOCK_BLOGS.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
            ))}

            {/* ── YouTube / Videos ──────────────────────────────── */}
            <SectionHeader title="Watch While You Charge" icon={<Youtube size={14} color="#FF5252" />} />
            {MOCK_VIDEOS.map((video) => (
                <VideoCard key={video.id} video={video} />
            ))}
        </ScrollView>
    );

    const renderOverlayContent = () => (
        <View style={{ padding: 20 }}>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View>
                    <Text style={{ color: '#aaa', fontSize: 13, fontFamily: 'Google Sans', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>Energy</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Google Sans', fontWeight: '800', marginTop: 4 }}>{energyUsed.toFixed(2)} <Text style={{ fontSize: 14, color: '#888', fontWeight: '600' }}>kWh</Text></Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#aaa', fontSize: 13, fontFamily: 'Google Sans', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>Duration</Text>
                    <TimerDisplay startTime={session?.startTime} style={{ color: '#fff', fontSize: 24, fontFamily: 'Google Sans', fontWeight: '800', marginTop: 4 }} />
                </View>
            </View>

            {/* Linear Progress bar */}
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
                <Animated.View
                    style={[{
                        height: '100%',
                        backgroundColor: '#39E29B',
                    }, progressBarStyle]}
                />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                <Text style={{ color: '#39E29B', fontSize: 14, fontWeight: '700' }}>{currentPct}% Charged</Text>
                <Text style={{ color: '#555', fontSize: 12, fontWeight: '600' }}>{session?.chargerType || 'Fast'} Charging</Text>
            </View>

            {/* View Button */}
            <TouchableOpacity
                activeOpacity={0.8}
                style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    height: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4
                }}
                onPress={() => navigation.navigate('Test')}
            >
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 16 }}>View Details</Text>
                <ChevronRight size={20} color="#000" />
            </TouchableOpacity>
        </View>
    );

    // ── Main render ───────────────────────────────────────────────────────────
    const animatedRadius = pan.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 24],
        extrapolate: 'clamp',
    });

    const backdropOpacity = pan.interpolate({
        inputRange: [0, Math.max(1, sheetHeightRef.current - 120)],
        outputRange: [0.6, 0],
        extrapolate: 'clamp',
    });

    const refreshOpacity = pan.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const dragBarOpacity = pan.interpolate({
        inputRange: [10, 50],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const dragBarHeight = pan.interpolate({
        inputRange: [5, 45],
        outputRange: [0, 24],
        extrapolate: 'clamp',
    });

    const minimizeOpacity = pan.interpolate({
        inputRange: [40, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.rootWrapper, isOverlay && { backgroundColor: 'transparent' }]} pointerEvents={isOverlay ? 'box-none' : 'auto'}>
            {/* Background Demo Content revealed when dragged down */}
            {!isOverlay && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }]}>
                    {isMinimized && (
                        <Animated.View style={{ alignItems: 'center', opacity: minimizeOpacity }}>
                            <View style={{ width: 120, height: 120, justifyContent: 'center', alignItems: 'center' }}>
                                <Svg width={120} height={120} style={{ position: 'absolute' }}>
                                    <Circle
                                        cx="60"
                                        cy="60"
                                        r="54"
                                        stroke="rgba(57,226,155,0.1)"
                                        strokeWidth="6"
                                        fill="none"
                                    />
                                    <AnimatedCircle
                                        cx="60"
                                        cy="60"
                                        r="54"
                                        stroke="#39E29B"
                                        strokeWidth="6"
                                        strokeDasharray={`${2 * Math.PI * 54}`}
                                        strokeDashoffset={redirectAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 2 * Math.PI * 54]
                                        })}
                                        strokeLinecap="round"
                                        fill="none"
                                        transform="rotate(-90 60 60)"
                                    />
                                </Svg>
                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>{countdown}</Text>
                                <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>SEC</Text>
                            </View>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 24 }}>Redirecting to Home</Text>
                            <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Drag up to stay in session</Text>
                        </Animated.View>
                    )}
                </View>
            )}

            {/* Backdrop Dimmer */}
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}
            />

            <Animated.View
                onLayout={(e) => { sheetHeightRef.current = e.nativeEvent.layout.height; }}
                style={[styles.container, {
                    transform: [{ translateY: pan }],
                    borderTopLeftRadius: animatedRadius,
                    borderTopRightRadius: animatedRadius,
                    overflow: 'hidden',
                }]}
            >
                <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

                {/* Background grid pattern overlay */}
                <View style={styles.bgGrid} pointerEvents="none" />

                {/* Drag Bar */}
                <Animated.View {...panResponder.panHandlers} style={[styles.dragBarContainer, { height: dragBarHeight, paddingTop: 0, justifyContent: 'flex-end', paddingBottom: 6 }]}>
                    <Animated.View style={[styles.dragBar, { opacity: dragBarOpacity }]} />
                </Animated.View>

                {!isOverlay && (
                    <>
                        {/* ── Header ── */}
                        <View {...panResponder.panHandlers} style={[styles.header, { paddingTop: 12 }]}>
                            {/* <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                            <ChevronRight size={22} color="#fff" />
                        </TouchableOpacity> */}
                            <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 12 }}>
                                <Text style={styles.headerTitle}>
                                    {sessionState === SESSION_STATES.PREPARING ? 'Preparing Session' : 
                                     sessionState === SESSION_STATES.STOPPING ? 'Stopping Session' : 
                                     'Charging In Progress'}
                                </Text>
                                <View style={styles.connectedPill}>
                                    <View style={[styles.connectedDot, (sessionState === SESSION_STATES.PREPARING || sessionState === SESSION_STATES.STOPPING) && { backgroundColor: '#FFD740' }]} />
                                    <Text style={[styles.connectedText, (sessionState === SESSION_STATES.PREPARING || sessionState === SESSION_STATES.STOPPING) && { color: '#FFD740' }]}>
                                        {sessionState === SESSION_STATES.PREPARING ? `Initializing${dots}` : 
                                         sessionState === SESSION_STATES.STOPPING ? `Stopping${dots}` : 
                                         'Connected'}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ position: 'relative', width: 38, height: 38 }}>
                                <Animated.View style={{ position: 'absolute', inset: 0, opacity: refreshOpacity }}>
                                    <TouchableOpacity 
                                        style={styles.iconBtn} 
                                        onPress={fetchSession}
                                        disabled={sessionState === SESSION_STATES.PREPARING || sessionState === SESSION_STATES.STOPPING}
                                    >
                                        {(sessionState === SESSION_STATES.PREPARING || sessionState === SESSION_STATES.STOPPING) ? (
                                            <ActivityIndicator size="small" color="#39E29B" />
                                        ) : (
                                            <RefreshCw size={18} color="#aaa" />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                                <Animated.View style={{ position: 'absolute', inset: 0, opacity: minimizeOpacity }}>
                                    <TouchableOpacity
                                        style={[styles.iconBtn]}
                                        onPress={() => {
                                            setIsMinimized(false);
                                            Animated.spring(pan, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
                                        }}
                                    >
                                        <ChevronRight size={22} color="#fff" />
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>

                        {/* ── Content ── */}
                        <Animated.View style={[styles.tabContent, { paddingHorizontal: 20 }, tabContentStyle]}>
                            {activeTab === 0 && renderSessionTab()}
                            {activeTab === 1 && renderExploreTab()}
                            {activeTab === 2 && renderContentTab()}
                        </Animated.View>

                        {/* ── Sticky Footer ── */}
                        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                            <TouchableOpacity
                                style={styles.minimizeBtn}
                                onPress={() => {
                                    // setIsMinimized(true);
                                    // Animated.spring(pan, { toValue: Math.max(0, sheetHeightRef.current - 120), useNativeDriver: false, bounciness: 6 }).start();
                                    // Redirect to Home instead of minimizing in place
                                    navigation.navigate('Home');
                                }}
                            >
                                <ChevronDown size={20} color="#888" />
                                <Text style={styles.minimizeTxt}>Minimize</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.stopBtn, { flex: 1 }, sessionState === SESSION_STATES.STOPPING && { opacity: 0.7 }]}
                                disabled={sessionState === SESSION_STATES.STOPPING}
                                onPress={() => {
                                    const sid = session?.sessionId || session?.id || route.params?.sessionId || route.params?.id;
                                    
                                    if (!sid) {
                                        showAlert("Error", "No active session ID found to stop.");
                                        return;
                                    }

                                    showAlert(
                                        "End Session",
                                        "Are you sure you want to stop the charging session?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Stop",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        setSessionState(SESSION_STATES.STOPPING);
                                                        const result = await sessionApi.stopSession(sid);
                                                        
                                                        // Transition to Completed and navigate to Invoice
                                                        setSessionState(SESSION_STATES.COMPLETED);
                                                        
                                                        navigation.replace('Invoice', {
                                                            sessionData: result,
                                                            sessionId: sid,
                                                            finalEnergy: energyUsed,
                                                            finalDuration: elapsedSeconds,
                                                            stationName: session?.stationName,
                                                            rate: session?.rate,
                                                            chargerType: session?.chargerType,
                                                            stationId: session?.stationId
                                                        });
                                                    } catch (e) {
                                                        console.log("Stop fail:", e);
                                                        setSessionState(SESSION_STATES.CHARGING);
                                                        showAlert("Error", e.userMessage || "Failed to stop session. Please try again.");
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                {sessionState === SESSION_STATES.STOPPING ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.stopTxt}>Stopping...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.stopTxt}>End Session</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {isOverlay && renderOverlayContent()}
            </Animated.View>

            {/* Google YouTube Popup Modal */}
            <Modal
                visible={isYouTubeModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsYouTubeModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsYouTubeModalVisible(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>YouTube Recommendations</Text>
                                <Text style={styles.modalSubtitle}>Watch while you charge</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsYouTubeModalVisible(false)} style={styles.closeBtn}>
                                <X size={20} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                            {youtubeVideos.map(video => (
                                <TouchableOpacity
                                    key={video.id}
                                    style={styles.modalVideoCard}
                                    activeOpacity={0.8}
                                    onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`)}
                                >
                                    <Image source={{ uri: video.thumb }} style={styles.modalVideoThumb} />
                                    <View style={styles.modalVideoInfo}>
                                        <Text style={styles.modalVideoTitle} numberOfLines={2}>{video.title}</Text>
                                        <Text style={styles.modalVideoChannel}>{video.channel}</Text>
                                        <TouchableOpacity
                                            style={styles.playNowBtn}
                                            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`)}
                                        >
                                            <Play size={12} color="#000" fill="#000" />
                                            <Text style={styles.playNowText}>WATCH</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Google Calendar Popup Modal */}
            <Modal
                visible={isCalendarModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsCalendarModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsCalendarModalVisible(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Upcoming Holidays</Text>
                                <Text style={styles.modalSubtitle}>Sync from Google Calendar</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsCalendarModalVisible(false)} style={styles.closeBtn}>
                                <X size={20} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                            {calendarEvents.map(event => (
                                <View key={event.id} style={styles.modalEventCard}>
                                    <View style={styles.modalEventDate}>
                                        <Text style={styles.eventDay}>{new Date(event.start).getDate()}</Text>
                                        <Text style={styles.eventMon}>{new Date(event.start).toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.modalEventInfo}>
                                        <Text style={styles.modalVideoTitle}>{event.title}</Text>
                                        <Text style={styles.modalVideoChannel}>Public Holiday</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }) {
    return (
        <View style={sharedStyles.sectionHeader}>
            <View style={sharedStyles.sectionIconWrap}>{icon}</View>
            <Text style={sharedStyles.sectionTitle}>{title}</Text>
        </View>
    );
}

function StatCard({ label, value, unit, color, subValue }) {
    return (
        <View style={[sharedStyles.statCard, { borderTopColor: color, borderTopWidth: 3, borderRadius: 18 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={sharedStyles.statLabel}>{label}</Text>
                {subValue ? <Text style={{ fontSize: 10, color: '#888', fontWeight: 'bold' }}>{subValue}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[sharedStyles.statValue, { color }]}>{value}</Text>
                {unit ? <Text style={sharedStyles.statUnit}>{unit}</Text> : null}
            </View>
        </View>
    );
}

function WeatherStat({ icon, label, value }) {
    return (
        <View style={sharedStyles.weatherStat}>
            {icon}
            <Text style={sharedStyles.weatherStatLabel}>{label}</Text>
            <Text style={sharedStyles.weatherStatValue}>{value}</Text>
        </View>
    );
}

function PollutantChip({ label, value, unit }) {
    return (
        <View style={sharedStyles.pollutantChip}>
            <Text style={sharedStyles.pollutantLabel}>{label}</Text>
            <Text style={sharedStyles.pollutantValue}>{value}</Text>
            <Text style={sharedStyles.pollutantUnit}>{unit}</Text>
        </View>
    );
}

function PlaceCard({ place }) {
    const Icon = place.icon;
    return (
        <View style={sharedStyles.placeCard}>
            <View style={[sharedStyles.placeIconBox, { backgroundColor: place.color + '22' }]}>
                <Icon size={20} color={place.color} />
            </View>
            <View style={sharedStyles.placeInfo}>
                <Text style={sharedStyles.placeName}>{place.name}</Text>
                <View style={sharedStyles.placeMeta}>
                    <Text style={sharedStyles.placeType}>{place.type}</Text>
                    <Text style={sharedStyles.placeDot}>·</Text>
                    <Text style={sharedStyles.placeDist}>{place.distance}</Text>
                    <Text style={sharedStyles.placeDot}>·</Text>
                    <Text style={[sharedStyles.placeOpen, { color: place.open ? '#39E29B' : '#FF5252' }]}>
                        {place.open ? 'Open' : 'Closed'}
                    </Text>
                </View>
            </View>
            <View style={sharedStyles.placeRight}>
                <View style={sharedStyles.ratingPill}>
                    <Star size={10} color="#FFD740" fill="#FFD740" />
                    <Text style={sharedStyles.ratingText}>{place.rating}</Text>
                </View>
                <TouchableOpacity style={sharedStyles.directionsBtn}>
                    <Navigation size={14} color="#39E29B" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function SquareCafeCard({ place, index = 0 }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay: index * 100, // Staggered delay
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={{
            opacity: anim,
            transform: [
                {
                    translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0]
                    })
                },
                {
                    scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1]
                    })
                }
            ]
        }}>
            <TouchableOpacity style={sharedStyles.cafeCard} activeOpacity={0.8} onPress={() => {
                if (place.geometry && place.geometry.location) {
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}`);
                }
            }}>
                {place.thumb ? (
                    <Image source={{ uri: place.thumb }} style={sharedStyles.cafeImage} />
                ) : (
                    <View style={sharedStyles.cafeImagePlaceholder}>
                        {(place.type === 'Rest stop' || place.type === 'Restaurant') ? <Utensils size={36} color="#D7CCC8" /> :
                            (place.type === 'Shopping mall' || place.type === 'Mall' ? <ShoppingBag size={36} color="#D7CCC8" /> : <Coffee size={36} color="#D7CCC8" />)}
                    </View>
                )}
                <View style={sharedStyles.cafeCardContent}>
                    <Text style={sharedStyles.cafeName} numberOfLines={1}>{place.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={sharedStyles.cafeRating}>★ {place.rating}</Text>
                        <Text style={{ color: place.open ? '#39E29B' : '#FF5252', fontSize: 11, fontWeight: 'bold' }}>
                            {place.open ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

function BlogCard({ blog }) {
    return (
        <View style={sharedStyles.blogCard}>
            <Image source={{ uri: blog.thumb }} style={sharedStyles.blogThumb} />
            <View style={sharedStyles.blogContent}>
                <View style={[sharedStyles.blogTag, { backgroundColor: blog.tagColor + '22' }]}>
                    <Text style={[sharedStyles.blogTagText, { color: blog.tagColor }]}>{blog.tag}</Text>
                </View>
                <Text style={sharedStyles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                <View style={sharedStyles.blogMeta}>
                    <Text style={sharedStyles.blogSource}>{blog.source}</Text>
                    <Text style={sharedStyles.blogDot}>·</Text>
                    <Text style={sharedStyles.blogRead}>{blog.readTime}</Text>
                </View>
            </View>
            <TouchableOpacity style={sharedStyles.openBtn}>
                <ArrowUpRight size={16} color="#aaa" />
            </TouchableOpacity>
        </View>
    );
}

function VideoCard({ video }) {
    return (
        <View style={sharedStyles.videoCard}>
            <View style={sharedStyles.videoThumbWrap}>
                <Image source={{ uri: video.thumb }} style={sharedStyles.videoThumb} />
                <View style={sharedStyles.playOverlay}>
                    <View style={sharedStyles.playBtn}>
                        <Play size={14} color="#000" fill="#000" />
                    </View>
                </View>
                <View style={sharedStyles.durationBadge}>
                    <Text style={sharedStyles.durationText}>{video.duration}</Text>
                </View>
            </View>
            <View style={sharedStyles.videoInfo}>
                <Text style={sharedStyles.videoTitle} numberOfLines={2}>{video.title}</Text>
                <Text style={sharedStyles.videoChannel}>{video.channel}</Text>
                <Text style={sharedStyles.videoViews}>{video.views}</Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
    bg: '#0A0A0A',
    surface: '#141414',
    surface2: '#1C1C1C',
    border: '#242424',
    primary: '#39E29B',
    text: '#FFFFFF',
    textMuted: '#666',
    textSub: '#999',
};

const styles = StyleSheet.create({
    
    rootWrapper: {
        flex: 1,
        backgroundColor: '#151515',
        justifyContent: 'flex-end',
    },
    googleCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        gap: 8,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
        minHeight: '50%',
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Google Sans',
    },
    modalSubtitle: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Google Sans',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalVideoCard: {
        flexDirection: 'row',
        backgroundColor: '#181818',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#282828',
    },
    modalVideoThumb: {
        width: 140,
        height: '100%',
        minHeight: 100,
    },
    modalVideoInfo: {
        flex: 1,
        padding: 12,
        gap: 6,
        justifyContent: 'center',
    },
    modalVideoTitle: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Google Sans',
        lineHeight: 18,
    },
    modalVideoChannel: {
        color: '#39E29B',
        fontSize: 11,
        fontFamily: 'Google Sans',
    },
    playNowBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginTop: 4,
    },
    playNowText: {
        color: '#000',
        fontSize: 10,
        fontFamily: 'Google Sans',
    },
    modalEventCard: {
        flexDirection: 'row',
        backgroundColor: '#181818',
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#282828',
        gap: 16,
    },
    modalEventDate: {
        width: 50,
        height: 50,
        backgroundColor: 'rgba(66,133,244,0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(66,133,244,0.2)',
    },
    eventDay: {
        color: '#4285F4',
        fontSize: 18,
        fontFamily: 'Google Sans',
    },
    eventMon: {
        color: '#4285F4',
        fontSize: 9,
        fontFamily: 'Google Sans',
        marginTop: -3,
    },
    modalEventInfo: {
        flex: 1,
    },
    googleIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    googleCardTitle: {
        color: '#E0E0E0',
        fontSize: 16,
        fontFamily: 'Google Sans',
    },
    googleCardSub: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Google Sans',
    },
    container: {
        backgroundColor: C.bg,
        maxHeight: '95%',
        width: '100%',
    },
    bgGrid: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        opacity: 0.03,
    },
    dragBarContainer: {
        width: '100%',
        paddingBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    dragBar: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#444',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: C.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
    },
    headerTitle: {
        color: C.text,
        fontSize: 15,
        fontFamily: 'Google Sans',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    connectedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    connectedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.primary,
    },
    connectedText: {
        color: C.primary,
        fontSize: 11,
        fontFamily: 'Google Sans',
    },
    sessionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.2)',
        padding: 14,
        marginBottom: 18,
        gap: 12,
    },
    sessionBannerRing: {
        width: 46,
        height: 46,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    sessionBannerRingInner: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionBannerPct: {
        color: C.primary,
        fontSize: 10,
        fontFamily: 'Google Sans',
        letterSpacing: -0.3,
    },
    sessionBannerInfo: {
        flex: 1,
        gap: 3,
    },
    sessionBannerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sessionBannerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.primary,
    },
    sessionBannerLabel: {
        color: C.primary,
        fontSize: 11,
        fontFamily: 'Google Sans',
        letterSpacing: 0.3,
    },
    sessionBannerStation: {
        color: C.textSub,
        fontSize: 12,
        fontFamily: 'Google Sans',
    },
    sessionBannerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    sessionBannerStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    sessionBannerStatText: {
        color: '#888',
        fontSize: 11,
        fontFamily: 'Google Sans',
        fontWeight: '800',
    },
    sessionBannerDivider: {
        width: 1,
        height: 10,
        backgroundColor: '#2E2E2E',
    },
    sessionBannerChevron: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: C.surface2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
        flexShrink: 0,
    },
    tabBarOuter: {
        paddingTop: 14,
        paddingBottom: 4,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 4,
        position: 'relative',
        borderWidth: 1,
        borderColor: C.border,
    },
    tabIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 12,
        backgroundColor: C.surface2,
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.18)',
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        flexDirection: 'row',
        gap: 4,
        zIndex: 1,
    },
    tabText: {
        color: C.textMuted,
        fontSize: 13,
        fontFamily: 'Google Sans',
    },
    tabTextActive: {
        color: C.text,
    },
    tabDotNew: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: C.primary,
        marginTop: -6,
    },
    tabContent: {
        flexShrink: 1,
        paddingTop: 16,
    },
    circleWrapper: {
        height: 240,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
        marginTop: -18,
        backgroundColor: '#111111e1',
    },
    circleImage: {
        ...StyleSheet.absoluteFillObject,
        width: '90%',
        height: '100%',
    },
    circleOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    floatingProgressContainer: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 10, 10, 1)',
        borderRadius: 70,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    circleGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(57,226,155,0.2)',
    },
    circleInner: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    pctText: {
        color: C.text,
        fontSize: 32,
        fontFamily: 'Google Sans',
        letterSpacing: -1,
    },
    pctUnit: {
        fontSize: 14,
        color: C.textSub,
        fontFamily: 'Google Sans',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(57,226,155,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.3)',
    },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: C.primary,
    },
    statusPillText: {
        color: C.primary,
        fontSize: 9,
        fontFamily: 'Google Sans',
        letterSpacing: 1.5,
    },
    stationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 5,
        marginBottom: 16,
    },
    stationName: {
        color: C.textSub,
        fontSize: 12,
        flex: 1,
        textAlign: 'left',
        fontFamily: 'Google Sans',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    detailCard: {
        backgroundColor: C.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
        gap: 14,
    },
    detailStationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    detailStationName: {
        color: C.text,
        fontSize: 15,
        fontFamily: 'Google Sans',
        flex: 1,
    },
    detailDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginVertical: 2,
    },
    detailExploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(57,226,155,0.08)',
        borderRadius: 12,
        padding: 12,
        marginTop: 6,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.15)',
    },
    detailExploreText: {
        color: C.primary,
        fontSize: 13,
        fontFamily: 'Google Sans',
    },
    trendingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,215,64,0.15)',
    },
    trendingInfo: {
        flex: 1,
        gap: 4,
    },
    trendingTitle: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'Google Sans',
        letterSpacing: -0.3,
    },
    trendingSub: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Google Sans',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: C.textMuted,
        fontSize: 13,
        fontFamily: 'Google Sans',
    },
    detailValue: {
        color: C.text,
        fontSize: 13,
        fontFamily: 'Google Sans',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: -4,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: C.primary,
        borderRadius: 3,
    },
    connectorBadge: {
        backgroundColor: 'rgba(57,226,155,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.25)',
    },
    connectorBadgeText: {
        color: C.primary,
        fontSize: 11,
        fontFamily: 'Google Sans',
    },
    weatherCard: {
        backgroundColor: C.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 14,
        gap: 16,
    },
    weatherHeroRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 0,
    },
    weatherHeroSection: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        gap: 3,
    },
    weatherVertDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 4,
        marginHorizontal: 8,
    },
    aqiEmojiBox: {
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginBottom: 2,
    },
    weatherEmoji: { fontSize: 48 },
    weatherEmojiSm: { fontSize: 26 },
    weatherHeroValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    weatherTemp: { color: C.text, fontSize: 36, fontFamily: 'Google Sans', letterSpacing: -1 },
    weatherTempSm: { color: C.text, fontSize: 26, fontFamily: 'Google Sans', letterSpacing: -0.5 },
    weatherCond: { color: C.textSub, fontSize: 14, marginTop: 2, fontFamily: 'Google Sans' },
    weatherFeels: { color: C.textMuted, fontSize: 12, marginTop: 1, fontFamily: 'Google Sans' },
    weatherGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    weatherAqiDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginVertical: 4,
    },
    aqiCard: {
        backgroundColor: C.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 14,
        gap: 16,
    },
    aqiTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aqiNumber: { color: C.text, fontSize: 40, fontFamily: 'Google Sans', letterSpacing: -1 },
    aqiLabel: { color: C.textMuted, fontSize: 12, marginTop: -4, fontFamily: 'Google Sans' },
    aqiBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    aqiBadgeText: { fontSize: 13, fontFamily: 'Google Sans' },
    aqiPollutant: { color: C.textMuted, fontSize: 11, fontFamily: 'Google Sans' },
    aqiPollutantVal: { fontSize: 14, fontFamily: 'Google Sans', marginTop: 2 },
    aqiBarContainer: { gap: 6 },
    aqiBarTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    aqiBarFill: { height: '100%', borderRadius: 4 },
    aqiBarLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    aqiBarLabel: { color: C.textMuted, fontSize: 9, fontFamily: 'Google Sans' },
    pollutantsRow: { flexDirection: 'row', gap: 8 },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: C.border,
        backgroundColor: C.bg,
    },
    minimizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
    },
    minimizeTxt: { color: C.textSub, fontSize: 13, fontFamily: 'Google Sans' },
    stopBtn: {
        flex: 1,
        backgroundColor: '#FF4213',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#FF4213',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    stopTxt: { color: '#fff', fontSize: 15, fontFamily: 'Google Sans' },
});

// Shared styles for sub-components
const sharedStyles = StyleSheet.create({
    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 4,
    },
    sectionIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cafeCard: {
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        width: 140,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    cafeImage: {
        width: 140,
        height: 140,
        resizeMode: 'cover',
    },
    cafeImagePlaceholder: {
        width: 140,
        height: 140,
        backgroundColor: '#3E2723',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cafeCardContent: {
        padding: 12,
        paddingTop: 10,
    },
    cafeName: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Google Sans',
        marginBottom: 2,
    },
    cafeRating: {
        color: '#FFD700',
        fontSize: 12,
        fontFamily: 'Google Sans',
    },
    sectionTitle: {
        color: '#888',
        fontSize: 11,
        fontFamily: 'Google Sans',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    statCard: {
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 14,
        gap: 4,
        borderWidth: 1,
        borderColor: C.border,
    },
    statLabel: { color: '#666', fontSize: 10, fontFamily: 'Google Sans', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontFamily: 'Google Sans', letterSpacing: -0.5 },
    statUnit: { color: '#555', fontSize: 10, fontFamily: 'Google Sans' },
    weatherStat: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    weatherStatLabel: { color: '#666', fontSize: 11, fontFamily: 'Google Sans' },
    weatherStatValue: { color: '#E0E0E0', fontSize: 15, fontFamily: 'Google Sans' },
    pollutantChip: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        gap: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    pollutantLabel: { color: '#666', fontSize: 10, fontFamily: 'Google Sans', textTransform: 'uppercase', letterSpacing: 0.5 },
    pollutantValue: { color: '#E0E0E0', fontSize: 14, fontFamily: 'Google Sans' },
    pollutantUnit: { color: '#555', fontSize: 9, fontFamily: 'Google Sans' },
    placeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 10,
        gap: 12,
    },
    placeIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeInfo: { flex: 1, gap: 4 },
    placeName: { color: '#E0E0E0', fontSize: 14, fontFamily: 'Google Sans' },
    placeMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    placeType: { color: '#666', fontSize: 11, fontFamily: 'Google Sans' },
    placeDot: { color: '#333', fontSize: 11, fontFamily: 'Google Sans' },
    placeDist: { color: '#666', fontSize: 11, fontFamily: 'Google Sans' },
    placeOpen: { fontSize: 11, fontFamily: 'Google Sans' },
    placeRight: { alignItems: 'center', gap: 6 },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255,215,64,0.1)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    ratingText: { color: '#FFD740', fontSize: 11, fontFamily: 'Google Sans' },
    directionsBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(57,226,155,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(57,226,155,0.18)',
    },
    blogCard: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 12,
    },
    blogThumb: { width: 90, height: 90 },
    blogContent: { flex: 1, padding: 12, gap: 5 },
    blogTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    blogTagText: { fontSize: 9, fontFamily: 'Google Sans', letterSpacing: 0.5 },
    blogTitle: { color: '#E0E0E0', fontSize: 13, fontFamily: 'Google Sans', lineHeight: 18 },
    blogMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    blogSource: { color: '#666', fontSize: 10, fontFamily: 'Google Sans' },
    blogDot: { color: '#444', fontSize: 10, fontFamily: 'Google Sans' },
    blogRead: { color: '#555', fontSize: 10, fontFamily: 'Google Sans' },
    openBtn: {
        padding: 12,
        justifyContent: 'flex-start',
    },
    videoCard: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 12,
        gap: 0,
    },
    videoThumbWrap: { width: 120, height: 90, position: 'relative' },
    videoThumb: { width: '100%', height: '100%' },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    playBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: { color: '#fff', fontSize: 10, fontFamily: 'Google Sans' },
    videoInfo: {
        flex: 1,
        padding: 12,
        gap: 4,
        justifyContent: 'center',
    },
    videoTitle: { color: '#E0E0E0', fontSize: 12, fontFamily: 'Google Sans', lineHeight: 17 },
    videoChannel: { color: '#39E29B', fontSize: 11, fontFamily: 'Google Sans', marginTop: 2 },
    videoViews: { color: '#555', fontSize: 10, fontFamily: 'Google Sans' },
});
