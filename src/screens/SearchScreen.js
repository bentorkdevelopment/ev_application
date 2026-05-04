import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, StatusBar, Animated, Modal, Image, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search, MapPin, X, Clock, Zap, Coffee, ShoppingBag, Filter, Star } from 'lucide-react-native';
import BoltOutlineIcon from '../assets/icons/Outlined/bolt_24dp_E3E3E3_FILL0_wght300_GRAD0_opsz24.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stationsApi, chargersApi } from '../services/api';
import StationBottomSheet from '../components/StationBottomSheet';
import { Colors } from '../styles/GlobalStyles';
import remoteConfig from '@react-native-firebase/remote-config';
import { shouldRespectMaintenance } from '../utils/devSettings';

// Categories Constant
const CATEGORIES = [
    { id: '1', name: 'Fast Charging', icon: Zap },
    { id: '2', name: 'Restaurants', icon: Coffee },
    { id: '3', name: 'Shopping', icon: ShoppingBag },
    { id: '4', name: '24/7 Open', icon: Clock },
];

const RECENT_SEARCHES_KEY = '@recent_searches';

const StationItem = ({ station, index, onPress, connectorCount }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        const delay = index < 10 ? index * 80 : 0;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                delay: delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Helper for status color
    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'ACTIVE' || s === 'AVAILABLE' || s === 'ONLINE') return Colors.statusGreen;
        if (s === 'BUSY' || s === 'OCCUPIED' || s === 'CHARGING') return Colors.statusOrange;
        return Colors.statusRed;
    };

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.stationCard}
                activeOpacity={0.9}
                onPress={() => onPress(station)}
            >
                {/* Left: Image/Icon */}
                <View style={styles.stationImageContainer}>
                    {station.image_url ? (
                        <Image source={{ uri: station.image_url }} style={styles.stationImage} />
                    ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                            <BoltOutlineIcon width={32} height={32} fill={Colors.white} />
                        </View>
                    )}
                </View>

                {/* Center: Info */}
                <View style={styles.stationInfo}>
                    <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
                    <View style={styles.stationAddressRow}>
                        <MapPin size={12} color="#888" style={{ marginRight: 4 }} />
                        <Text style={styles.stationAddress} numberOfLines={1}>
                            {station.locationName || 'Unknown Location'}
                        </Text>
                    </View>

                    <View style={styles.statusRow}>
                        {connectorCount > 0 ? (
                            <Text style={styles.connectorInfo}>{connectorCount} Connectors</Text>
                        ) : null}
                    </View>
                </View>

                {/* Right: Actions/Rating */}
                <View style={styles.stationRight}>
                    <View style={styles.ratingBadge}>
                        <Star size={10} color="#FFD700" fill="#FFD700" style={{ marginRight: 2 }} />
                        <Text style={styles.ratingText}>4.5</Text>
                    </View>
                    <ChevronRight size={18} color="#666" style={{ marginTop: 12, marginRight: 4 }} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [searchText, setSearchText] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [isFilterVisible, setFilterVisible] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [stations, setStations] = useState([]);
    const [allChargers, setAllChargers] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [isSheetVisible, setIsSheetVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const searchInputRef = useRef(null);

    useEffect(() => {
        loadStations();
        loadRecentSearches();
        
        // Auto-focus search on mount
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const loadRecentSearches = async () => {
        try {
            const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (error) {
            console.log('Error loading recent searches:', error);
        }
    };

    const addRecentSearch = async (text) => {
        if (!text.trim()) return;
        const newSearch = { id: Date.now().toString(), text: text.trim() };
        const updated = [newSearch, ...recentSearches.filter(s => s.text.toLowerCase() !== text.trim().toLowerCase())].slice(0, 5);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const removeRecentSearch = async (id) => {
        const updated = recentSearches.filter(s => s.id !== id);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const clearAllRecentSearches = async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const loadStations = async () => {
        try {
            setLoading(true);
            
            // Check maintenance mode first before loading (controlled by Developer Settings toggle)
            const respectMaintenance = await shouldRespectMaintenance();
            if (respectMaintenance) {
                try {
                    const isMaintenance = remoteConfig().getValue('maintenance_key').asBoolean();
                    if (isMaintenance) {
                        setStations([]);
                        setAllChargers([]);
                        return;
                    }
                } catch (e) {
                    console.log('Error checking maintenance flag in search:', e);
                }
            }

            const [stationsData, chargersData] = await Promise.all([
                stationsApi.getAllStations(),
                chargersApi.getAllChargers().catch(e => [])
            ]);
            setStations(stationsData);
            setAllChargers(Array.isArray(chargersData) ? chargersData : (chargersData?.chargers || []));
        } catch (error) {
            console.error('Failed to load stations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStations = useMemo(() => {
        let result = stations;
        const query = searchText.toLowerCase();

        if (query) {
            result = result.filter(station =>
                (station.name?.toLowerCase() || '').includes(query) ||
                (station.locationName?.toLowerCase() || '').includes(query)
            );
        }

        if (activeCategory) {
            // Mock category filtering logic if needed
        }

        return result;
    }, [stations, searchText, activeCategory]);

    const handleSearchSubmit = () => {
        addRecentSearch(searchText);
    };

    const handleStationPress = (station) => {
        Keyboard.dismiss();
        setSelectedStation(station);
        setIsSheetVisible(true);
    };

    const handleSelectCharger = (charger) => {
        setIsSheetVisible(false);
        const typeStr = (charger.chargerType || charger.type || '').toString().toUpperCase();
        const isAC = typeStr.includes('AC');
        const fallbackConnector = isAC ? 'Type 2' : 'CCS 2';

        navigation.navigate('Config', {
            stationId: selectedStation?.id,
            stationName: selectedStation?.name,
            chargerId: charger.id || charger.charger_id || 'Unknown',
            boxId: charger.ocppId || charger.ocpp_id || 'Unknown',
            chargerType: charger.chargerType || charger.type || 'Fast',
            maxPower: charger.max_power || charger.rate || 'Unknown',
            connectorType: charger.connectorType || charger.connectorType || fallbackConnector,
            status: (charger.status === 'Available' || (!charger.occupied && charger.availability)) ? 'Available' : (charger.status || 'Busy')
        });
    };

    const handleCloseBottomSheet = () => {
        setIsSheetVisible(false);
    };

    const renderHeader = () => (
        <View>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find Stations</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchRow}>
                    <View style={styles.searchContainer}>
                        <Search size={20} color="#888" style={{ marginRight: 10 }} />
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search location or station..."
                            placeholderTextColor="#666"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchText('')}
                                style={styles.clearBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={16} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.filterBtn, activeCategory && styles.filterBtnActive]}
                        onPress={() => setFilterVisible(true)}
                    >
                        <Filter size={20} color={activeCategory ? Colors.matteBlack : Colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Searches */}
            {searchText.length === 0 && recentSearches.length > 0 && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        <TouchableOpacity onPress={clearAllRecentSearches}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentSearches.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.recentItem}
                            onPress={() => {
                                setSearchText(item.text);
                                addRecentSearch(item.text);
                            }}
                        >
                            <View style={styles.recentLeft}>
                                <Clock size={16} color="#666" />
                                <Text style={styles.recentText}>{item.text}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)} style={{ padding: 4 }}>
                                <X size={16} color="#444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                    {searchText.length > 0 ? 'Search Results' : 'All Stations'}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.matteBlack} />

            <FlatList
                data={filteredStations}
                renderItem={({ item, index }) => {
                    const stationChargers = allChargers.filter(c => (c.stationId || c.station_id || c.station) == item.id);
                    return (
                        <StationItem 
                            station={item} 
                            index={index} 
                            onPress={handleStationPress} 
                            connectorCount={stationChargers.length}
                        />
                    );
                }}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    !loading && (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Search size={48} color="#333" />
                            <Text style={{ color: '#666', marginTop: 10 }}>No stations found</Text>
                        </View>
                    )
                }
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                ListFooterComponent={<View style={{ height: 40 }} />}
            />

            {/* Filter Modal */}
            <Modal
                transparent={true}
                visible={isFilterVisible}
                animationType="fade"
                onRequestClose={() => setFilterVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Stations</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                <X size={24} color={Colors.white} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Categories</Text>
                        <View style={styles.modalCategories}>
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                        onPress={() => setActiveCategory(isActive ? null : cat.id)}
                                    >
                                        <Icon size={16} color={isActive ? Colors.matteBlack : Colors.white} style={{ marginRight: 6 }} />
                                        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => setFilterVisible(false)}
                        >
                            <Text style={styles.applyBtnText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <StationBottomSheet
                station={selectedStation}
                chargers={allChargers}
                visible={isSheetVisible}
                onClose={handleCloseBottomSheet}
                onSelectCharger={handleSelectCharger}
                navigation={navigation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    header: {
        paddingHorizontal: 0,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        padding: 5,
        marginRight: 10,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 24,
        fontWeight: 'bold',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBg, // #1E1E1E
        borderRadius: 24, // Pill shape
        paddingHorizontal: 16,
        paddingVertical: 12, // Increased height for easier tap
        marginRight: 12,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        color: Colors.white,
        fontSize: 16,
        paddingVertical: 0, // Reset default Android padding
    },
    clearBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        marginLeft: 8,
    },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    filterBtnActive: {
        backgroundColor: Colors.statusGreen,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    // Recent Searches
    sectionContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    clearAllText: {
        color: Colors.statusOrange,
        fontSize: 13,
        fontWeight: '500',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    recentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recentText: {
        color: '#ccc',
        fontSize: 16,
        marginLeft: 14,
    },
    // Station Cards
    stationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 6,
        borderRadius: 1,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#535353ff',
    },
    stationImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 14,
        backgroundColor: Colors.matteBlack,
    },
    stationImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stationInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    stationName: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    stationAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    stationAddress: {
        color: '#999',
        fontSize: 12,
        flex: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 6,
    },
    connectorInfo: {
        color: '#666',
        fontSize: 12,
    },
    stationRight: {
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        alignSelf: 'flex-start',
        paddingTop: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginEnd: 8,
    },
    ratingText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: Colors.cardBg,
        borderRadius: 36,
        padding: 24,
        paddingVertical: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.white,
    },
    modalLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    modalCategories: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipActive: {
        backgroundColor: Colors.statusGreen,
    },
    categoryText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: Colors.matteBlack,
        fontWeight: '700',
    },
    applyBtn: {
        backgroundColor: Colors.white,
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
        // Shadow/Glow
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    applyBtnText: {
        color: Colors.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
