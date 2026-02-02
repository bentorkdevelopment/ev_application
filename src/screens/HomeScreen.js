import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Platform, Alert, Animated, ActivityIndicator, Linking, Share, Dimensions, LayoutAnimation, UIManager } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
// Custom Icons
import SearchIcon from '../assets/icons/Outlined/search_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import HelpIcon from '../assets/icons/Outlined/help_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import NavigationIcon from '../assets/icons/Outlined/directions_car_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import ShareIcon from '../assets/icons/Rounded Fill/share_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg'; // Rounded Fill as per availability
import HomeIcon from '../assets/icons/Outlined/home_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import LibraryIcon from '../assets/icons/Outlined/library_books_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import ScanIcon from '../assets/icons/Rounded Fill/qr_code_scanner_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WalletIcon from '../assets/icons/Outlined/wallet_24dp_E3E3E3_FILL0_wght300_GRAD-25_opsz24.svg';
import BellIcon from '../assets/icons/Outlined/notifications_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz48.svg';
import MapPinIcon from '../assets/icons/Outlined/location_on_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
import BoltIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg'; // If needed for Zap in nav item? No, Nav item is Scan now.

import LibraryScreen from './LibraryScreen';
import StationBottomSheet from '../components/StationBottomSheet';
import { stationsApi, locationsApi, chargersApi } from '../services/api';
import { authService } from '../services/auth';

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

export default function HomeScreenMain({ navigation }) {
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
    const mapRef = useRef(null);
    useEffect(() => {
        if (Platform.OS === 'android') {
            if (UIManager.setLayoutAnimationEnabledExperimental) {
                UIManager.setLayoutAnimationEnabledExperimental(true);
            }
        }
        fetchData();
    }, []);

    const navTabAnim = useRef(new Animated.Value(0)).current; // 0 = Home, 1 = Library

    const handleTabChange = (tab) => {
        // LayoutAnimation removed for manual Animated control
        setCurrentTab(tab);
        Animated.timing(navTabAnim, {
            toValue: tab === 'Home' ? 0 : 1,
            duration: 300,
            useNativeDriver: false, // width/color animations not supported on native driver
        }).start();
    };

    const fetchData = async () => {
        try {
            console.log("Fetching real data from backend...");

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
            chargerId: charger.ocppId || charger.charger_id || charger.id || 'Unknown',
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
            Alert.alert(error.message);
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
                >
                    {stations.map((station, index) => (
                        <Marker
                            key={`${station.id}_${index}`}
                            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
                            onPress={() => handleStationPress(station)}
                            zIndex={selectedStation?.id === station.id ? 10 : 1}
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
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Wallet')}>
                            <WalletIcon width={24} height={24} fill="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notification')}>
                            <BellIcon width={24} height={24} fill="#ffffff" />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>7</Text>
                            </View>
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
                        opacity: navTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0]
                        })
                    }
                ]}
            >
                <TouchableOpacity style={styles.searchButton}>
                    <SearchIcon width={24} height={24} fill="#fff" />
                </TouchableOpacity>


                <TouchableOpacity style={[styles.helpButton, { bottom: selectedStation ? 340 : 120 }]}>
                    <HelpIcon width={28} height={28} fill="#fff" />
                </TouchableOpacity>

                {/* Stations Horizontal Scroll List */}
                <Animated.FlatList
                    data={stations}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={Dimensions.get('window').width * 0.9 + 20} // Card width + margin
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: (Dimensions.get('window').width - (Dimensions.get('window').width * 0.9)) / 2 }}
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
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.cardContainer, {
                                width: Dimensions.get('window').width * 0.9,
                                marginRight: 20,
                                // Override absolute positioning from styles
                                position: 'relative',
                                bottom: 0, left: 0, right: 0
                            }]}
                            activeOpacity={0.9}
                            onPress={handleCardPress}
                        >
                            <View style={styles.cardContentRow}>
                                <View style={styles.leftColumn}>
                                    <Text style={styles.stationName}>{item.name}</Text>
                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingText}>4.3</Text>
                                        <StarRating rating={4.3} />
                                    </View>
                                    <Text style={styles.addressText} numberOfLines={2}>
                                        {item.location}
                                    </Text>
                                    <Text style={[styles.statusText, { color: allChargers.filter(c => c.stationId === item.id && (c.status === 'Available' || (!c.occupied && c.availability))).length > 0 ? '#00E676' : '#FF4213' }]}>
                                        {allChargers.filter(c => c.stationId === item.id && (c.status === 'Available' || (!c.occupied && c.availability))).length} Chargers Available
                                    </Text>
                                </View>

                                <View style={styles.rightColumn}>
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                            style={styles.stationImage}
                                        />
                                        <View style={styles.imageOverlay} />
                                    </View>

                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
                                            <View style={styles.actionIconCircle}>
                                                <NavigationIcon width={24} height={24} fill="#000" />
                                            </View>
                                            <Text style={styles.actionText}>Go</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                                            <View style={styles.actionIconCircle}>
                                                <ShareIcon width={24} height={24} fill="#000" />
                                            </View>
                                            <Text style={styles.actionText}>Share</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    style={{
                        position: 'absolute',
                        bottom: 100,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                    }}
                />

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
                    onPress={() => navigation.navigate('QRScanner')}
                >
                    <View style={styles.centerNavBtn}>
                        <ScanIcon width={32} height={32} fill="#000" />
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

            {isLoading && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }]}>
                    <ActivityIndicator size="large" color="#00E5FF" />
                </View>
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
        backgroundColor: 'rgba(33, 33, 33, 0.9)',
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
        marginTop: 10,
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
        bottom: 100,
        left: 15,
        right: 15,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
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
        top: -30,
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