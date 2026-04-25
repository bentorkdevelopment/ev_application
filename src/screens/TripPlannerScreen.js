import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Dimensions, ActivityIndicator, Animated, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ChevronLeft, MapPin, BatteryCharging, Navigation, Zap, X, Navigation2 } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import GetLocation from 'react-native-get-location';
import routeService, { SUPPORTED_LOCATIONS, getDistanceFromLatLonInKm, getBearing } from '../services/routeService';
import { useAlert } from '../context/AlertContext';
import mapStyle from '../assets/map style/mapStyle.json';

export default function TripPlannerScreen({ navigation }) {
    const { showAlert } = useAlert();
    const [source, setSource] = useState('Current Location');
    const [destination, setDestination] = useState('Mumbai');
    const [batteryLevel, setBatteryLevel] = useState(50);
    const [selectedAmenity, setSelectedAmenity] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [navStatus, setNavStatus] = useState('idle'); // idle | initializing | active | error

    // Trip State
    const [tripPlan, setTripPlan] = useState(null);
    const [viewMode, setViewMode] = useState('INPUT'); // INPUT | SUMMARY | DRIVE

    // Drive Mode State (kept for progress tracking)
    const [currentLocation, setCurrentLocation] = useState(null);
    const [nextStopIndex, setNextStopIndex] = useState(0);
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [sliderWidth, setSliderWidth] = useState(0);
    const [apiSuggestions, setApiSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null); // 'source' | 'dest'
    const scrollY = useRef(new Animated.Value(0)).current;
    const mapRef = useRef(null);
    const lastClosestIndex = useRef(0);
    const amenities = ['Coffee', 'Food', 'Restroom', 'Shopping', 'Hotel'];



    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!focusedInput) {
                setApiSuggestions([]);
                setShowSuggestions(false);
                return;
            }
            const query = focusedInput === 'source' ? source : destination;
            // Only search if user has typed at least 5 characters AND there's a space (likely finished a word)
            // This significantly reduces API cost and prevents junk calls
            if (query && query.length >= 5 && query.includes(' ') && query !== 'Current Location') {
                const results = await routeService.getPlaceSuggestions(query);
                setApiSuggestions(results);
                setShowSuggestions(results.length > 0);
            } else {
                setApiSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 800); // Higher debounce to wait for user to stop typing
        return () => clearTimeout(timeoutId);
    }, [source, destination, focusedInput]);

    const toggleAmenity = (item) => {
        if (selectedAmenity.includes(item)) {
            setSelectedAmenity(selectedAmenity.filter(i => i !== item));
        } else {
            setSelectedAmenity([...selectedAmenity, item]);
        }
    };

    const handlePlanRoute = async () => {
        if (!destination) {
            showAlert("Missing Input", "Please enter a destination.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Get Route
            let startLoc = source;
            if (source === 'Current Location') {
                try {
                    const location = await GetLocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 15000,
                    });
                    startLoc = { latitude: location.latitude, longitude: location.longitude };
                } catch (locError) {
                    console.warn("Location fetch failed, using fallback:", locError);
                    startLoc = "Pune, Maharashtra"; // Fallback
                }
            }
            const endLoc = destination;

            const routeData = await routeService.getRoute(startLoc, endLoc);
            // 2. Find Stations on this route
            const stationsOnRoute = await routeService.findStationsAlongRoute(routeData.points, 5);

            // Mock charging stations for Mumbai trip as requested
            let displayStations = stationsOnRoute;
            if (destination.toLowerCase().includes('mumbai')) {
                displayStations = [
                    {
                        name: "Tata Power Charging Station, Lonavala",
                        location: "Old Mumbai - Pune Hwy, Lonavala",
                        latitude: 18.7557,
                        longitude: 73.4091,
                        status: "Available"
                    },
                    {
                        name: "Jio-bp Pulse Charging Station, Navi Mumbai",
                        location: "Sector 30, Vashi",
                        latitude: 19.0652,
                        longitude: 72.9982,
                        status: "Available"
                    },
                    ...stationsOnRoute
                ];
            }

            setTripPlan({
                route: routeData,
                stations: displayStations,
                // Precise destination coords from Directions API leg.end_location
                destinationCoords: routeData.endLocation || null,
                destinationAddress: routeData.endAddress || destination,
                stats: {
                    distance: routeData.distanceKm.toFixed(1),
                    duration: Math.round(routeData.durationMins),
                    stops: displayStations.length
                }
            });
            setViewMode('SUMMARY');

        } catch (error) {
            console.error(error);
            showAlert("Planning Failed", "Could not calculate route. " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartTrip = useCallback(() => {
        if (!tripPlan) return;
        
        // 1. ALWAYS use exact coordinates to prevent Google Maps from failing to resolve addresses
        const destCoords = tripPlan.destinationCoords;
        const destStr = destCoords 
            ? `${destCoords.lat},${destCoords.lng}` 
            : (tripPlan.destinationAddress || destination);
            
        // 2. Limit waypoints to prevent silent routing failures in Google Maps (Max 20 intermediate stops allowed)
        const waypointsList = (tripPlan.stations || [])
            .slice(0, 20)
            .map(s => `${s.latitude},${s.longitude}`)
            .join('|');
            
        // 3. Assemble the core parameters for the Universal Maps Link
        let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destStr)}`;
        
        if (source !== 'Current Location') {
            // Omitting the origin parameter defaults to the user's current GPS location
            url += `&origin=${encodeURIComponent(source)}`;
        }
        
        if (waypointsList) {
            url += `&waypoints=${encodeURIComponent(waypointsList)}`;
        }
        
        url += '&travelmode=driving';

        console.log('[Nav] Opening Maps URL:', url);

        Linking.openURL(url).catch(err => {
            console.error("Failed to open Maps:", err);
            showAlert("Navigation Error", "Could not open Google Maps. Please ensure the app is installed.");
        });

    }, [tripPlan, source, destination, showAlert]);


    const handleStopTrip = useCallback(() => {
        setNavStatus('idle');
        setViewMode('SUMMARY');
        // Redirect to Home as requested
        navigation.navigate('Home');
    }, [navigation]);

    const handleReset = useCallback(() => {
        setTripPlan(null);
        setViewMode('INPUT');
        setSimulatedProgress(0);
        setCurrentLocation(null);
        setNextStopIndex(0);
        setNavStatus('idle');
        lastClosestIndex.current = 0;
    }, []);

    const handleSliderTouch = (e) => {
        if (sliderWidth === 0) return;
        const x = e.nativeEvent.locationX;
        const newPercent = Math.min(100, Math.max(0, Math.round((x / sliderWidth) * 100)));
        setBatteryLevel(newPercent);
    };

    const handleLocationSelect = (loc) => {
        if (focusedInput === 'source') setSource(loc);
        if (focusedInput === 'dest') setDestination(loc);
        setFocusedInput(null);
        setApiSuggestions([]);
        setShowSuggestions(false);
    };

    const suggestions = apiSuggestions;

    const renderInputView = () => (
        <View style={{ flex: 1 }}>
            <Animated.View style={[styles.topBar, {
                backgroundColor: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: ['rgba(15, 15, 15, 0)', 'rgba(15, 15, 15, 1)'],
                    extrapolate: 'clamp'
                }),
                borderBottomWidth: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 1],
                    extrapolate: 'clamp'
                }),
                borderBottomColor: '#2C2C2E'
            }]}>
                <TouchableOpacity style={styles.backBtnWrapper} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={styles.content}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerSpacer} />

                <Text style={styles.pageTitle}>Where to next?</Text>

                <Text style={styles.pageSubtitle}>Plan your journey with optimal charging stops.</Text>

                {/* Inputs Card */}
                <View style={[styles.card, { zIndex: 10 }]}>
                    <View style={styles.inputContainer}>
                        <View style={styles.iconBox}>
                            <MapPin size={20} color={Colors.primaryContainer} />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={source}
                            onChangeText={setSource}
                            onFocus={() => setFocusedInput('source')}
                            onBlur={() => setTimeout(() => setFocusedInput(null), 200)} // Delay to allow click
                            placeholder="Current Location"
                            placeholderTextColor="#666"
                        />
                        {source.length > 0 && focusedInput === 'source' && (
                            <TouchableOpacity onPress={() => setSource('')}>
                                <X size={16} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.connectorLine} />
                    <View style={styles.inputContainer}>
                        <View style={[styles.iconBox, { backgroundColor: '#2A2A2A' }]}>
                            <Navigation size={20} color="#fff" />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={destination}
                            onChangeText={setDestination}
                            onFocus={() => setFocusedInput('dest')}
                            onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                            placeholder="Enter Destination"
                            placeholderTextColor="#666"
                        />
                        {destination.length > 0 && focusedInput === 'dest' && (
                            <TouchableOpacity onPress={() => setDestination('')}>
                                <X size={16} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Autocomplete Suggestions Overlay */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        handleLocationSelect(item);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <MapPin size={14} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.suggestionText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Battery Slider */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Battery Level</Text>
                    <Text style={[styles.batteryValue, { color: getBatteryColor(batteryLevel) }]}>{batteryLevel}%</Text>
                </View>

                <View style={styles.card}>
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={batteryLevel}
                        onValueChange={setBatteryLevel}
                        minimumTrackTintColor={getBatteryColor(batteryLevel)}
                        maximumTrackTintColor="#333"
                        thumbTintColor="#fff"
                    />
                    <View style={styles.presetRow}>
                        {[20, 50, 80, 100].map(p => (
                            <TouchableOpacity key={p} onPress={() => setBatteryLevel(p)} style={styles.presetBtn}>
                                <Text style={styles.presetText}>{p}%</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Amenities */}
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesContainer}>
                    {amenities.map(item => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, selectedAmenity.includes(item) && styles.chipActive]}
                            onPress={() => toggleAmenity(item)}
                        >
                            <Text style={[styles.chipText, selectedAmenity.includes(item) && styles.chipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.planBtn} onPress={handlePlanRoute} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#000" /> : <Zap size={24} color="#000" fill="#000" />}
                    <Text style={styles.planBtnText}>{isLoading ? "Finding Route..." : "Plan Trip"}</Text>
                </TouchableOpacity>
            </Animated.ScrollView>
        </View>
    );

    const renderSummaryView = () => (
        <View style={{ flex: 1 }}>
            {/* Map Half */}
            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    showsBuildings={false}
                    maxTilt={0}
                    initialRegion={{
                        latitude: tripPlan.route.points[0].latitude,
                        longitude: tripPlan.route.points[0].longitude,
                        latitudeDelta: 0.5,
                        longitudeDelta: 0.5,
                    }}
                >
                    <Polyline
                        coordinates={tripPlan.route.points}
                        strokeColor={Colors.primaryContainer} // Route Color
                        strokeWidth={10}
                    />

                    {/* Origin & Dest */}
                    <Marker coordinate={tripPlan.route.points[0]} title="Start" pinColor={Colors.white} />
                    <Marker coordinate={tripPlan.route.points[tripPlan.route.points.length - 1]} title="End" pinColor="red" />

                    {/* Stations */}
                    {tripPlan.stations.map((s, i) => (
                        <Marker
                            key={`stp-${i}`}
                            coordinate={{ latitude: Number(s.latitude), longitude: Number(s.longitude) }}
                            title={s.name}
                            description={`Stop #${i + 1}`}
                            tracksViewChanges={false}
                        >
                            <View style={styles.markerBadge}>
                                <Zap size={10} color="#000" fill="#000" />
                            </View>
                        </Marker>
                    ))}

                </MapView>

                <TouchableOpacity style={styles.closeMapBtn} onPress={handleReset}>
                    <X size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Summary Sheet */}
            <View style={styles.summarySheet}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>Trip Summary</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Distance</Text>
                            <Text style={styles.statValue}>{tripPlan.stats.distance} km</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Est. Time</Text>
                            <Text style={styles.statValue}>{Math.floor(tripPlan.stats.duration / 60)}h {tripPlan.stats.duration % 60}m</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stops</Text>
                            <Text style={styles.statValue}>{tripPlan.stats.stops}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.timeline}>
                    {tripPlan.stations.map((station, i) => (
                        <View key={i} style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                                <View style={styles.timelineLine} />
                                <View style={styles.timelineDot}>
                                    <Text style={styles.stopNum}>{i + 1}</Text>
                                </View>
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>{station.name}</Text>
                                <Text style={styles.timelineSub}>{station.location}</Text>
                                {station.status === 'Available' ?
                                    <Text style={{ color: Colors.success, fontSize: 12 }}>Available • Fast Charging</Text> :
                                    <Text style={{ color: 'orange', fontSize: 12 }}>{station.status}</Text>
                                }
                            </View>
                        </View>
                    ))}
                    {tripPlan.stations.length === 0 && (
                        <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>
                            No charging needed for this route (or no stations found).
                        </Text>
                    )}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.startTripBtn, navStatus === 'initializing' && { opacity: 0.7 }]}
                    onPress={handleStartTrip}
                    disabled={navStatus === 'initializing'}
                >
                    {navStatus === 'initializing' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator size="small" color="#000" />
                            <Text style={styles.startTripText}>Starting Navigation...</Text>
                        </View>
                    ) : (
                        <Text style={styles.startTripText}>▶  Start Trip</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />
            {viewMode === 'INPUT' ? renderInputView() : renderSummaryView()}
        </View>
    );
}

const getBatteryColor = (level) => {
    if (level > 50) return Colors.primaryContainer;
    if (level > 20) return 'orange';
    return 'red';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F', // Darker background
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        paddingTop: 40,
        paddingLeft: 20,
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    backBtnWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        paddingTop: 100,
        paddingBottom: 40
    },
    headerSpacer: {
        height: 20
    },
    pageTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8
    },
    pageSubtitle: {
        color: '#888',
        fontSize: 16,
        marginBottom: 30
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 17,
        fontWeight: '500'
    },
    connectorLine: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 15,
        marginLeft: 50
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 15
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    batteryValue: {
        color: Colors.primaryContainer,
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24
    },
    customSliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 20
    },
    sliderTrack: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#333'
    },
    sliderFill: {
        position: 'absolute',
        left: 0,
        height: 6,
        borderRadius: 3,
    },
    sliderThumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        top: 8, // CENTERED: (40 - 24) / 2 = 8
        marginLeft: -12, // Center the thumb on the percentage point
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5
    },
    presetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5
    },
    presetBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#2C2C2E'
    },
    presetText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600'
    },
    amenitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 40,
    },
    chip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    chipActive: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
    },
    chipText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600'
    },
    chipTextActive: {
        color: '#000',
    },
    planBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    planBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    // ... (Keep existing summary/drive styles below or let them be)
    mapContainer: {
        height: '45%',
        width: '100%',
        position: 'relative'
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    // Suggestions
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#333',
        zIndex: 100,
        marginTop: 5, // space between card and list
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    suggestionText: {
        color: '#ccc',
        fontSize: 14,
    },
    closeMapBtn: {
        position: 'absolute',
        top: 40,
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        elevation: 5
    },
    markerBadge: {
        backgroundColor: Colors.primaryContainer,
        padding: 5,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#fff'
    },
    summarySheet: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -25,
        padding: 24
    },
    summaryHeader: {
        marginBottom: 20
    },
    summaryTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 20
    },
    statItem: {
        alignItems: 'center'
    },
    statLabel: {
        color: '#666',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    timeline: {
        flex: 1,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: 15,
        width: 30
    },
    timelineLine: {
        position: 'absolute',
        top: 15,
        bottom: -25,
        width: 2,
        backgroundColor: '#333'
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1C1C1E',
        borderWidth: 2,
        borderColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    stopNum: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    timelineContent: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16
    },
    timelineTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2
    },
    timelineSub: {
        color: '#888',
        fontSize: 12,
        marginBottom: 5
    },
    startTripBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 10
    },
    startTripText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold'
    },
    // Drive Mode Styles
    driverMarker: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5
    },
    driveCard: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    driveCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15
    },
    driveTitle: {
        color: '#888',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4
    },
    driveStationName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        width: '90%'
    },
    stopBtn: {
        backgroundColor: '#2C2C2E',
        padding: 8,
        borderRadius: 20
    },
    driveStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        backgroundColor: '#121212',
        borderRadius: 16,
        padding: 16
    },
    driveStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    driveStatVal: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14
    },
    amenityTip: {
        backgroundColor: 'rgba(255, 152, 0, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.2)'
    },
    amenityText: {
        color: '#FF9800',
        fontSize: 14,
        fontStyle: 'italic'
    },
    navBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center'
    },
    navBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold'
    },
    instructionBar: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 10
    },
    instructionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    instructionContent: {
        flex: 1
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2
    },
    instructionSub: {
        color: '#888',
        fontSize: 12
    },
    upcomingStopsContainer: {
        position: 'absolute',
        bottom: 180, // Positioned above the driveCard
        left: 0,
        right: 0,
        height: 60,
    },
    upcomingStationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        minWidth: 150,
    },
    upcomingStationIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    upcomingStationName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        maxWidth: 100
    },
    upcomingStationDist: {
        color: Colors.primaryContainer,
        fontSize: 12,
        fontWeight: 'bold'
    },
    navOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    navOverlayText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    endNavBtn: {
        position: 'absolute',
        top: 178,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(30,30,30,0.85)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        zIndex: 100,
    },
    endNavBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
