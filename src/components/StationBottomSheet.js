import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, ScrollView, Image, PanResponder, Easing, Share, Linking, Platform, Alert } from 'react-native';
import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import BoltOutlineIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';


import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import { X, ChevronRight, Star, Clock, Share2, Bookmark, HelpCircle, Utensils, Coffee, ShieldAlert, Phone, ShoppingBag } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import { getConnectorIcon } from '../utils/connectorUtils';

import EmergencyContactDialog from './EmergencyContactDialog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.4;

export default function StationBottomSheet({
    station,
    chargers,
    visible,
    nearbyCafes = [],
    onClose,
    onSelectCharger,
    navigation
}) {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const isClosing = useRef(false);

    // Cache last station to animate out smoothly
    const [lastStation, setLastStation] = useState(station);
    const [showEmergency, setShowEmergency] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

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
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    // Prevent double animation conflict
                    isClosing.current = true;
                    onClose(); // Trigger state change immediately

                    // Animate out immediately
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                } else {
                    // Snap back to top
                    Animated.spring(translateY, {
                        toValue: 0,
                        bounciness: 1,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            isClosing.current = false;
            // Slide Up - Spring for smoothness
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 90,
                    mass: 0.8,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0.5,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            // Check if we are already closing manually
            if (isClosing.current) {
                isClosing.current = false; // Reset
                // Fade out overlay independently as manual animation only handles translateY
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
                return;
            }

            // Slide Down - Standard close
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 200,
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
                                    <Text style={styles.stationAddress} numberOfLines={2}>
                                        {activeStation.locationName || activeStation.location || activeStation.address || 'Unknown Location'}
                                    </Text>

                                    <View style={[styles.statusRow, { marginBottom: 8 }]}>
                                        <View style={[
                                            styles.statusPill,
                                            {
                                                backgroundColor: activeStation.status === 'ACTIVE' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                                borderWidth: 0
                                            }
                                        ]}>
                                            <BoltIcon width={16} height={16} fill={activeStation.status === 'ACTIVE' ? Colors.statusGreen : Colors.statusRed} />
                                            <Text style={[styles.statusText, { color: activeStation.status === 'ACTIVE' ? Colors.statusGreen : Colors.statusRed }]}>
                                                {activeStation.status === 'ACTIVE' ? 'Operational' : 'Non-Operational'}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.ratingRow}
                                        onPress={() => {
                                            onClose(); // Close sheet before navigating
                                            navigation.navigate('StationReviews', {
                                                stationId: activeStation.id,
                                                stationName: activeStation.name
                                            });
                                        }}
                                    >
                                        <Star fill="#FFD700" color="#FFD700" size={16} />
                                        <Text style={styles.ratingText}>{activeStation.rating ? Number(activeStation.rating).toFixed(1) : '4.5'}</Text>
                                        <Text style={styles.ratingCount}>({activeStation.reviews || activeStation.reviewCount || '0'} Reviews)</Text>
                                        <ChevronRight size={14} color="#777" />
                                    </TouchableOpacity>

                                </View>
                                <Image
                                    source={{ uri: activeStation.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                                    style={styles.stationImage}
                                />
                            </View>

                            <View style={{ marginTop: 0, marginBottom: 16, height: 50, marginHorizontal: -20 }}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20 }}
                                >
                                    <TouchableOpacity style={[styles.actionChip, { backgroundColor: '#FFFFFF' }]} onPress={handleDirections}>
                                        <NavigationIcon width={20} height={20} fill={Colors.matteBlack} />
                                        <Text style={[styles.actionText, { color: '#121212', fontWeight: 'bold' }]}>Navigate</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionChip} onPress={() => setShowEmergency(true)}>
                                        <Phone size={16} color="#ccc" />
                                        <Text style={[styles.actionText, { marginLeft: 6 }]}>Support</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.actionChip, { paddingHorizontal: 12 }]} onPress={handleHelp}>
                                        <HelpCircle size={20} color="#aaa" />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.actionChip, { paddingHorizontal: 12 }]} onPress={handleShare}>
                                        <Share2 size={20} color="#aaa" />
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Available Chargers</Text>

                            {/* Chargers List */}
                            <View style={styles.chargersList}>
                                {stationChargers.length > 0 ? (
                                    stationChargers.map((charger) => {
                                        const isAvail = charger.status === 'Available' || (!charger.occupied && charger.availability);
                                        const statusText = isAvail ? 'Available' : (charger.status ? charger.status.charAt(0).toUpperCase() + charger.status.slice(1).toLowerCase() : 'Busy');
                                        const isBusy = statusText === 'Busy';
                                        const isOffline = statusText === 'Offline';

                                        const pillColor = isAvail ? Colors.statusGreen : (isBusy ? Colors.statusOrange : (isOffline ? '#aaa' : Colors.statusRed));

                                        return (
                                            <TouchableOpacity
                                                key={charger.id}
                                                style={[styles.chargerCard, isOffline && { opacity: 0.6 }]}
                                                onPress={() => onSelectCharger(charger)}
                                                disabled={isOffline}
                                            >
                                                {/* Left Status Stripe */}
                                                <View style={{ width: 4, height: '80%', backgroundColor: pillColor, borderRadius: 2, marginRight: 16 }} />

                                                {/* Icon */}
                                                <View style={styles.chargerIconBox}>
                                                    {isOffline ? (
                                                        <Image
                                                            source={getConnectorIcon(charger.connectorType || charger.connector_type)}
                                                            style={{ width: 28, height: 28, opacity: 0.5, tintColor: '#ccc' }}
                                                            resizeMode="contain"
                                                        />
                                                    ) : (
                                                        <Image
                                                            source={getConnectorIcon(charger.connectorType || charger.connector_type)}
                                                            style={{ width: 40, height: 40, tintColor: '#fff' }}
                                                            resizeMode="contain"
                                                        />
                                                    )}
                                                </View>

                                                {/* Details */}
                                                <View style={styles.chargerInfo}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text style={styles.primaryInfoText}>
                                                            {charger.connectorType || charger.connector_type || ((charger.chargerType || '').toString().includes('AC') ? 'Type 2' : 'CCS 2')}
                                                        </Text>
                                                        <Text style={styles.separatorText}> • </Text>
                                                        <Text style={styles.connectorText}>
                                                            {charger.max_power || charger.rate || '120'} kW
                                                        </Text>
                                                    </View>

                                                    <Text style={[styles.priceInfo, { marginBottom: 4 }]}>
                                                        {(charger.chargerType || '').toString().includes('AC') || (charger.connectorType || '').toString().includes('Type 2') ? 'AC' : 'DC'} Charging
                                                    </Text>

                                                    <Text style={[styles.priceInfo]}>
                                                        Rate: ₹{charger.price_per_kwh || charger.price || '18.00'} / kWh
                                                    </Text>
                                                </View>

                                                {/* Right Action */}
                                                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                    {!isOffline && (
                                                        <ChevronRight size={20} color="#555" />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No chargers found for this station.</Text>
                                    </View>
                                )}
                            </View>

                            {/* Divider moved here */}
                            {nearbyCafes.length > 0 && <View style={styles.divider} />}

                            {/* Amenities Section - Moved Below Chargers */}
                            {nearbyCafes.length > 0 && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Amenities</Text>
                                    </View>

                                    {/* Filters */}
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 15 }}>
                                        {['All', 'Cafes', 'Malls', 'Restaurants'].map((filter) => (
                                            <TouchableOpacity
                                                key={filter}
                                                style={[
                                                    styles.filterChip,
                                                    activeFilter === filter && styles.filterChipActive
                                                ]}
                                                onPress={() => setActiveFilter(filter)}
                                            >
                                                <Text style={[
                                                    styles.filterText,
                                                    activeFilter === filter && styles.filterTextActive
                                                ]}>
                                                    {filter}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={styles.nearbyContainer}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 116 }}>
                                            {nearbyCafes.filter(c => {
                                                if (activeFilter === 'All') return true;
                                                const type = c.type;
                                                if (activeFilter === 'Cafes') return type === 'Cafe';
                                                if (activeFilter === 'Malls') return type === 'Shopping mall' || type === 'Mall';
                                                if (activeFilter === 'Restaurants') return type === 'Restaurant' || type === 'Rest stop';
                                                return true;
                                            }).map((cafe, index) => (
                                                <TouchableOpacity key={`cafe_${index}`} style={styles.cafeChip} activeOpacity={0.8} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${cafe.geometry?.location?.lat},${cafe.geometry?.location?.lng}`)}>
                                                    <View style={[styles.cafeIconCircle, { backgroundColor: '#3E2723' }]}>
                                                        {(cafe.type === 'Rest stop' || cafe.type === 'Restaurant') ? <Utensils size={14} color="#D7CCC8" /> :
                                                            (cafe.type === 'Shopping mall' || cafe.type === 'Mall' ? <ShoppingBag size={14} color="#D7CCC8" /> : <Coffee size={14} color="#D7CCC8" />)}
                                                    </View>
                                                    <View>
                                                        <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={styles.cafeRating}>★ {cafe.rating}</Text>
                                                            <Text style={{ color: '#aaa', fontSize: 11, marginLeft: 4 }}>• {cafe.vicinity || 'Nearby'}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </Animated.View>
                </>
            )}
            <EmergencyContactDialog
                visible={showEmergency}
                onClose={() => setShowEmergency(false)}
                stationId={activeStation?.id}
            />
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
        shadowOpacity: 0.6,
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
        width: 110,
        height: 110,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: Colors.cardBg,
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
        marginTop: 6,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    chargersList: {
        paddingBottom: 10,
    },
    chargerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252525', // Consider Colors.cardBg if available
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        // Removed border for cleaner look
    },
    chargerIconBox: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
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
        backgroundColor: '#33333309',
        borderRadius: 20,
        padding: 6,
        marginTop: 6
    },
    primaryInfoText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    separatorText: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 4,
    },
    connectorText: {
        fontSize: 14,
        color: '#ccc',
        fontWeight: '500',
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
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 12,
        gap: 6
    },
    actionText: {
        color: '#ccc',
        fontSize: 12,
        fontWeight: '500'
    },
    statusPillSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusTextSmall: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    // Nearby Cafes Styles
    nearbyContainer: {
        marginBottom: 30,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444',
    },
    filterChipActive: {
        backgroundColor: Colors.white, // or primary color
        borderColor: Colors.white,
    },
    filterText: {
        color: '#ccc',
        fontSize: 13,
        fontWeight: '500',
    },
    filterTextActive: {
        color: Colors.matteBlack,
        fontWeight: 'bold',
    },
    cafeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#333',
        minWidth: 140,
    },
    cafeIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cafeName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    cafeRating: {
        color: '#FFD700', // Gold
        fontSize: 11,
        fontWeight: 'bold',
    }
});
