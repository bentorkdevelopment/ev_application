import React, { useState, useEffect } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Share, Platform, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import { ChevronLeft, Navigation, Star, Share2, Phone, HelpCircle, Utensils, Coffee, ShoppingBag, ChevronRight } from 'lucide-react-native';

import BoltIcon from '../assets/icons/Rounded Fill/bolt_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import NavigationIcon from '../assets/icons/Rounded Fill/navigation_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import WarningIcon from '../assets/icons/Rounded Fill/warning_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import CallIcon from '../assets/icons/Rounded Fill/call_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import ShareIcon from '../assets/icons/Rounded Fill/share_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';
import HelpIcon from '../assets/icons/Rounded Fill/help_24dp_E3E3E3_FILL1_wght500_GRAD200_opsz24.svg';

import { getConnectorIcon } from '../utils/connectorUtils';
import { parseMaintenanceDate, isTodayOrFuture } from '../utils/dateUtils';
import { shouldRespectMaintenance } from '../utils/devSettings';
import EmergencyContactDialog from '../components/EmergencyContactDialog';
import StationReviewsTab from '../components/StationReviewsTab';

export default function StationDetailsScreen({ route, navigation }) {
    const { station, chargers, nearbyCafes = [] } = route.params || {};
    const [activeFilter, setActiveFilter] = useState('All');
    const [showEmergency, setShowEmergency] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [maintenanceDate, setMaintenanceDate] = useState('');

    // Fetch Remote Config maintenance_key & maintenance_date
    useEffect(() => {
        const fetchMaintenance = async () => {
            // Controlled by Developer Settings toggle
            const respectMaintenance = await shouldRespectMaintenance();
            if (!respectMaintenance) {
                setIsMaintenance(false);
                setMaintenanceDate('');
                return;
            }
            try {
                const defaults = {
                    maintenance_key: false,
                    maintenance_date: ''
                };
                await remoteConfig().setDefaults(defaults);
                await remoteConfig().fetchAndActivate();

                setIsMaintenance(remoteConfig().getValue('maintenance_key').asBoolean());
                setMaintenanceDate(remoteConfig().getValue('maintenance_date').asString());
            } catch (e) {
                try {
                    setIsMaintenance(remoteConfig().getValue('maintenance_key').asBoolean());
                    setMaintenanceDate(remoteConfig().getValue('maintenance_date').asString());
                } catch (_) {
                    setIsMaintenance(false);
                    setMaintenanceDate('');
                }
            }
        };
        fetchMaintenance();
    }, []);

    // If no station data, go back
    if (!station) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>Station details not found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: Colors.primaryContainer }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const stationChargers = chargers ? chargers.filter(c => c.stationId === station.id) : [];

    const handleDirections = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${station.latitude},${station.longitude}`;
        const label = station.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this charging station: ${station.name} at ${station.location}`,
            });
        } catch (error) {
            console.log("Share Error:", error.message);
        }
    };

    const handleSelectCharger = (charger) => {
        // Create a simplified charger object or pass as is depending on ConfigScreen requirements
        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        const isAC = typeStr.includes('AC');
        const fallbackConnector = isAC ? 'Type 2' : 'CCS 2';

        // Prepare initial config state
        const initialConfig = {
            stationName: station.name,
            chargerId: charger.id, // Internal ID
            boxId: charger.boxId || charger.charger_id || charger.ocppId, // Box ID for session
            ocppId: charger.charger_id || charger.ocppId || `CHG-${charger.id}`, // Display ID
            connectorType: charger.connectorType || charger.connector_type || fallbackConnector,
            maxPower: charger.max_power || charger.rate || 60,
            rate: charger.price_per_kwh || charger.price || 18,
            chargerType: charger.chargerType || (charger.max_power <= 22 ? 'AC' : 'DC'), // Infer if missing
            status: charger.status, // Pass status for ConfigScreen display
            latitude: station.latitude,
            longitude: station.longitude
        };

        navigation.navigate('Config', {
            ...initialConfig,
            stationId: station.id
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color="white" size={28} />
                </TouchableOpacity>
                {/* <Text style={styles.headerTitle} numberOfLines={1}>{station.name}</Text> */}
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Station Info Card */}
                <View style={styles.stationHeader}>
                    <View style={styles.stationInfo}>
                        <Text style={styles.stationName}>{station.name}</Text>
                        <Text style={styles.stationAddress}>
                            {station.locationName || station.location || station.address || 'Unknown Location'}
                        </Text>

                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusPill,
                                { backgroundColor: station.status === 'ACTIVE' ? Colors.primaryContainer : 'rgba(244, 67, 54, 0.2)' }
                            ]}>
                                <BoltIcon width={16} height={16} fill={station.status === 'ACTIVE' ? Colors.matteBlack : Colors.statusRed} />
                                <Text style={[styles.statusText, { color: station.status === 'ACTIVE' ? Colors.matteBlack : Colors.statusRed }]}>
                                    {station.status === 'ACTIVE' ? 'Operational' : 'Non-Operational'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.ratingRow}>
                            <Star fill="#FFD700" color="#FFD700" size={16} />
                            <Text style={styles.ratingText}>{station.rating ? Number(station.rating).toFixed(1) : '4.5'}</Text>
                            <Text style={styles.ratingCount}>({station.reviews || station.reviewCount || '0'} Reviews)</Text>
                        </View>
                    </View>
                    <Image
                        source={{ uri: station.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7' }}
                        style={styles.stationImage}
                    />
                </View>

                {/* Actions Row */}
                <View style={styles.actionsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
                        <TouchableOpacity
                            style={[styles.actionChip, styles.primaryAction]}
                            onPress={handleDirections}
                        >
                            <NavigationIcon width={20} height={20} fill={Colors.matteBlack} />
                            <Text style={[styles.actionText, styles.primaryActionText]}>Navigate</Text>
                        </TouchableOpacity>



                        <TouchableOpacity
                            style={[styles.actionChip, styles.secondaryAction]}
                            onPress={() => setShowEmergency(true)}
                        >
                            <CallIcon width={18} height={18} fill="#FFFFFF" />
                            <Text style={[styles.actionText, styles.secondaryActionText]}>Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionChip, styles.iconAction]}
                            onPress={() => { }}
                        >
                            <HelpIcon width={22} height={22} fill="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionChip, styles.iconAction]}
                            onPress={handleShare}
                        >
                            <ShareIcon width={18} height={18} fill="#FFFFFF" />
                        </TouchableOpacity>
                    </ScrollView>
                </View>


                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Overview' && styles.activeTabButton]}
                        onPress={() => setActiveTab('Overview')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Overview' && styles.activeTabText]}>Overview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Review' && styles.activeTabButton]}
                        onPress={() => setActiveTab('Review')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Review' && styles.activeTabText]}>Reviews</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Features' && styles.activeTabButton]}
                        onPress={() => setActiveTab('Features')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Features' && styles.activeTabText]}>Features</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'Overview' && (
                    <View>

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
                                            onPress={() => handleSelectCharger(charger)}
                                            disabled={isOffline}
                                        >
                                            {isAvail ? (
                                                <LinearGradient
                                                    colors={Colors.primaryGradient}
                                                    locations={[0.4, 1]}
                                                    style={{ width: 4, height: '80%', borderRadius: 2, marginRight: 16 }}
                                                />
                                            ) : (
                                                <View style={{ width: 4, height: '80%', backgroundColor: pillColor, borderRadius: 2, marginRight: 16 }} />
                                            )}
                                            <View style={styles.chargerIconBox}>
                                                <Image
                                                    source={getConnectorIcon(charger.connectorType || charger.connector_type)}
                                                    style={{ width: isOffline ? 28 : 40, height: isOffline ? 28 : 40, opacity: isOffline ? 0.5 : 1, tintColor: isOffline ? '#ccc' : '#fff' }}
                                                    resizeMode="contain"
                                                />
                                            </View>
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
                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                {!isOffline && <ChevronRight size={20} color="#555" />}
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

                        {/* Maintenance Banner – shows if isMaintenance is true OR if there's a future maintenance date */}
                        {(() => {
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

                        {nearbyCafes.length > 0 && <View style={styles.divider} />}

                        {/* Amenities */}
                        {nearbyCafes.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Amenities</Text>

                                {/* Filters */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 15 }}>
                                    {['All', 'Cafes', 'Malls', 'Restaurants'].map((filter) => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                            onPress={() => setActiveFilter(filter)}
                                        >
                                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.nearbyContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                                        {nearbyCafes.filter(c => {
                                            if (activeFilter === 'All') return true;
                                            const type = c.type;
                                            if (activeFilter === 'Cafes') return type === 'Cafe';
                                            if (activeFilter === 'Malls') return type === 'Shopping mall' || type === 'Mall';
                                            if (activeFilter === 'Restaurants') return type === 'Restaurant' || type === 'Rest stop';
                                            return true;
                                        }).map((cafe, index) => (
                                            <TouchableOpacity key={`cafe_${index}`} style={styles.cafeCard} activeOpacity={0.8} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${cafe.geometry?.location?.lat},${cafe.geometry?.location?.lng}`)}>
                                                {cafe.photoUrl ? (
                                                    <Image source={{ uri: cafe.photoUrl }} style={styles.cafeImage} />
                                                ) : (
                                                    <View style={styles.cafeImagePlaceholder}>
                                                        {(cafe.type === 'Rest stop' || cafe.type === 'Restaurant') ? <Utensils size={36} color="#D7CCC8" /> :
                                                            (cafe.type === 'Shopping mall' || cafe.type === 'Mall' ? <ShoppingBag size={36} color="#D7CCC8" /> : <Coffee size={36} color="#D7CCC8" />)}
                                                    </View>
                                                )}
                                                <View style={styles.cafeCardContent}>
                                                    <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                                        <Text style={styles.cafeRating}>★ {cafe.rating}</Text>
                                                        <Text style={{ color: cafe.isOpen ? Colors.statusGreen : Colors.statusRed, fontSize: 11, fontWeight: 'bold' }}>
                                                            {cafe.isOpen ? 'Open' : 'Closed'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {activeTab === 'Review' && (
                    <StationReviewsTab stationId={station.id} stationName={station.name} />
                )}

                {activeTab === 'Features' && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, height: 200 }}>
                        <Star size={40} color={Colors.primaryContainer} style={{ marginBottom: 16 }} />
                        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: 'bold' }}>Features</Text>
                        <Text style={{ color: '#aaa', marginTop: 8 }}>Coming Soon</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <EmergencyContactDialog
                visible={showEmergency}
                onClose={() => setShowEmergency(false)}
                stationId={station?.id}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#151515ff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    stationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    stationInfo: {
        flex: 1,
        paddingRight: 15,
    },
    stationName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    stationAddress: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 5,
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
        width: 100,
        height: 100,
        borderRadius: 16,
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444'
    },
    statusRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 4,
        borderRadius: 28,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionsContainer: {
        marginBottom: 20,
        height: 50,
        marginHorizontal: -20,
    },
    actionsScroll: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        paddingHorizontal: 20
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
        height: 48,
        paddingHorizontal: 20,
    },
    primaryAction: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryActionText: {
        color: Colors.matteBlack,
        fontWeight: '900',
        fontSize: 15,
        marginLeft: 8,
    },
    secondaryAction: {
        backgroundColor: '#363636ff',
    },
    secondaryActionText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
    iconAction: {
        width: 52,
        paddingHorizontal: 0,
        backgroundColor: '#363636ff',
    },
    actionText: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    chargersList: {
        marginBottom: 0,
    },
    chargerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2f2f2fff',
        borderRadius: 28,
        padding: 16,
        marginBottom: 12,
    },
    chargerIconBox: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    chargerInfo: {
        flex: 1,
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
    priceInfo: {
        color: '#888',
        fontSize: 13,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#777',
        fontStyle: 'italic',
    },
    // Maintenance Banner
    maintenanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 171, 0, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 171, 0, 0.35)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 8,
        marginBottom: 4,
    },
    maintenanceBannerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 171, 0, 0.22)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    maintenanceBannerContent: {
        flex: 1,
    },
    maintenanceBannerTitle: {
        color: '#FFAB00',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    maintenanceBannerSubtitle: {
        color: 'rgba(255, 200, 80, 0.85)',
        fontSize: 11,
        lineHeight: 15,
    },
    // Amenities
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: '#333',
    },
    filterChipActive: {
        backgroundColor: Colors.white,
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
    nearbyContainer: {
        marginTop: 10,
    },
    cafeCard: {
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        marginRight: 12,
        width: 140,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    cafeImage: {
        width: 140,
        height: 140, // 1:1 Aspect Ratio
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
        fontWeight: '600',
        marginBottom: 2,
    },
    cafeRating: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tabButton: {
        marginRight: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTabButton: {
        borderBottomWidth: 2, // Handled by indicator view
        borderBottomColor: Colors.primaryContainer,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: Colors.primaryContainer,
        borderRadius: 2,
    }
});
