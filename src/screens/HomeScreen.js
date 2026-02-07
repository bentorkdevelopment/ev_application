import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Platform, Alert, Animated, ActivityIndicator, Linking, Share, Dimensions, LayoutAnimation, UIManager } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
// Custom Icons
import SearchIcon from '../assets/icons/Outlined/search_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import HelpIcon from '../assets/icons/Outlined/help_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ShareIcon from '../assets/icons/Rounded Fill/share_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import HomeIcon from '../assets/icons/Outlined/home_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import LibraryIcon from '../assets/icons/Outlined/library_books_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import ScanIcon from '../assets/icons/Rounded Fill/qr_code_scanner_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WalletIcon from '../assets/icons/Outlined/wallet_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import BellIcon from '../assets/icons/Outlined/notifications_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz48.svg';
import MapPinIcon from '../assets/icons/Outlined/location_on_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

import { Colors } from '../styles/GlobalStyles';
import { ChevronRight } from 'lucide-react-native';

import LibraryScreen from './LibraryScreen';
import StationBottomSheet from '../components/StationBottomSheet';
import StationCardSkeleton from '../components/StationCardSkeleton';
import { stationsApi, locationsApi, chargersApi, sessionApi, notificationApi } from '../services/api';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

import { useFocusEffect } from '@react-navigation/native';

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

export default function HomeScreenMain({ navigation, route }) {
    const { showAlert } = useAlert();
    const [currentTab, setCurrentTab] = useState('Home');
    const [region, setRegion] = useState({
        latitude: 18.5204, // Pune approx
        longitude: 73.8567,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    const [stations, setStations] = useState([]);
    const [allChargers, setAllChargers] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeResumeSession, setActiveResumeSession] = useState(null);
    const [isSessionCheckComplete, setIsSessionCheckComplete] = useState(false); // Validating session
    const [unreadCount, setUnreadCount] = useState(0); // State for notifications
    const [showSkeleton, setShowSkeleton] = useState(true);
    const skeletonOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const bottomUiFade = useRef(new Animated.Value(0)).current; // For fade-in animation
    const mapRef = useRef(null);

    const isFetchingRef = useRef(false);

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

    // Check for In-App Updates
    useEffect(() => {
        const checkForUpdates = async () => {
            if (Platform.OS === 'android') {
                try {
                    const inAppUpdates = new SpInAppUpdates(false); // isDebug=false
                    const result = await inAppUpdates.checkNeedsUpdate();

                    if (result.shouldUpdate) {
                        // Forces an immediate update. The Google Play UI will take over.
                        await inAppUpdates.startUpdate({
                            updateType: IAUUpdateKind.IMMEDIATE,
                        });
                    }
                } catch (error) {
                    console.log('In-App Update check failed:', error);
                }
            }
        };
        checkForUpdates();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            checkActiveSession();

            // Initial fetch
            fetchData(false);

            // Poll every 2 seconds for real-time updates
            const dataInterval = setInterval(() => {
                fetchData(true); // Silent update
            }, 2000);

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

    // Pulse Animation for Snackbar Border/Glow
    const pulseAnim = useRef(new Animated.Value(0)).current;

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

                if (activeSession && activeSession.sessionId && activeSession.status === 'ACTIVE') {
                    console.log("Found Active Session:", activeSession.sessionId);

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

                    // If user manually minimized or navigated back, show Snackbar
                    // Always activation the session snackbar
                    setActiveResumeSession(resumeData);

                    // If user manually minimized, we are good (stay on Home with Snackbar).
                    // If Cold Start (not minimized), AUTOMATICALLY RESTORE SESSION.
                    if (!route.params?.minimized) {
                        console.log("Cold Start with Active Session -> Auto Restoring...");
                        navigation.replace('Session', resumeData);
                    }
                } else {
                    setActiveResumeSession(null);
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

                setIsSheetVisible(true);

                // Reset params so it doesn't trigger again
                navigation.setParams({ foundStationId: null });
            }
        }
    }, [route.params?.foundStationId, stations]);



    useEffect(() => {
        if (!isLoading && stations.length > 0 && isSessionCheckComplete) {
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
    }, [isLoading, stations, isSessionCheckComplete]);

    const navTabAnim = useRef(new Animated.Value(0)).current; // 0 = Home, 1 = Library

    const handleTabChange = (tab) => {
        // User Fix: Dismiss Bottom Sheet automatically when Home is clicked
        if (tab === 'Home') {
            setIsSheetVisible(false);
        }

        // Manual Animated control
        setCurrentTab(tab);
        Animated.timing(navTabAnim, {
            toValue: tab === 'Home' ? 0 : 1,
            duration: 250,
            useNativeDriver: false, // width/color animations not supported on native driver
        }).start();
    };

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

                return {
                    ...st,
                    latitude: lat,
                    longitude: lng,
                    location: loc ? `${loc.address || ''}, ${loc.city || ''}` : (st.locationName || 'Unknown Location'),
                    image_url: st.imageUrl || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                    chargerId: st.id ? `STN-${st.id}` : 'UNKNOWN',
                    chargerType: 'Fast'
                };
            });

            console.log("Merged Stations Count:", mergedStations.length);

            if (mergedStations.length === 0) throw new Error("No stations found");

            setStations(mergedStations);

            setRegion({
                latitude: mergedStations[0].latitude,
                longitude: mergedStations[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            });
            mapRef.current?.animateToRegion({
                latitude: mergedStations[0].latitude,
                longitude: mergedStations[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }, 1000);

            setSelectedStation(mergedStations[0]);

        } catch (error) {
            console.error("Using static fallback:", error);
            const mockStations = [
                {
                    id: 1,
                    name: 'Bentork Charging Station - Pune',
                    location: 'City Center, 15 & 15A, Connaught Rd, near Lemon Tree Premier Hotel, Modi Colony, Pune, Maharashtra 411001',
                    latitude: 18.5204,
                    longitude: 73.8567,
                    status: 'Active',
                    image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
                },
                {
                    id: 2,
                    name: 'Phoenix Marketcity Charger',
                    location: 'Viman Nagar, Pune',
                    latitude: 18.5626,
                    longitude: 73.9168,
                    status: 'Busy',
                    image_url: 'https://images.unsplash.com/photo-1620803506177-3e6c38217bb4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
                },
            ];
            setStations(mockStations);
            setSelectedStation(mockStations[0]);

            setAllChargers([
                { id: 101, stationId: 1, ocppId: 'CHG-1', chargerType: 'DC', occupied: false, availability: true, rate: 120 },
                { id: 102, stationId: 1, ocppId: 'CHG-2', chargerType: 'AC', occupied: false, availability: true, rate: 22 },
                { id: 103, stationId: 1, ocppId: 'CHG-3', chargerType: 'DC', occupied: true, availability: true, rate: 60 },
            ]);
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



    const handleCardPress = () => {
        setIsSheetVisible(true);
    };

    const handleCloseBottomSheet = () => {
        setIsSheetVisible(false);
    };

    const handleSelectCharger = (charger) => {
        setIsSheetVisible(false);

        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        const isAC = typeStr.includes('AC');
        const fallbackConnector = isAC ? 'Type 2' : 'CCS 2';

        navigation.navigate('Config', {
            stationId: selectedStation?.id,
            stationName: selectedStation?.name,
            chargerId: charger.id || charger.charger_id || 'Unknown', // Pass DB ID
            boxId: charger.ocppId || charger.ocpp_id || 'Unknown',   // Pass OCPP ID as boxId
            chargerType: charger.chargerType || charger.type || 'Fast',
            maxPower: charger.max_power || charger.rate || 'Unknown',
            connectorType: charger.connectorType || charger.connectorType || fallbackConnector,
            status: (charger.status === 'Available' || (!charger.occupied && charger.availability)) ? 'Available' : (charger.status || 'Busy')
        });
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#212121" />

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
                    style={styles.map}
                    initialRegion={region}
                    mapType="standard"
                    showsUserLocation={true}
                    showsTraffic={true}
                    showsIndoors={true}
                    onRegionChangeComplete={(r) => setRegion(r)} // Update region state on map move
                >
                    {stations.map((station, index) => (
                        <Marker
                            key={`station_${station.id}_${index}`}
                            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
                            onPress={() => handleStationPress(station)}
                            zIndex={selectedStation?.id === station.id ? 20 : 10}
                        >
                            <View style={styles.customMarker}>
                                <MapPinIcon
                                    width={selectedStation?.id === station.id ? 32 : 24}
                                    height={selectedStation?.id === station.id ? 32 : 24}
                                    fill={selectedStation?.id === station.id ? "#e79200ff" : "#4CAF50"}
                                />
                                <View style={styles.markerDot} />
                            </View>
                        </Marker>
                    ))}




                </MapView>
            </Animated.View>

            {/* Header */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        tintColor="#ffffffff"
                    />
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
                            <SearchIcon width={24} height={24} fill="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notification')}>
                            <BellIcon width={24} height={24} fill="#ffffff" />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Floating Controls (Home Only) */}
            <Animated.View
                pointerEvents={currentTab === 'Home' ? 'box-none' : 'none'}
                style={[
                    StyleSheet.absoluteFill,
                    {
                        zIndex: 20, // Ensure BottomSheet overlays Header (zIndex: 10)
                        opacity: navTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0]
                        })
                    }
                ]}
            >
                {/* Stations Horizontal Scroll List */}
                {!activeResumeSession && !isLoading && (
                    <Animated.FlatList
                        data={stations}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={Dimensions.get('window').width * 0.95 + 20} // Card width + margin
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - (Dimensions.get('window').width * 0.95)) / 2 }}
                        keyExtractor={(item, index) => `${item.id}_${index}`}
                        onViewableItemsChanged={({ viewableItems }) => {
                            if (viewableItems.length > 0) {
                                const newItem = viewableItems[0].item;
                                if (newItem.id !== selectedStation?.id) {
                                    handleStationPress(newItem); // Reuse logic to update map
                                }
                            }
                        }}
                        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                        renderItem={({ item }) => {
                            // Logic to group connectors
                            const stationChargers = allChargers.filter(c => c.stationId === item.id);
                            const availableChargers = stationChargers.filter(c => c.status === 'Available' || (!c.occupied && c.availability)).length;

                            // Group by Type + Power
                            const connectorGroups = {};
                            stationChargers.forEach(c => {
                                const type = (c.chargerType || c.type || 'Fast').replace('Charging', '').trim();
                                const power = c.rate || c.max_power || 0;
                                const key = `${type}-${power}`;

                                if (!connectorGroups[key]) {
                                    connectorGroups[key] = { type, power, total: 0, available: 0, busy: 0 };
                                }
                                connectorGroups[key].total += 1;

                                const isAvailable = c.status === 'Available' || (!c.occupied && c.availability);
                                const isBusy = c.status === 'Busy' || c.occupied === true; // status 'Busy' or boolean occupied

                                if (isAvailable) {
                                    connectorGroups[key].available += 1;
                                } else if (isBusy) {
                                    connectorGroups[key].busy += 1;
                                }
                            });
                            const groupedConnectors = Object.values(connectorGroups);

                            return (
                                <TouchableOpacity
                                    style={[styles.cardContainer, {
                                        width: Dimensions.get('window').width * 0.95,
                                        marginRight: 20,
                                        position: 'relative',
                                        bottom: 0, left: 0, right: 0
                                    }]}
                                    activeOpacity={0.9}
                                    onPress={handleCardPress}
                                >
                                    {/* Top Row: Info + Image */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.stationName} numberOfLines={2}>{item.name}</Text>
                                            <View style={styles.ratingRow}>
                                                <Text style={styles.ratingText}>4.3</Text>
                                                <StarRating rating={4.3} />
                                            </View>
                                            <Text style={styles.addressText} numberOfLines={3}>
                                                {item.location}
                                            </Text>
                                        </View>
                                        <View style={styles.imageContainerNew}>
                                            <Image
                                                source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                                style={styles.stationImage}
                                            />
                                        </View>
                                    </View>

                                    {/* Bottom Row: Status/Connectors + Actions */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.statusText, { color: availableChargers > 0 ? '#00E676' : '#FF4213', marginBottom: 4 }]}>
                                                {availableChargers > 0 ? 'Available' : 'Busy'}
                                            </Text>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                {groupedConnectors.length > 0 ? (
                                                    <>
                                                        {(() => {
                                                            const group = groupedConnectors[0];
                                                            let iconColor = '#d3002aff';
                                                            if (group.available > 0) iconColor = '#00E676';
                                                            else if (group.busy > 0) iconColor = '#FF9100';

                                                            return (
                                                                <View style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                                    borderRadius: 6,
                                                                    paddingHorizontal: 8,
                                                                    paddingVertical: 5
                                                                }}>
                                                                    <BoltIcon width={12} height={12} fill={iconColor} style={{ marginRight: 4 }} />
                                                                    <Text style={{ color: '#ddd', fontSize: 11, fontWeight: '500' }}>
                                                                        {group.power}kW ({group.type})
                                                                    </Text>
                                                                </View>
                                                            );
                                                        })()}
                                                        {groupedConnectors.length > 1 && (
                                                            <View style={{
                                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                                borderRadius: 6,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 5,
                                                                justifyContent: 'center',
                                                                alignItems: 'center'
                                                            }}>
                                                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                                                                    +{groupedConnectors.length - 1}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Text style={{ color: '#888', fontSize: 12 }}>No connectors found</Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Right: Action Buttons */}
                                        <View style={{ justifyContent: 'flex-end', paddingBottom: 0, paddingEnd: 8, marginTop: 6 }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 }}
                                                onPress={handleDirections}
                                            >
                                                <NavigationIcon width={24} height={24} fill="#212121" style={{ marginRight: 4 }} />
                                                <Text style={{ color: '#212121', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>Go</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )
                        }}
                        style={{
                            position: 'absolute',
                            bottom: 100,
                            left: 0,
                            right: 0,
                            zIndex: 10,
                            opacity: contentOpacity,
                        }}
                    />
                )}


                <StationBottomSheet
                    station={selectedStation}
                    chargers={allChargers}
                    visible={isSheetVisible}
                    onClose={handleCloseBottomSheet}
                    onSelectCharger={handleSelectCharger}
                />
            </Animated.View>

            {/* Library Screen (Persisted) */}
            <Animated.View
                pointerEvents={currentTab === 'Library' ? 'auto' : 'none'}
                style={[
                    {
                        flex: 1,
                        opacity: navTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1]
                        })
                    }
                ]}
            >
                <LibraryScreen navigation={navigation} />
            </Animated.View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => handleTabChange('Home')}>
                    <Animated.View style={[styles.navPill, {
                        width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [64, 30] }),
                        backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', 'rgba(30,30,30,0)'] })
                    }]}>
                        <View style={styles.iconNavContainer}>
                            {/* Active Icon (Black) - Visible at 0 */}
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                                <HomeIcon width={24} height={24} fill="#000" />
                            </Animated.View>
                            {/* Inactive Icon (White) - Visible at 1 */}
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                                <HomeIcon width={24} height={24} fill="#fff" />
                            </Animated.View>
                        </View>
                    </Animated.View>
                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.centerNavBtnContainer}
                    onPress={() => navigation.navigate('QRScanner', { stations, allChargers })}
                >
                    <View style={[styles.centerNavBtn, { backgroundColor: '#00E676' }]}>
                        <ScanIcon width={32} height={32} fill="#1E1E1E" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => handleTabChange('Library')}>
                    <Animated.View style={[styles.navPill, {
                        width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 70] }),
                        backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(30,30,30,0)', '#ffffff'] })
                    }]}>
                        <View style={styles.iconNavContainer}>
                            {/* Inactive Icon (White) - Visible at 0 */}
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                                <LibraryIcon width={24} height={24} fill="#fff" />
                            </Animated.View>
                            {/* Active Icon (Black) - Visible at 1 */}
                            <Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                                <LibraryIcon width={24} height={24} fill="#000" />
                            </Animated.View>
                        </View>
                    </Animated.View>
                    <Text style={currentTab === 'Library' ? styles.navTextActive : styles.navText}>Library</Text>
                </TouchableOpacity>
            </View>



            {/* Active Session Snackbar */}
            {activeResumeSession && currentTab === 'Home' && (
                <Animated.View
                    style={[
                        styles.sessionSnackbar,
                        {
                            backgroundColor: pulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#212121', '#303030'] // Pulse from Dark to Green
                            }),
                            padding: 0, // Remove padding from wrapper to let TouchableOpacity handle it
                            borderWidth: 0, // No border
                            opacity: bottomUiFade,
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('Session', activeResumeSession)}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                        }}
                    >
                        <View style={styles.snackbarIcon}>
                            <BoltIcon width={24} height={24} fill="#000" />
                        </View>
                        <View style={styles.snackbarContent}>
                            <Text style={styles.snackbarTitle}>Charging in Progress</Text>
                            <Text style={styles.snackbarSubtitle}>{activeResumeSession.stationName}</Text>
                        </View>
                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <ChevronRight color="#fff" size={24} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContainer: {
        backgroundColor: 'rgba(33, 33, 33, 1)',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
    badge: {
        position: 'absolute',
        right: -6,
        top: -6,
        backgroundColor: 'red',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: '#212121',
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
    customMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        position: 'absolute',
        top: 8,
        display: 'none',
    },
    // Station Card
    cardContainer: {
        position: 'absolute',
        bottom: 90,
        left: 5,
        right: 15,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 15,

        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
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
        color: '#fff',
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
        color: '#00E676',
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
        color: '#fff',
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

    // Bottom Nav
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
        color: '#fff',
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
        backgroundColor: '#00E676',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    snackbarContent: {
        flex: 1,
    },
    snackbarTitle: {
        color: '#fff',
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
        color: '#00E676',
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
});