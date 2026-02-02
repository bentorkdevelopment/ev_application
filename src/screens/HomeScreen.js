import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Platform, Alert, Animated, ActivityIndicator, Linking, Share } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Minus, HelpCircle, Navigation, Share2, Home, Library, Zap, Wallet, Bell, MapPin } from 'lucide-react-native';
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            console.log("Fetching real data from backend...");

            // Avoid 401 if not logged in
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

            // If stations failed, throw to catch block to use fallback
            if (!stationsData) throw new Error("Stations API failed");

            // Handle potential response wrappers
            const validStations = Array.isArray(stationsData) ? stationsData : (stationsData?.stations || []);
            const validLocations = Array.isArray(locationsData) ? locationsData : (locationsData?.locations || []);
            const validChargers = Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []);

            setAllChargers(validChargers);

            // Map location by NAME for fast lookup
            const locationsMap = new Map();
            if (Array.isArray(validLocations)) {
                validLocations.forEach(loc => locationsMap.set(loc.name, loc));
            }

            const mergedStations = validStations.map(st => {
                const loc = locationsMap.get(st.locationName);
                const lat = (loc && loc.latitude) ? parseFloat(loc.latitude) : (st.latitude ? parseFloat(st.latitude) : 18.5204);
                const lng = (loc && loc.longitude) ? parseFloat(loc.longitude) : (st.longitude ? parseFloat(st.longitude) : 73.8567);

                return {
                    ...st,
                    latitude: lat,
                    longitude: lng,
                    location: loc ? `${loc.address}, ${loc.city}, ${loc.state}` : (st.locationName || 'Unknown Location'),
                    image_url: st.imageUrl || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                    chargerId: st.id ? `STN-${st.id}` : 'UNKNOWN',
                    chargerType: 'Fast'
                };
            });

            // Fallback if no stations found
            if (mergedStations.length === 0) throw new Error("No stations found");

            setStations(mergedStations);

            // Auto-center on first station
            setRegion({
                latitude: mergedStations[0].latitude,
                longitude: mergedStations[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            });

            // Default to first station selected for UI interaction test
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
        setRegion({
            latitude: Number(station.latitude),
            longitude: Number(station.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        });
    };

    const handleCardPress = () => {
        setIsSheetVisible(true);
    };

    const handleCloseBottomSheet = () => {
        setIsSheetVisible(false);
    };

    const handleSelectCharger = (charger) => {
        setIsSheetVisible(false);

        // Determine connector fallback
        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        const isAC = typeStr.includes('AC');
        const fallbackConnector = isAC ? 'Type 2' : 'CCS 2';

        navigation.navigate('Config', {
            stationId: selectedStation?.id,
            stationName: selectedStation?.name,
            chargerId: charger.ocppId || charger.charger_id || charger.id || 'Unknown',
            chargerType: charger.chargerType || charger.type || 'Fast',
            maxPower: charger.max_power || charger.rate || 'Unknown',
            connectorType: charger.connectorType || charger.connector_type || fallbackConnector,
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
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Map */}
            {currentTab === 'Home' && (
                <MapView
                    style={styles.map}
                    region={region}
                    mapType={Platform.OS === 'android' ? 'none' : 'standard'}
                    rotateEnabled={false}
                    onRegionChangeComplete={setRegion}
                >
                    {stations.map((station, index) => (
                        <Marker
                            key={`${station.id}_${index}`}
                            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
                            onPress={() => handleStationPress(station)}
                            zIndex={selectedStation?.id === station.id ? 10 : 1}
                        >
                            <View style={styles.customMarker}>
                                <MapPin
                                    size={selectedStation?.id === station.id ? 32 : 24}
                                    color={selectedStation?.id === station.id ? "#00E5FF" : "#4CAF50"}
                                    fill={selectedStation?.id === station.id ? "#00E5FF" : "#4CAF50"}
                                />
                                <View style={styles.markerDot} />
                            </View>
                        </Marker>
                    ))}
                </MapView>
            )}

            {/* Header */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        tintColor="#ffffffff"
                    />
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Wallet')}>
                            <Wallet color="#ffffffff" size={18} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notification')}>
                            <Bell color="#ffffffff" size={18} />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>7</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Floating Controls */}
            {currentTab === 'Home' && (
                <>
                    <TouchableOpacity style={styles.searchButton}>
                        <Search color="#fff" size={24} />
                    </TouchableOpacity>

                    <View style={[styles.zoomControls, { bottom: selectedStation ? 340 : 120 }]}>
                        <TouchableOpacity style={styles.zoomBtn}>
                            <Plus color="#000" size={24} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.zoomBtn}>
                            <Minus color="#000" size={24} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.helpButton, { bottom: selectedStation ? 340 : 120 }]}>
                        <HelpCircle color="#fff" size={28} />
                    </TouchableOpacity>

                    {/* Station Card - Dynamic & Pressable */}
                    {selectedStation && (
                        <TouchableOpacity
                            style={styles.cardContainer}
                            activeOpacity={0.9}
                            onPress={handleCardPress}
                        >
                            <View style={styles.cardContentRow}>
                                <View style={styles.leftColumn}>
                                    <Text style={styles.stationName}>{selectedStation.name}</Text>
                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingText}>4.3</Text>
                                        <StarRating rating={4.3} />
                                    </View>
                                    <Text style={styles.addressText} numberOfLines={2}>
                                        {selectedStation.location}
                                    </Text>
                                    <Text style={[styles.statusText, { color: allChargers.filter(c => c.stationId === selectedStation.id && (c.status === 'Available' || (!c.occupied && c.availability))).length > 0 ? '#00E676' : '#FF4213' }]}>
                                        {allChargers.filter(c => c.stationId === selectedStation.id && (c.status === 'Available' || (!c.occupied && c.availability))).length} Chargers Available
                                    </Text>
                                </View>

                                <View style={styles.rightColumn}>
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: selectedStation.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                            style={styles.stationImage}
                                        />
                                        <View style={styles.imageOverlay} />
                                    </View>

                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
                                            <View style={styles.actionIconCircle}>
                                                <Navigation color="#000" size={24} />
                                            </View>
                                            <Text style={styles.actionText}>Go</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                                            <View style={styles.actionIconCircle}>
                                                <Share2 color="#000" size={24} />
                                            </View>
                                            <Text style={styles.actionText}>Share</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}

                    <StationBottomSheet
                        station={selectedStation}
                        chargers={allChargers}
                        visible={isSheetVisible}
                        onClose={handleCloseBottomSheet}
                        onSelectCharger={handleSelectCharger}
                    />
                </>
            )}

            {/* Library Screen */}
            {currentTab === 'Library' && <LibraryScreen navigation={navigation} />}

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('Home')}>
                    <View style={currentTab === 'Home' ? styles.activeNavPill : null}>
                        <Home color={currentTab === 'Home' ? "#000" : "#fff"} size={24} />
                    </View>
                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.centerNavBtnContainer}
                    onPress={() => navigation.navigate('Config')}
                >
                    <View style={styles.centerNavBtn}>
                        <Zap color="#000" size={32} fill="#000" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('Library')}>
                    <View style={currentTab === 'Library' ? styles.activeNavPill : null}>
                        <Library color={currentTab === 'Library' ? "#000" : "#fff"} size={24} />
                    </View>
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
        width: 60,
    },
    activeNavPill: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 5,
        marginBottom: 5,
    },
    navTextActive: {
        color: '#fff',
        fontSize: 12,
    },
    navText: {
        color: '#888',
        fontSize: 12,
        marginTop: 5,
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
});