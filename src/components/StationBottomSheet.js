import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, ScrollView, Image, PanResponder, Easing, Share, Linking, Platform, Alert } from 'react-native';
import { X, ChevronRight, Star, Zap, Clock, Share2, Navigation, Bookmark, HelpCircle } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.4;

export default function StationBottomSheet({
    station,
    chargers,
    visible,
    onClose,
    onSelectCharger
}) {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    // Cache last station to animate out smoothly
    const [lastStation, setLastStation] = useState(station);

    useEffect(() => {
        if (station) {
            setLastStation(station);
        }
    }, [station]);

    const activeStation = station || lastStation;

    const handleDirections = () => {
        if (!activeStation) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${activeStation.latitude},${activeStation.longitude}`;
        const label = activeStation.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleHelp = () => {
        // Placeholder for help/support
        console.log("Help pressed");
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this charging station: ${activeStation?.name || 'Bentork Station'} at ${activeStation?.location || 'Unknown Location'}`,
            });
        } catch (error) {
            console.log("Share Error:", error.message);
        }
    };

    // Pan Responder for Drag Gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    onClose(); // Close if dragged down enough
                } else {
                    // Snap back to top
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            // Slide Up
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0.5,
                    duration: 200, // Faster fade in
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            // Slide Down
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200, // Faster slide out
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 150, // Faster fade out
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    // ... hooks are called above ...

    const stationChargers = activeStation && chargers ? chargers.filter(c => c.stationId === activeStation.id) : [];

    return (
        <>
            {activeStation && (
                <>
                    {/* Background Overlay */}
                    <Animated.View
                        style={[
                            styles.overlay,
                            { opacity: overlayOpacity }
                        ]}
                        pointerEvents={visible ? "auto" : "none"}
                    >
                        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                    </Animated.View>

                    {/* Draggable Bottom Sheet */}
                    <Animated.View
                        style={[
                            styles.bottomSheet,
                            { transform: [{ translateY }] }
                        ]}
                    >
                        {/* Header / Drag Handle */}
                        <View style={styles.header} {...panResponder.panHandlers}>
                            <View style={styles.dragHandle} />
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.content}
                            contentContainerStyle={{ paddingBottom: 0 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.stationHeader}>
                                <View style={styles.stationInfo}>
                                    <Text style={styles.stationName} numberOfLines={1}>{activeStation.name}</Text>
                                    <Text style={styles.stationAddress} numberOfLines={2}>{activeStation.location || activeStation.address}</Text>

                                    <View style={styles.ratingRow}>
                                        <Star fill="#FFD700" color="#FFD700" size={16} />
                                        <Text style={styles.ratingText}>{activeStation.rating || '4.5'}</Text>
                                        <Text style={styles.ratingCount}>({activeStation.reviews || '128'} Reviews)</Text>
                                    </View>

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.actionChip} onPress={handleDirections}>
                                            <Navigation size={16} color="#aaa" />
                                            <Text style={styles.actionText}>Direction</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionChip} onPress={handleHelp}>
                                            <HelpCircle size={16} color="#aaa" />
                                            <Text style={styles.actionText}>Help</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionChip} onPress={handleShare}>
                                            <Share2 size={16} color="#aaa" />
                                            <Text style={styles.actionText}>Share</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Image
                                    source={{ uri: activeStation.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                    style={styles.stationImage}
                                />
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionTitle}>Available Chargers</Text>

                            {/* Chargers List */}
                            <View style={styles.chargersList}>
                                {stationChargers.length > 0 ? (
                                    stationChargers.map((charger) => (
                                        <TouchableOpacity
                                            key={charger.id}
                                            style={styles.chargerCard}
                                            onPress={() => onSelectCharger(charger)}
                                        >
                                            <View style={styles.chargerIconBox}>
                                                <Zap size={24} color="#00E5FF" fill="#00E5FF" />
                                            </View>
                                            <View style={styles.chargerInfo}>
                                                <Text style={styles.chargerTitle}>
                                                    Bentork {charger.chargerType || charger.type || 'Fast'}
                                                </Text>

                                                <View style={styles.idStatusRow}>
                                                    <Text style={[styles.availabilityText, { color: (charger.status === 'Available' || (!charger.occupied && charger.availability)) ? '#00E676' : '#FF4213' }]}>
                                                        {(charger.status === 'Available' || (!charger.occupied && charger.availability))
                                                            ? 'Available'
                                                            : (charger.status ? charger.status.charAt(0).toUpperCase() + charger.status.slice(1).toLowerCase() : 'Busy')}
                                                    </Text>
                                                    <Text style={styles.bulletPoint}>•</Text>
                                                    <Text style={styles.chargerIdSmall}>{charger.ocppId || charger.charger_id || charger.id || 'Unknown ID'}</Text>
                                                </View>

                                                <Text style={styles.connectorInfo}>
                                                    {charger.connectorType || charger.connector_type || ((charger.chargerType || '').toString().includes('AC') ? 'Type 2' : 'CCS 2')} • {charger.max_power || charger.rate || '120'} kW
                                                </Text>
                                                <Text style={styles.priceInfo}>₹{charger.price_per_kwh || charger.price || '18.00'} / kWh</Text>
                                            </View>
                                            <View style={styles.arrowBox}>
                                                <ChevronRight size={20} color="#fff" />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No chargers found for this station.</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </Animated.View>
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 1000, // Increased zIndex slightly to be safe
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '90%', // Limit max height, allowing auto-adjust below this
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        zIndex: 1001, // Stays above overlay
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 10,
        height: 40,
        justifyContent: 'center',
    },
    dragHandle: {
        width: 50,
        height: 5,
        backgroundColor: '#444',
        borderRadius: 3,
        position: 'absolute',
        top: 10,
    },
    content: {
        // Removed flex: 1 to allow auto height
        flexGrow: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    stationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        alignItems: 'flex-start',
    },
    stationInfo: {
        flex: 1,
        paddingRight: 10,
    },
    stationName: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
        flexWrap: 'wrap',
    },
    stationAddress: {
        color: '#aaa',
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    ratingText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    ratingCount: {
        color: '#777',
        fontSize: 12,
    },
    stationImage: {
        width: 80,
        height: 80,
        borderRadius: 15,
        backgroundColor: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    metaText: {
        color: '#aaa',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    chargersList: {
        paddingBottom: 40,
    },
    chargerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252525',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    chargerIconBox: {
        width: 45,
        height: 45,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    chargerInfo: {
        flex: 1,
    },
    chargerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    idStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    chargerIdSmall: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '500',
    },
    bulletPoint: {
        color: '#777',
        marginHorizontal: 6,
        fontSize: 12,
    },
    availabilityText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    connectorInfo: {
        color: '#aaa',
        fontSize: 13,
        marginBottom: 2,
    },
    priceInfo: {
        color: '#888',
        fontSize: 12,
    },
    arrowBox: {
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 8,
        marginLeft: 10,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#777',
        fontStyle: 'italic',
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        gap: 4
    },
    actionText: {
        color: '#ccc',
        fontSize: 12,
        fontWeight: '500'
    }
});
