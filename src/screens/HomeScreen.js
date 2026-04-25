import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Platform, Alert, Animated, Easing, ActivityIndicator, Linking, Share, Dimensions, LayoutAnimation, UIManager, ScrollView, PanResponder } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from "@react-native-community/blur";
// Custom Icons
// Custom Icons
import SearchIcon from '../assets/icons/Outlined/search_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import HelpIcon from '../assets/icons/Outlined/help_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ShareIcon from '../assets/icons/Rounded Fill/share_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import HomeIcon from '../assets/icons/Outlined/home_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import HomeIconFilled from '../assets/icons/Rounded Fill/home_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import LibraryIcon from '../assets/icons/Outlined/library_books_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import LibraryIconFilled from '../assets/icons/Rounded Fill/library_books_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ScanIcon from '../assets/icons/Rounded Fill/qr_code_scanner_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WalletIcon from '../assets/icons/Outlined/wallet_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import BellIcon from '../assets/icons/Outlined/notifications_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz48.svg';
import StationIcon from '../assets/icons/Outlined/ev_station_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import CafeIcon from '../assets/icons/Outlined/local_cafe_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

import BoltOutlineIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import MenuIcon from '../assets/icons/Rounded Fill/menu_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import WarningIcon from '../assets/icons/Rounded Fill/warning_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

import mapStyle from '../assets/map style/mapStyle.json'

import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import { ChevronRight, ChevronDown, Coffee, Utensils, Menu } from 'lucide-react-native';
import { MOCK_CAFES } from '../data/mockCafes';
import placesService from '../services/placesService';

import LibraryScreen from './LibraryScreen';
import TestScreen from './TestScreen';
import SideMenu from '../components/SideMenu';
import StationCardSkeleton from '../components/StationCardSkeleton';
import { stationsApi, locationsApi, chargersApi, sessionApi, notificationApi, reviewsApi } from '../services/api';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';
import BackgroundLocationModal from '../components/BackgroundLocationModal';
import remoteConfig from '@react-native-firebase/remote-config'; // Firebase Remote Config

import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import { calculateDistance, getRawDistance } from '../utils/distanceUtils';
import { getConnectorIcon } from '../utils/connectorUtils';
import { parseMaintenanceDate, isTodayOrFuture } from '../utils/dateUtils';
import { shouldRespectMaintenance } from '../utils/devSettings';

const StarRating = ({ rating }) => {
    return (
        <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={{ color: star <= Math.floor(rating) ? '#FFD700' : '#555', fontSize: 14 }}>
                    ★
                </Text>
            ))}
        </View>
    );
};

// const mapStyle = [
//     {
//   "variant": "dark",
//   "styles": [
//     {
//       "id": "infrastructure",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "infrastructure.railwayTrack",
//       "geometry": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.roadNetwork",
//       "geometry": {
//         "visible": true
//       },
//       "label": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.transitStation",
//       "label": {
//         "visible": true
//       }
//     },
//     {
//       "id": "infrastructure.urbanArea",
//       "geometry": {
//         "visible": true
//       }
//     },
//     {
//       "id": "natural",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "pointOfInterest",
//       "geometry": {
//         "visible": false
//       },
//       "label": {
//         "visible": false
//       }
//     },
//     {
//       "id": "political",
//       "geometry": {
//         "visible": true
//       },
//       "label": {
//         "visible": true
//       }
//     }
//   ]
// }
// ];

export default function HomeScreenMain({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [currentTab, setCurrentTab] = useState('Home');
    const [region, setRegion] = useState({
        latitude: 18.5204, // Pune approx
        longitude: 73.8567,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
        userLocation: null
    });

    const [stations, setStations] = useState([]);
    const [allChargers, setAllChargers] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [nearbyAmenities, setNearbyAmenities] = useState([]);

    // Throttled location for distance calculation (optimization)
    const [throttledUserLocation, setThrottledUserLocation] = useState(null);
    const lastLocationUpdateRef = useRef(0);
    const LOCATION_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes
    const [isLoading, setIsLoading] = useState(true);
    const [activeResumeSession, setActiveResumeSession] = useState(null);
    const [liveEnergy, setLiveEnergy] = useState(0);
    const [liveDuration, setLiveDuration] = useState('00:00');
    const [liveProgress, setLiveProgress] = useState(0);
    const [isSessionCheckComplete, setIsSessionCheckComplete] = useState(false); // Validating session
    const [unreadCount, setUnreadCount] = useState(0); // State for notifications
    const [isLogoAnimEnabled, setIsLogoAnimEnabled] = useState(false); // Remote Config State regarding Logo Animation
    const [isMaintenance, setIsMaintenance] = useState(false); // Remote Config: maintenance_key
    const [maintenanceDate, setMaintenanceDate] = useState(''); // Remote Config: maintenance_date
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);
    const [showBgLocationModal, setShowBgLocationModal] = useState(false);
    const skeletonOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const bottomUiFade = useRef(new Animated.Value(0)).current; // For fade-in animation
    const navTabAnim = useRef(new Animated.Value(0)).current; // 0 = Home, 1 = Activity
    const mapRef = useRef(null);
    const qrGradientAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    // Draggable Overlay Logic (Mocking TestScreen behavior)
    const pan = useRef(new Animated.Value(300)).current; // Start lower for bounce-in effect
    const currentY = useRef(0);
    const sheetHeightRef = useRef(300); // Approximate mini-card height
    const hasBouncedIn = useRef(false);

    // Live Tracking & Polling
    useEffect(() => {
        let durationInterval;
        let energyInterval;

        const formatDuration = (startMs) => {
            const now = Date.now();
            const diffSec = Math.floor((now - startMs) / 1000);
            if (diffSec < 0) return '00:00';
            const m = Math.floor((diffSec % 3600) / 60);
            const s = diffSec % 60;
            const h = Math.floor(diffSec / 3600);
            
            if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const fetchEnergy = async () => {
            if (!activeResumeSession?.resumeSessionId) return;
            try {
                const energy = await sessionApi.getSessionEnergy(activeResumeSession.resumeSessionId);
                setLiveEnergy(energy);
                
                if (activeResumeSession.selectedKwh && activeResumeSession.selectedKwh > 0) {
                    let progress = (energy / activeResumeSession.selectedKwh) * 100;
                    if (progress > 100) progress = 100;
                    setLiveProgress(progress);
                } else {
                    setLiveProgress(0); // Indeterminate if no target set
                }
            } catch (e) {
                // Silent catch
            }
        };

        if (activeResumeSession?.startTime && activeResumeSession.status !== 'COMPLETED') {
            setLiveDuration(formatDuration(activeResumeSession.startTime));
            fetchEnergy();

            durationInterval = setInterval(() => {
                setLiveDuration(formatDuration(activeResumeSession.startTime));
            }, 1000);

            energyInterval = setInterval(() => {
                fetchEnergy();
            }, 10000); // User requested 10 secs min
        } else {
            setLiveDuration('00:00');
            setLiveEnergy(0);
            setLiveProgress(0);
        }

        return () => {
            if (durationInterval) clearInterval(durationInterval);
            if (energyInterval) clearInterval(energyInterval);
        };
    }, [activeResumeSession]);

    // Bounce in the session overlay when a session is found

    useEffect(() => {
        if (activeResumeSession && !hasBouncedIn.current) {
            hasBouncedIn.current = true;
            const COLLAPSED_Y = 100; // Visible Peek State
            Animated.spring(pan, {
                toValue: COLLAPSED_Y,
                useNativeDriver: false,
                speed: 10,
                bounciness: 6,
                delay: 500, // Small delay for smooth entry
            }).start();
        }
    }, [activeResumeSession]);

    useEffect(() => {
        const id = pan.addListener(({ value }) => {
            currentY.current = value;
        });
        return () => pan.removeListener(id);
    }, [pan]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (e, gs) => Math.abs(gs.dy) > 5,
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
                
                // Snap boundary settings
                const EXPANDED_Y = -100; // Pulled Up (Visible above nav)
                const COLLAPSED_Y = 100;   // Tucked behind nav
                let toValue = COLLAPSED_Y;

                // If swipe up (negative vy) or dragged more than halfway to expanded
                if (gestureState.vy < -0.5 || currentY.current < EXPANDED_Y * 0.5) {
                    toValue = EXPANDED_Y;
                } else {
                    toValue = COLLAPSED_Y;
                }

                Animated.spring(pan, {
                    toValue,
                    useNativeDriver: false,
                    speed: 12,
                    bounciness: 4,
                }).start();
            }
        })
    ).current;

    const toggleSession = (targetY) => {
        Animated.spring(pan, {
            toValue: targetY,
            useNativeDriver: false,
            speed: 14,
            bounciness: 4,
        }).start();
    };

    // Interpolations for dynamic UI elements
    const expandOpacity = pan.interpolate({
        inputRange: [-100, 0, 100],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp'
    });

    const collapseOpacity = pan.interpolate({
        inputRange: [-100, 0, 100],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp'
    });

    useEffect(() => {
        Animated.timing(qrGradientAnim, {
            toValue: 1,
            duration: 2000, // Slightly faster for a one-time 'in' effect
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, []);

    const qrRotate = qrGradientAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const ZOOM_THRESHOLD_MID = 0.5; // Switch from Pins to Mid-Clusters
    const ZOOM_THRESHOLD_CITY = 1.0; // Switch from Mid-Clusters to City Clusters

    // Unified Cluster Calculation
    const clusters = React.useMemo(() => {
        if (!stations.length) return { city: [], mid: [] };

        // 1. Group by City
        const cityGroups = {};
        stations.forEach(s => {
            const city = (s.city || 'Unknown').trim();
            if (!cityGroups[city]) cityGroups[city] = [];
            cityGroups[city].push(s);
        });

        // 2. Create City Clusters
        const cityClusters = Object.keys(cityGroups).map(city => {
            const group = cityGroups[city];
            const avgLat = group.reduce((sum, s) => sum + s.latitude, 0) / group.length;
            const avgLon = group.reduce((sum, s) => sum + s.longitude, 0) / group.length;
            return {
                id: `city-${city}`,
                latitude: avgLat,
                longitude: avgLon,
                count: group.length,
                name: city,
                type: 'city'
            };
        });

        // 3. Create Mid-Level Clusters (within cities potentially or simpler logic)
        // For now, let's just use simple grid clustering or just use city clusters.
        // Let's create 'Neighborhood' clusters for zoom level 12-14?
        // Simplifying: Mid-level clusters will be same as city for now or implementation skipped for brevity
        // and relying on map-clustering if we used a library.
        // Since we are manual, let's just return city clusters and we'll switch to pins.

        return { city: cityClusters, mid: [] };
    }, [stations]);

    // DERIVE NEAREST 10 STATIONS
    const nearestStations = React.useMemo(() => {
        if (!throttledUserLocation) return stations.slice(0, 10);

        return [...stations]
            .map(s => ({
                ...s,
                _distance: getRawDistance(
                    throttledUserLocation.latitude,
                    throttledUserLocation.longitude,
                    s.latitude,
                    s.longitude
                )
            }))
            .sort((a, b) => a._distance - b._distance)
            .slice(0, 10);
    }, [stations, throttledUserLocation]);

    // Auto-focus nearest station on first location fix
    const hasAutoFocusedRef = useRef(false);
    useEffect(() => {
        if (throttledUserLocation && nearestStations.length > 0 && !hasAutoFocusedRef.current && !route.params?.foundStationId) {
            hasAutoFocusedRef.current = true;
            const topStation = nearestStations[0];
            setSelectedStation(topStation);
            const newRegion = {
                latitude: Number(topStation.latitude),
                longitude: Number(topStation.longitude),
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1200);
        }
    }, [throttledUserLocation, nearestStations.length > 0]);


    // Moved Refs to Top Level to satisfy Rules of Hooks
    const isFetchingRef = useRef(false);
    const handleCardScrollRef = useRef(null);
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            handleCardScrollRef.current?.(viewableItems[0].item);
        }
    }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    // Creative/Dynamic Map Focus Logic for Card Scrolling
    const handleCardScroll = (station) => {
        if (selectedStation?.id === station.id) return;

        setSelectedStation(station); // Always highlight the marker

        // Check conditions:
        // 1. Is the map zoomed out too far (showing clusters instead of pins)?
        const isClustered = region.latitudeDelta > ZOOM_THRESHOLD_MID;

        // 2. Is station visible in viewport?
        const latDelta = region.latitudeDelta;
        const lngDelta = region.longitudeDelta;
        const latMin = region.latitude - (latDelta / 2) * 0.8;
        const latMax = region.latitude + (latDelta / 2) * 0.8;
        const lngMin = region.longitude - (lngDelta / 2) * 0.8;
        const lngMax = region.longitude + (lngDelta / 2) * 0.8;

        const isVisible = (
            station.latitude >= latMin &&
            station.latitude <= latMax &&
            station.longitude >= lngMin &&
            station.longitude <= lngMax
        );

        // Action:
        // If clustered -> Force Zoom In (to reveal pin)
        // If not clustered but off-screen -> Pan (keep zoom)
        if (isClustered || !isVisible) {
            const newRegion = {
                latitude: Number(station.latitude),
                longitude: Number(station.longitude),
                latitudeDelta: isClustered ? 0.04 : region.latitudeDelta, // Zoom in if clustered
                longitudeDelta: isClustered ? 0.04 : region.longitudeDelta,
            };
            mapRef.current?.animateToRegion(newRegion, 800);
            setRegion(newRegion);
        }
    };

    // Update ref effect
    useEffect(() => {
        handleCardScrollRef.current = handleCardScroll;
    });

    const getNearbyCafes = (station) => {
        if (!station) return [];

        // 1. Try direct city match
        let city = station.city;

        // 2. If no city, try to detect from location string
        if (!city && station.location) {
            if (station.location.includes('Pune')) city = 'Pune';
            else if (station.location.includes('Mumbai')) city = 'Mumbai';
            else if (station.location.includes('Bangalore') || station.location.includes('Bengaluru')) city = 'Bangalore';
            else if (station.location.includes('Delhi')) city = 'Delhi';
        }

        // 3. If still no city, try coordinate proximity (Fallback)
        if (!city) {
            const cities = {
                'Pune': { lat: 18.5204, lon: 73.8567 },
                'Mumbai': { lat: 19.0760, lon: 72.8777 },
                'Bangalore': { lat: 12.9716, lon: 77.5946 },
                'Delhi': { lat: 28.7041, lon: 77.1025 },
            };

            for (const [name, coords] of Object.entries(cities)) {
                const latDiff = Math.abs(station.latitude - coords.lat);
                const lonDiff = Math.abs(station.longitude - coords.lon);
                // Approx 30km radius check (0.3 degrees rough estimate)
                if (latDiff < 0.3 && lonDiff < 0.3) {
                    city = name;
                    break;
                }
            }
        }

        return city ? (MOCK_CAFES[city] || []) : [];
    };



    // Fetch Nearby Amenities
    useEffect(() => {
        if (selectedStation) {
            setNearbyAmenities([]);
            placesService.fetchNearbyAmenities(selectedStation.latitude, selectedStation.longitude)
                .then(items => {
                    if (items && items.length > 0) {
                        setNearbyAmenities(items);
                    } else {
                        console.log("Places API returned no results.");
                    }
                })
                .catch(err => {
                    console.log('Amenity fetch error:', err);
                });
        }
    }, [selectedStation]);


    // Fade In Bottom UI when ready
    useEffect(() => {
        if (!isLoading && isSessionCheckComplete) {
            Animated.timing(bottomUiFade, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false,
            }).start();
        }
    }, [isLoading, isSessionCheckComplete]);

    // Fetch Notification Count
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const user = await authService.getUser();
                if (user) {
                    const countData = await notificationApi.getUnreadCount(user.id || user.userId);
                    const count = typeof countData === 'object' ? countData.count : countData;
                    setUnreadCount(Number(count) || 0);
                }
            } catch (e) {
                // Silent fail
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (Platform.OS === 'android') {
            if (UIManager.setLayoutAnimationEnabledExperimental) {
                UIManager.setLayoutAnimationEnabledExperimental(true);
            }
        }
    }, []);

    // Show background location consent popup once (first time user reaches HomeScreen)
    useEffect(() => {
        const checkBgLocationConsent = async () => {
            try {

                const alreadyShown = await authService.hasBgLocationConsentShown();
                if (!alreadyShown) {
                    // Small delay so the map / home UI renders first
                    setTimeout(() => setShowBgLocationModal(true), 800);
                }
            } catch (e) {
                console.warn('BG location/Survey consent check failed:', e);
            }
        };
        checkBgLocationConsent();
    }, []);


    // NOTE: In-app update check is handled on SplashScreen (shows a custom non-dismissable dialog).


    // Fetch Remote Config for Logo Animation + Maintenance Key
    useEffect(() => {
        const fetchRemoteConfig = async () => {
            try {
                // Set default values
                const defaults = {
                    logo_anim_enabled: false,
                    maintenance_key: false,
                    maintenance_date: '',
                };
                await remoteConfig().setDefaults(defaults);

                // Configure for dev/debugging (0 interval = instant fetch)
                await remoteConfig().setConfigSettings({
                    minimumFetchIntervalMillis: 0,
                });

                // Fetch and Activate
                await remoteConfig().fetchAndActivate();

                // Get logo anim value
                const logoAnimEnabled = remoteConfig().getValue('logo_anim_enabled').asBoolean();
                setIsLogoAnimEnabled(logoAnimEnabled);

                // Get maintenance key & date (controlled by Developer Settings toggle)
                const respectMaintenance = await shouldRespectMaintenance();
                if (!respectMaintenance) {
                    setIsMaintenance(false);
                    setMaintenanceDate('');
                } else {
                    const maintenanceEnabled = remoteConfig().getValue('maintenance_key').asBoolean();
                    const maintDateStr = remoteConfig().getValue('maintenance_date').asString();
                    setIsMaintenance(maintenanceEnabled);
                    setMaintenanceDate(maintDateStr);
                }
            } catch (error) {
                console.error('Firebase Remote Config Failed:', error);

                // Fallback attempt: read whatever is available/cached
                try {
                    const fallbackLogo = remoteConfig().getValue('logo_anim_enabled').asBoolean();
                    setIsLogoAnimEnabled(fallbackLogo);
                    const respectMaint = await shouldRespectMaintenance();
                    if (respectMaint) {
                        const fallbackMaint = remoteConfig().getValue('maintenance_key').asBoolean();
                        const fallbackDate = remoteConfig().getValue('maintenance_date').asString();
                        setIsMaintenance(fallbackMaint);
                        setMaintenanceDate(fallbackDate);
                    }
                } catch (e) {
                    setIsLogoAnimEnabled(false);
                    setIsMaintenance(false);
                    setMaintenanceDate('');
                }
            }
        };

        fetchRemoteConfig();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            checkActiveSession();

            // Initial fetch - Only show loader if we have NO data
            // If data exists, fetch silently to prevent UI refresh
            fetchData(stations.length > 0);

            // Poll every 30 seconds for real-time updates (Reduced from 2s to safe load)
            const dataInterval = setInterval(() => {
                fetchData(true); // Silent update
            }, 30000);

            // Poll session every 10 seconds (Safety Check)
            const sessionInterval = setInterval(() => {
                checkActiveSession();
            }, 10000);

            return () => {
                clearInterval(dataInterval);
                clearInterval(sessionInterval);
            };
        }, [])
    );

    // Moved pulseAnim to top of component

    useEffect(() => {
        if (activeResumeSession) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: false, // Required for color interpolation
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(0); // Reset
        }
    }, [activeResumeSession]);



    const checkActiveSession = async () => {
        try {
            const user = await authService.getUser();
            if (user) {
                const userId = user.id || user.userId || user.email; // Fallback
                console.log("Checking active session for user:", userId);

                if (!userId) return;

                const activeSession = await sessionApi.getActiveSession(userId);

                if (activeSession && activeSession.sessionId) {

                    const resumeData = {
                        resumeSessionId: activeSession.sessionId,
                        chargerId: activeSession.chargerId,
                        boxId: activeSession.boxId,
                        stationName: activeSession.stationName || 'Unknown Station',
                        startTime: activeSession.startTime,
                        selectedKwh: activeSession.selectedKwh, // Critical for % calc
                        planId: activeSession.planId,
                        rate: activeSession.rate,
                        connectorType: activeSession.connectorType,
                        chargerType: activeSession.chargerType
                    };

                    // If user manually minimized or navigated back, show Overlay
                    setActiveResumeSession(resumeData);
                } else {
                    setActiveResumeSession(null);
                    hasBouncedIn.current = false; // Reset if session ends
                }
            }
        } catch (e) {
            console.log("No active session to resume or error checking:", e.message);
        } finally {
            setIsSessionCheckComplete(true);
        }
    };

    // Handle Station Found from QR Scanner
    useEffect(() => {
        if (route.params?.foundStationId && stations.length > 0) {
            const stationId = route.params.foundStationId;
            const station = stations.find(s => s.id === stationId);
            if (station) {
                // Determine if specific charger was requested (optional, for future)
                // const chargerId = route.params.foundChargerId;

                setSelectedStation(station);
                const newRegion = {
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 1000);

                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 1000);

                const chargerId = route.params.foundChargerId;
                const charger = allChargers.find(c => c.id === chargerId) || allChargers.find(c => c.stationId === station.id);

                if (charger) {
                    navigation.navigate('Config', {
                        stationId: station.id,
                        stationName: station.name || station.stationName,
                        chargerId: charger.id,
                        boxId: charger.ocppId || charger.boxId,
                        chargerType: charger.chargerType || charger.type,
                        maxPower: charger.maxPower || charger.power,
                        connectorType: charger.connectorType,
                        status: charger.status,
                        latitude: station.latitude,
                        longitude: station.longitude,
                        rate: charger.rate || station.rate || '0'
                    });
                } else {
                    // Fallback to details if no specific charger found
                    navigation.navigate('StationDetails', {
                        station: station,
                        chargers: allChargers,
                        nearbyCafes: nearbyAmenities
                    });
                }

                // Reset params so it doesn't trigger again
                navigation.setParams({ foundStationId: null, foundChargerId: null });
            }
        }
    }, [route.params?.foundStationId, stations]);



    useEffect(() => {
        if (!isLoading && isSessionCheckComplete) {
            Animated.parallel([
                Animated.timing(skeletonOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: false,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: false,
                }),
            ]).start(() => setShowSkeleton(false));
        } else if (isLoading || !isSessionCheckComplete) {
            setShowSkeleton(true);
            skeletonOpacity.setValue(1);
            contentOpacity.setValue(0);
        }
    }, [isLoading, isSessionCheckComplete]);

    const handleTabChange = (tab) => {
        // User Fix: Dismiss Bottom Sheet automatically when Home is clicked
        // if (tab === 'Home') { setIsSheetVisible(false); } // Logic removed as Sheet doesn't exist

        // Manual Animated control
        setCurrentTab(tab);

        // Animate Tab highlight/position
        Animated.timing(navTabAnim, {
            toValue: tab === 'Home' ? 0 : 1,
            duration: 250,
            useNativeDriver: false,
        }).start();

        // Animate Overlay Transition: Slide bounce out when not Home, bounce in when Home
        const COLLAPSED_Y = 100;
        const OUT_Y = 300;
        
        Animated.spring(pan, {
            toValue: tab === 'Home' ? COLLAPSED_Y : OUT_Y,
            useNativeDriver: false,
            speed: 12,
            bounciness: 4,
        }).start();
    };

    /**
     * Handle Tab Switching via External Navigation (e.g. SideMenu)
     */
    useEffect(() => {
        if (route.params?.tab) {
            handleTabChange(route.params.tab);
            navigation.setParams({ tab: undefined }); // Clear param
        }
    }, [route.params?.tab]);

    const fetchData = async (silent = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            if (!silent && stations.length === 0) setIsLoading(true);
            // console.log("Fetching real data from backend..."); // Reduce log spam on polling

            const token = await authService.getToken();
            if (!token) {
                console.warn("No auth token found, skipping API calls and using fallback.");
                throw new Error("No auth token");
            }

            const [stationsData, locationsData, chargersData] = await Promise.all([
                stationsApi.getAllStations().catch(err => {
                    console.warn("Failed to fetch stations:", err);
                    return null;
                }),
                locationsApi.getAllLocations().catch(err => {
                    console.warn("Failed to fetch locations:", err);
                    return [];
                }),
                chargersApi.getAllChargers().catch(err => {
                    console.warn("Failed to fetch chargers:", err);
                    return [];
                })
            ]);

            if (!stationsData) throw new Error("Stations API failed");

            const validStations = Array.isArray(stationsData) ? stationsData : (stationsData?.stations || []);
            const validLocations = Array.isArray(locationsData) ? locationsData : (locationsData?.locations || []);
            const validChargers = Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []);

            setAllChargers(validChargers);

            const locationsMap = new Map();
            if (Array.isArray(validLocations)) {
                validLocations.forEach(loc => locationsMap.set(loc.id, loc));
            }

            const mergedStations = validStations.map((st, index) => {
                const loc = locationsMap.get(st.locationId) ||
                    (st.locationName ? Array.from(locationsMap.values()).find(l => l.name === st.locationName) : null);

                let lat = 18.5204;
                let lng = 73.8567;

                if (loc && loc.latitude && loc.longitude) {
                    lat = parseFloat(loc.latitude);
                    lng = parseFloat(loc.longitude);
                } else if (st.latitude && st.longitude) {
                    lat = parseFloat(st.latitude);
                    lng = parseFloat(st.longitude);
                } else {
                    lat = 18.5204 + (index * 0.01);
                    lng = 73.8567 + (index * 0.005);
                }

                // Infer Type
                let type = 'STATION';
                if ((st.name && st.name.toLowerCase().includes('cafe')) ||
                    (st.location && st.location.toLowerCase().includes('cafe'))) {
                    type = 'CAFE';
                }

                return {
                    ...st,
                    latitude: lat,
                    longitude: lng,
                    location: loc ? `${loc.address || ''}, ${loc.city || ''}` : (st.locationName || 'Unknown Location'),
                    city: loc?.city || 'Unknown',
                    image_url: st.imageUrl || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                    chargerId: st.id ? `STN-${st.id}` : 'UNKNOWN',
                    chargerType: 'Fast',
                    type: type
                };
            });

            // Fetch dynamic ratings
            const stationsWithRatings = await Promise.all(mergedStations.map(async (st) => {
                if (st.type === 'CAFE') return st;
                try {
                    const summary = await reviewsApi.getStationRatingSummary(st.id);
                    if (summary) {
                        return {
                            ...st,
                            rating: summary.averageRating ? Number(summary.averageRating).toFixed(1) : (st.rating || '4.5'),
                            reviewCount: summary.totalReviews || 0
                        };
                    }
                    return st;
                } catch (e) {
                    return st;
                }
            }));

            if (stationsWithRatings.length === 0) throw new Error("No stations found");

            setStations(stationsWithRatings);

            // Only update Map Region on INITIAL LOAD (when stations were empty)
            if (stations.length === 0 && stationsWithRatings.length > 0) {
                const initialRegion = {
                    latitude: stationsWithRatings[0].latitude,
                    longitude: stationsWithRatings[0].longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                };
                setRegion(initialRegion);

                // Animate only once
                setTimeout(() => {
                    mapRef.current?.animateToRegion(initialRegion, 1000);
                }, 500);

                setSelectedStation(stationsWithRatings[0]);
            } else if (selectedStation) {
                // Update currently selected station with new data (to show new rating immediately)
                const updated = stationsWithRatings.find(s => s.id === selectedStation.id);
                if (updated) setSelectedStation(updated);
            }

        } catch (error) {
            console.error("Fetching real data failed:", error);
            setStations([]);
            setSelectedStation(null);
            setAllChargers([]);
        } finally {
            isFetchingRef.current = false;
            setIsLoading(false);
        }
    };

    const handleStationPress = (station) => {
        setSelectedStation(station);
        const newRegion = {
            latitude: Number(station.latitude),
            longitude: Number(station.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
    };

    // Creative/Dynamic Map Focus Logic for Card Scrolling
    // Moved handleCardScroll to top-level to fix React Hook rules



    const handleCardPress = (station) => {
        const targetStation = station || selectedStation;
        if (targetStation) {
            navigation.navigate('StationDetails', {
                station: targetStation,
                chargers: allChargers,
                nearbyCafes: nearbyAmenities
            });
        }
    };

    const handleDirections = () => {
        if (!selectedStation) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${selectedStation.latitude},${selectedStation.longitude}`;
        const label = selectedStation.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this charging station: ${selectedStation?.name || 'Bentork Station'}`,
            });
        } catch (error) {
            showAlert("Error", error.message);
        }
    };

    const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
    const bottomNavHeight = 80 + (Platform.OS === 'ios' ? safeBottom / 2 : safeBottom);

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Header (Solid Matte Black) */}
            <View style={styles.headerContainer}>
                {/* <LinearGradient
                    colors={['#212121ff', '#212121ff', 'hsla(0, 0%, 13%, 0.00)']}
                    locations={[0, 0.6, 1]}
                    style={StyleSheet.absoluteFill}
                /> */}
                <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
                    <View style={styles.headerContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => setIsSideMenuVisible(true)} style={{ marginRight: 15, padding: 5 }}>
                                <MenuIcon width={28} height={28} fill={Colors.white} />
                            </TouchableOpacity>

                            {isLogoAnimEnabled ? (
                                <LottieView
                                    source={require('../assets/lottie/bentork_anim.json')}
                                    autoPlay
                                    loop
                                    style={{ width: 100, height: 40, borderWidth: 1, borderColor: '#dededeff', borderRadius: 8 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <Image
                                    source={require('../assets/images/logo.png')}
                                    style={{ width: 95, height: 35, borderRadius: 8 }}
                                    resizeMode="contain"
                                    tintColor="#ffffffff"
                                />
                            )}
                        </View>
                        <View style={styles.headerIcons}>
                            {activeResumeSession && (
                                <TouchableOpacity
                                    style={[styles.iconBtn, { backgroundColor: 'rgba(0, 230, 118, 0.1)', padding: 10, borderRadius: 12, marginRight: 0 }]}
                                    onPress={() => navigation.navigate('ActiveSessions')}
                                >
                                    <View style={styles.activeIndicatorContainer}>
                                        <BoltIcon width={22} height={22} fill={Colors.statusGreen} />
                                        <View style={styles.activePulseDot} />
                                    </View>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
                                <SearchIcon width={24} height={24} fill={Colors.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notification')}>
                                <BellIcon width={24} height={24} fill={Colors.white} />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>


            {/* Main Content Area (Map + Activity) */}
            <View style={{ flex: 1, position: 'relative' }}>

                {/* Map (Persisted) */}
                <Animated.View
                    pointerEvents={currentTab === 'Home' ? 'auto' : 'none'}
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            opacity: navTabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0]
                            })
                        }
                    ]}
                >
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={mapStyle}
                        mapType="standard"
                        style={styles.map}
                        initialRegion={region}
                        showsTraffic={false}
                        showsIndoors={false}
                        onRegionChangeComplete={(r) => setRegion(prev => ({ ...r, userLocation: prev.userLocation }))}
                    >
                        {(() => {
                            if (isMaintenance) return null;

                            if (region.latitudeDelta > ZOOM_THRESHOLD_CITY) {
                                // STAGE 3: CITY CLUSTERS
                                return clusters.city.map((cluster, index) => (
                                    <Marker
                                        key={`cluster_city_${index}`}
                                        coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                                        onPress={() => {
                                            const newRegion = {
                                                latitude: cluster.latitude,
                                                longitude: cluster.longitude,
                                                latitudeDelta: 0.15,
                                                longitudeDelta: 0.15,
                                            };
                                            setRegion(newRegion);
                                            mapRef.current?.animateToRegion(newRegion, 1000);
                                        }}
                                        zIndex={100}
                                        tracksViewChanges={false}
                                    >
                                        <View style={styles.clusterContainer}>
                                            <Text style={styles.clusterText}>{cluster.count}</Text>
                                            <Text style={{ color: Colors.matteBlack, fontSize: 10, fontWeight: '600' }}>{cluster.name}</Text>
                                        </View>
                                    </Marker>
                                ));

                            } else if (region.latitudeDelta > ZOOM_THRESHOLD_MID) {
                                // STAGE 2: MID CLUSTERS (Neighborhood)
                                // Currently, mid clusters are not implemented in the new clustering logic.
                                // Fallback to showing individual pins or city clusters if no mid clusters.
                                return clusters.city.map((cluster, index) => (
                                    <Marker
                                        key={`cluster_mid_${index}`}
                                        coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                                        onPress={() => {
                                            const newRegion = {
                                                latitude: cluster.latitude,
                                                longitude: cluster.longitude,
                                                latitudeDelta: 0.04,
                                                longitudeDelta: 0.04,
                                            };
                                            setRegion(newRegion);
                                            mapRef.current?.animateToRegion(newRegion, 800);
                                        }}
                                        zIndex={90}
                                        tracksViewChanges={false}
                                    >
                                        <View style={styles.midClusterContainer}>
                                            <Text style={styles.midClusterText}>{cluster.count}</Text>
                                        </View>
                                    </Marker>
                                ));

                            } else {
                                // STAGE 1: INDIVIDUAL PINS
                                return stations.map((station, index) => {
                                    const isSelected = String(selectedStation?.id) === String(station.id);
                                    let MarkerIcon = BoltIcon;
                                    let baseColor = Colors.matteBlack;

                                    if (station.type === 'CAFE') {
                                        MarkerIcon = CafeIcon;
                                        baseColor = "#FF9800";
                                    }

                                    // Active Pin: Background White, Icon Black
                                    // Inactive Pin: Background MatteBlack, Border White (for contrast), Icon White
                                    const bubbleColor = isSelected ? Colors.white : Colors.matteBlack;
                                    const iconFill = isSelected ? Colors.matteBlack : Colors.white;
                                    const borderWidth = isSelected ? 0 : 2;
                                    const borderColor = isSelected ? 'transparent' : Colors.white;

                                    return (
                                        <Marker
                                            key={`station_${station.id}_${index}_${isSelected ? 'sel' : 'norm'}`}
                                            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
                                            onPress={() => handleStationPress(station)}
                                            zIndex={isSelected ? 20 : 10}
                                            tracksViewChanges={false}
                                        >
                                            <View style={[styles.markerContainer, { transform: [{ scale: isSelected ? 1.1 : 1 }] }]}>
                                                <View style={[styles.markerBubble, { backgroundColor: bubbleColor, borderWidth: borderWidth, borderColor: borderColor }]}>
                                                    <MarkerIcon
                                                        width={22}
                                                        height={22}
                                                        fill={iconFill}
                                                    />
                                                </View>
                                                <View style={[styles.markerArrow, { borderTopColor: isSelected ? bubbleColor : borderColor, marginTop: -1 }]} />
                                            </View>
                                        </Marker>
                                    );
                                });
                            }
                        })()}
                    </MapView>
                </Animated.View >

                {/* Floating Controls (Home Only) - Still absolute over Map */}
                < Animated.View
                    pointerEvents={currentTab === 'Home' ? 'box-none' : 'none'}
                    style={
                        [
                            StyleSheet.absoluteFill,
                            {
                                zIndex: 20,
                                opacity: navTabAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 0]
                                })
                            }
                        ]}
                >
                    {/* Stations Horizontal Scroll List */}
                    {
                        !activeResumeSession && !isLoading && !isMaintenance && (
                            <Animated.FlatList
                                data={nearestStations}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                snapToInterval={Dimensions.get('window').width * 0.95 + 16}
                                decelerationRate="fast"
                                contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - (Dimensions.get('window').width * 0.95)) / 2 }}
                                keyExtractor={(item, index) => `${item.id}_${index}`}
                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                renderItem={({ item }) => {
                                    const stationChargers = allChargers.filter(c => c.stationId === item.id);
                                    const availableChargers = stationChargers.filter(c => c.status === 'Available' || (!c.occupied && c.availability)).length;

                                    // Enhanced Grouping Logic
                                    const connectorGroups = {};
                                    stationChargers.forEach(c => {
                                        // Normalize Connector Type
                                        let connType = c.connectorType || c.connector_type;
                                        const chgTypeRaw = (c.chargerType || c.type || '').toString();

                                        if (!connType) {
                                            if (chgTypeRaw.includes('CCS')) connType = 'CCS 2';
                                            else if (chgTypeRaw.includes('Type 2')) connType = 'Type 2';
                                            else if (chgTypeRaw.includes('AC')) connType = 'Type 2'; // Fallback
                                            else connType = 'Unknown';
                                        }

                                        // Normalize Current Type (AC/DC)
                                        let currentType = 'DC';
                                        if (chgTypeRaw.includes('AC') || (connType && (connType.includes('Type 2') || connType.includes('3-Pin')))) {
                                            currentType = 'AC';
                                        }

                                        const power = c.rate || c.max_power || 0;
                                        const key = `${connType}-${currentType}`;

                                        if (!connectorGroups[key]) {
                                            connectorGroups[key] = { connectorType: connType, currentType, power, total: 0, available: 0, busy: 0 };
                                        }
                                        connectorGroups[key].total += 1;

                                        const isAvailable = c.status === 'Available' || (!c.occupied && c.availability);
                                        if (isAvailable) connectorGroups[key].available += 1;
                                        else if (c.status === 'Busy' || c.occupied === true) connectorGroups[key].busy += 1;
                                    });

                                    const groupedConnectors = Object.values(connectorGroups);

                                    return (
                                        <TouchableOpacity
                                            style={{
                                                width: Dimensions.get('window').width * 0.95,
                                                marginRight: 16,
                                                backgroundColor: 'transparent',
                                                borderRadius: 24,
                                            }}
                                            activeOpacity={0.9}
                                            onPress={() => handleCardPress(item)}
                                        >
                                            <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: Colors.matteBlack, zIndex: 1 }}>
                                                {/* <BlurView
                                                style={StyleSheet.absoluteFill}
                                                blurType="dark"
                                                blurAmount={10}
                                                reducedTransparencyFallbackColor="rgba(30,30,30,0.8)"
                                            /> */}
                                                <View style={{ padding: 18 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                        <View style={{ flex: 1, paddingRight: 12 }}>
                                                            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>{item.name}</Text>
                                                            <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }} numberOfLines={2}>{item.location}</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 }}>
                                                                    <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: 'bold', marginRight: 2 }}>★ {item.rating || '4.5'}</Text>
                                                                </View>
                                                                <Text style={{ color: availableChargers > 0 ? Colors.statusGreen : Colors.statusRed, fontWeight: '600', fontSize: 13 }}>{availableChargers > 0 ? 'Available' : 'Busy'}</Text>
                                                                <Text style={{ color: '#555', marginHorizontal: 8 }}>|</Text>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                    <NavigationIcon width={14} height={14} fill={Colors.white} style={{ marginRight: 4 }} />
                                                                    <Text style={{ color: Colors.white, fontSize: 13, fontWeight: '600' }}>
                                                                        {throttledUserLocation ? calculateDistance(
                                                                            throttledUserLocation.latitude,
                                                                            throttledUserLocation.longitude,
                                                                            item.latitude,
                                                                            item.longitude
                                                                        ) : '--'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }} style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: '#333' }} />
                                                    </View>
                                                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 }} />
                                                    <View>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            {groupedConnectors.length > 0 ? (
                                                                groupedConnectors.map((group, gIndex) => {
                                                                    const iconColor = group.available > 0 ? Colors.white : (group.busy > 0 ? Colors.statusOrange : '#aaa');
                                                                    const isOffline = group.available === 0 && group.busy === 0;

                                                                    return (
                                                                        <View key={gIndex} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, marginBottom: 4, opacity: isOffline ? 0.4 : 1 }}>
                                                                            <Image
                                                                                source={getConnectorIcon(group.connectorType)}
                                                                                style={{ width: 20, height: 20, marginRight: 4, tintColor: iconColor }}
                                                                                resizeMode="contain"
                                                                            />
                                                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{group.connectorType} • {group.currentType}</Text>
                                                                        </View>
                                                                    );
                                                                })
                                                            ) : (<Text style={{ color: '#777', fontSize: 12 }}>No Connectors</Text>)}
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                }}
                                style={{ position: 'absolute', bottom: bottomNavHeight + 10, left: 0, right: 0, zIndex: 10, opacity: contentOpacity }}
                            />
                        )
                    }


                </Animated.View >

                {/* Activity Screen (Persisted) */}
                < Animated.View
                    pointerEvents={currentTab === 'Activity' ? 'auto' : 'none'}
                    style={[{ flex: 1, paddingTop: 100, opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), ...StyleSheet.absoluteFillObject }]}
                >
                    <LibraryScreen navigation={navigation} />
                </Animated.View >

            </View >

            {/* Bottom Nav */}
            < View style={[styles.bottomNav, { paddingBottom: safeBottom, height: bottomNavHeight }]} >
                <TouchableOpacity style={styles.navItem} onPress={() => handleTabChange('Home')}>
                    <Animated.View style={[styles.navPill, { width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [64, 30] }), backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', 'rgba(30,30,30,0)'] }) }]}>
                        <View style={styles.iconNavContainer}>
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}><HomeIconFilled width={24} height={24} fill={Colors.matteBlack} /></Animated.View>
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}><HomeIcon width={24} height={24} fill={Colors.white} /></Animated.View>
                        </View>
                    </Animated.View>
                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.centerNavBtnContainer} 
                    onPress={() => {
                        if (isMaintenance) {
                            showAlert("Maintenance in Progress", "QR Scanning is currently unavailable.");
                        } else {
                            navigation.navigate('QRScanner', { stations, allChargers });
                        }
                    }}
                >
                    <View style={[styles.centerNavBtn, { overflow: 'hidden' }]}>
                        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: qrRotate }, { scale: 1.5 }] }]}>
                            <LinearGradient
                                colors={Colors.primaryGradient}
                                locations={[0.6, 1]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                        <ScanIcon width={32} height={32} fill={Colors.matteBlack} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => handleTabChange('Activity')}>
                    <Animated.View style={[styles.navPill, { width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 70] }), backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(30,30,30,0)', '#ffffff'] }) }]}>
                        <View style={styles.iconNavContainer}>
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}><LibraryIcon width={24} height={24} fill={Colors.white} /></Animated.View>
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}><LibraryIconFilled width={24} height={24} fill={Colors.matteBlack} /></Animated.View>
                        </View>
                    </Animated.View>
                    <Text style={currentTab === 'Activity' ? styles.navTextActive : styles.navText}>Activity</Text>
                </TouchableOpacity>
            </View >



            <SideMenu
                visible={isSideMenuVisible}
                onClose={() => setIsSideMenuVisible(false)}
                navigation={navigation}
            />

            {/* Background Location Consent – shown once on first HomeScreen visit */}
            <BackgroundLocationModal
                visible={showBgLocationModal}
                onDone={() => setShowBgLocationModal(false)}
            />

            {/* Backdrop Dimmer for Draggable Overlay */}
            {activeResumeSession && (
                <Animated.View 
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { 
                        backgroundColor: '#000', 
                        zIndex: 90, // Just below the card
                        opacity: pan.interpolate({
                            inputRange: [0, 180],
                            outputRange: [0.1, 0], 
                            extrapolate: 'clamp'
                        })
                    }]} 
                />
            )}

            {/* Active Session Overlay (Mock Draggable Prototype) */}
            {
                activeResumeSession && (
                    <Animated.View 
                        style={[styles.mockOverlayWrapper, { 
                            bottom: 0, 
                            transform: [{ translateY: pan }]
                        }]} 
                        pointerEvents="box-none"
                    >
                        <View style={styles.mockOverlayCard} onLayout={(e) => { sheetHeightRef.current = e.nativeEvent.layout.height; }}>
                            <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
                                <View style={styles.dragBar} />
                            </View>

                            <Animated.View style={[styles.mockHeader, { 
                                justifyContent: 'space-between',
                                marginTop: pan.interpolate({
                                    inputRange: [-100, 0, 100],
                                    outputRange: [0, 10, 18],
                                    extrapolate: 'clamp'
                                }),
                                marginBottom: pan.interpolate({
                                    inputRange: [-100, 0, 100],
                                    outputRange: [0, 20, 42],
                                    extrapolate: 'clamp'
                                }),
                            }]}>
                                <Animated.View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'flex-start', 
                                    gap: 8,
                                    opacity: collapseOpacity,
                                    height: pan.interpolate({
                                        inputRange: [-100, 0, 100],
                                        outputRange: [0, 20, 42],
                                        extrapolate: 'clamp'
                                    }),
                                    overflow: 'hidden'
                                }}>
                                    <View style={[styles.mockDot, { marginTop: 6, backgroundColor: Colors.statusGreen }]} />
                                    <View>
                                        <Text style={styles.mockTitle}>{activeResumeSession.stationName || 'Charging Station'}</Text>
                                        <Text style={[styles.mockTitle, { color: '#888', marginTop: 2, fontSize: 11 }]}>
                                            Status: {activeResumeSession.status || 'Active'}
                                        </Text>
                                    </View>
                                </Animated.View>
                                <Animated.View style={{ opacity: collapseOpacity }}>
                                    <TouchableOpacity 
                                        style={{ padding: 4 }}
                                        onPress={() => toggleSession(-100)}
                                    >
                                        <ChevronRight size={20} color="#999" />
                                    </TouchableOpacity>
                                </Animated.View>
                            </Animated.View>

                            <View style={styles.mockStatsRow}>
                                <View>
                                    <Text style={styles.mockLabel}>Energy</Text>
                                    <Text style={styles.mockValue}>{liveEnergy.toFixed(2)} <Text style={styles.mockUnit}>kWh</Text></Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.mockLabel}>Duration</Text>
                                    <Text style={styles.mockValue}>{liveDuration}</Text>
                                </View>
                            </View>

                            <View style={styles.mockProgressTrack}>
                                <View style={[styles.mockProgressFill, { width: `${liveProgress}%` }]} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 18 }}>
                                <Text style={styles.mockProgressInfo}>
                                    {activeResumeSession.selectedKwh ? `${Math.floor(liveProgress)}% Charged` : 'Continuous Charging'}
                                </Text>
                                <Text style={styles.mockProgressDetail}>
                                    {activeResumeSession.connectorType || 'Unknown'} • {activeResumeSession.chargerType || 'Fast'}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Animated.View style={{ opacity: expandOpacity, width: expandOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 48] }), overflow: 'hidden' }}>
                                    <TouchableOpacity 
                                        style={[styles.mockActionBtn, { width: 48, paddingHorizontal: 0 }]}
                                        onPress={() => toggleSession(100)}
                                    >
                                        <ChevronDown size={22} color="#000" />
                                    </TouchableOpacity>
                                </Animated.View>

                                <TouchableOpacity 
                                    style={[styles.mockActionBtn, { flex: 1 }]}
                                    onPress={() => navigation.navigate('Session', activeResumeSession)}
                                >
                                    <Text style={styles.mockActionBtnText}>View Session Details</Text>
                                </TouchableOpacity>

                                <Animated.View style={{ opacity: collapseOpacity, width: collapseOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 48] }), overflow: 'hidden' }}>
                                    <TouchableOpacity 
                                        style={[styles.mockActionBtn, { width: 48, paddingHorizontal: 0 }]}
                                        onPress={() => toggleSession(-100)}
                                    >
                                        <ChevronRight size={22} color="#000" />
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>
                    </Animated.View>
                )
            }
            {/* Maintenance Banner – Positioned high but below top bar */}
            {currentTab === 'Home' && !isSideMenuVisible && (() => {
                const mDate = parseMaintenanceDate(maintenanceDate);
                const isUpcoming = mDate && isTodayOrFuture(mDate) && !isMaintenance;
                const showBanner = isMaintenance || isUpcoming;

                if (!showBanner) return null;

                const isOngoing = isMaintenance; 
                const title = isOngoing ? "Ongoing Maintenance" : "Upcoming Maintenance Break";
                const subtitle = isOngoing 
                    ? "Some services are temporarily unavailable. We appreciate your patience."
                    : `On ${maintenanceDate}, some services will be unavailable. Please plan accordingly.`;

                return (
                    <View style={styles.maintenanceBanner}>
                        <View style={styles.maintenanceBannerIcon}>
                            <WarningIcon width={20} height={20} fill="#FFAB00" />
                        </View>
                        <View style={styles.maintenanceBannerContent}>
                            <Text style={styles.maintenanceBannerTitle}>{title}</Text>
                            <Text style={styles.maintenanceBannerSubtitle}>{subtitle}</Text>
                        </View>
                    </View>
                );
            })()}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    map: {
        ...StyleSheet.absoluteFill,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.matteBlack, // Set to solid as requested
        paddingHorizontal: 20,
        paddingBottom: 15, // Reduced padding as gradient fade is gone
        zIndex: 10,
        elevation: 0,
    },
    maintenanceBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 95, // Adjust to float below the solid header
        left: 10,
        right: 10,
        zIndex: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.matteBlack,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#444',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    maintenanceBannerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 171, 0, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    maintenanceBannerContent: {
        flex: 1,
    },
    maintenanceBannerTitle: {
        color: '#ffda53ff',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    maintenanceBannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 11,
        lineHeight: 15,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 0,
    },
    logo: {
        width: 100,
        height: 50,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        marginLeft: 20,
    },
    // Mock Overlay Styles
    mockOverlayWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 1,
        zIndex: 100, // Above Map, Behind Navbar (200)
    },
    mockOverlayCard: {
        backgroundColor: Colors.matteBlack,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    mockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 18,
        marginBottom: 42,
        gap: 6,
    },
    mockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.statusGreen,
    },
    mockTitle: {
        color: '#999',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    mockStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    mockLabel: {
        color: '#777',
        fontSize: 13,
        fontWeight: '600',
    },
    mockValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 4,
    },
    mockUnit: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    mockProgressTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    mockProgressFill: {
        height: '100%',
        backgroundColor: Colors.statusGreen,
        borderRadius: 4,
    },
    mockProgressInfo: {
        color: Colors.statusGreen,
        fontSize: 13,
        fontWeight: '700',
    },
    mockProgressDetail: {
        color: '#555',
        fontSize: 12,
        fontWeight: '600',
    },
    mockActionBtn: {
        backgroundColor: '#fff',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mockActionBtnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 15,
    },
    dragHandleArea: {
        width: '100%',
        height: 30, // Large touch target
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -10, // Pull it into the padding
    },
    dragBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#444',
    },
    badge: {
        position: 'absolute',
        right: -6,
        top: -6,
        backgroundColor: Colors.statusRed,
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: Colors.matteBlack,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    zoomControls: {
        position: 'absolute',
        bottom: 380,
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 25,
        width: 50,
        alignItems: 'center',
        paddingVertical: 5,
        elevation: 5,
    },
    zoomBtn: {
        padding: 10,
    },
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: '#ddd',
    },
    helpButton: {
        position: 'absolute',
        bottom: 380,
        right: 20,
        backgroundColor: '#212121',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
    },
    markerBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    markerArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
        elevation: 6,
    },
    // Station Card
    cardContainer: {
        position: 'absolute',
        bottom: 90,
        left: 5,
        right: 15,
        backgroundColor: Colors.matteBlack,
        opacity: 0.1,
        borderRadius: 20,
        padding: 15,
        elevation: 0,
        borderWidth: 1,
        borderColor: Colors.matteBlack,
        zIndex: 10,
    },
    cardContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leftColumn: {
        flex: 1,
        paddingRight: 15,
    },
    rightColumn: {
        width: 110,
        alignItems: 'center',
    },
    stationName: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    ratingText: {
        color: '#fff',
        marginRight: 5,
        fontWeight: 'bold',
    },
    addressText: {
        color: '#aaa',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10,
    },
    statusText: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    connectorRow: {
        marginTop: 5,
    },
    connectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    connectorText: {
        color: Colors.white,
        fontSize: 12,
        marginRight: 10,
    },
    totalText: {
        color: '#777',
        fontSize: 12,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    imageContainerNew: {
        width: 110,
        height: 110,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#333',
        marginLeft: 10,
    },
    stationImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)'
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 5,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionIconCircle: {
        backgroundColor: '#fff',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
    },

    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E1E1E',
        height: 80,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#333',
        zIndex: 200, // On Top of Everything
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70, // Slightly wider to accommodate pill expansion
    },
    navPill: {
        borderRadius: 20,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
        overflow: 'hidden',
    },
    navTextActive: {
        color: Colors.white,
        fontSize: 12,
        marginTop: 2,
    },
    navText: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    centerNavBtnContainer: {
        top: -10,
        alignItems: 'center',
    },
    centerNavBtn: {
        backgroundColor: '#fff',
        width: 65,
        height: 65,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    // Session Snackbar
    sessionSnackbar: {
        position: 'absolute',
        bottom: 100, // Positioned well above the bottom nav
        left: 20,
        right: 20,
        backgroundColor: 'rgba(30, 30, 30, 1)',
        borderRadius: 16,
        // padding: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        // elevation: 10, // Increased elevation
        // shadowColor: '#00e677',
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.3,
        // shadowRadius: 8,
        // borderWidth: 1, // Add border to make it pop
        // borderColor: '#00E676',
        zIndex: 9999, // Ensure it is on top of everything
    },
    snackbarIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.statusGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    snackbarContent: {
        flex: 1,
    },
    snackbarTitle: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    snackbarSubtitle: {
        color: '#ccc',
        fontSize: 12,
    },
    snackbarAction: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    snackbarActionText: {
        color: Colors.statusGreen,
        fontWeight: 'bold',
        fontSize: 12,
    },
    iconNavContainer: {
        width: 24,
        height: 24,
    },
    iconNavWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Cluster Styles
    clusterContainer: {
        backgroundColor: Colors.statusGreen,
        width: 70, // Bigger for City
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: Colors.white,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    clusterText: {
        color: Colors.matteBlack,
        fontWeight: 'bold',
        fontSize: 22,
    },
    // Mid Cluster Styles
    midClusterContainer: {
        backgroundColor: '#FFD700', // Gold/Yellow for neighborhood
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    midClusterText: {
        color: Colors.matteBlack,
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Cafe Chips Styles
    cafeChipsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 60, // Adjust based on header height + status bar
        left: 0,
        right: 0,
        zIndex: 50, // Above Map, Below Map Controls if needed
        height: 50,
    },
    cafeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(33, 33, 33, 0.95)', // Semi-transparent dark
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#444',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        height: 36, // Compact height
    },
    cafeIconCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    cafeName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginRight: 8,
        maxWidth: 120, // Limit width
    },
    cafeRating: {
        color: '#FFD700', // Gold
        fontSize: 10,
        fontWeight: 'bold',
    },
    activeIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.statusGreen,
        position: 'absolute',
        top: -2,
        right: -2,
        borderWidth: 1.5,
        borderColor: Colors.matteBlack,
    }
});