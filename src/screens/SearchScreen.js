import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, StatusBar, Animated, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, X, Clock, Zap, Coffee, ShoppingBag, Filter } from 'lucide-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { stationsApi, chargersApi } from '../services/api'; // Added chargersApi
import StationBottomSheet from '../components/StationBottomSheet'; // Added StationBottomSheet

// Categories Constant
const CATEGORIES = [
    { id: '1', name: 'Fast Charging', icon: Zap },
    { id: '2', name: 'Restaurants', icon: Coffee },
    { id: '3', name: 'Shopping', icon: ShoppingBag },
    { id: '4', name: '24/7 Open', icon: Clock },
];

const RECENT_SEARCHES_KEY = '@recent_searches';

const StationItem = ({ station, index, onPress }) => { // Added onPress prop
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Stagger the first 10 items, then animate subsequent items immediately on mount (scroll)
        const delay = index < 10 ? index * 100 : 0;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 250,
                delay: delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            }}
        >
            <TouchableOpacity style={styles.stationCard} onPress={() => onPress(station)}>
                <View style={styles.stationIconContainer}>
                    <Zap size={20} color="#39E29B" />
                </View>
                <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <View style={styles.stationAddressRow}>
                        <MapPin size={12} color="#888" />
                        <Text style={styles.stationAddress}>
                            {station.locationName || 'Unknown Location'}
                        </Text>
                    </View>
                    <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                        Status: <Text style={{ color: station.status === 'ACTIVE' ? '#39E29B' : '#FF6B6B' }}>{station.status}</Text>
                    </Text>
                </View>
                <View style={styles.stationRight}>
                    <Text style={styles.distanceText}>
                        {/* Mock distance/rating as it's not in StationDTO */}
                        - km
                    </Text>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>★ 4.5</Text>
                    </View>
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
    const [allChargers, setAllChargers] = useState([]); // Added chargers state
    const [selectedStation, setSelectedStation] = useState(null); // Added selectedStation
    const [isSheetVisible, setIsSheetVisible] = useState(false); // Added sheet visibility
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStations();
        loadRecentSearches();
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

        // Remove duplicates and keep top 5
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
            const [stationsData, chargersData] = await Promise.all([
                stationsApi.getAllStations(),
                chargersApi.getAllChargers().catch(e => [])
            ]);
            console.log('Fetched stations:', stationsData.length);
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

        // 1. Text Filter
        if (query) {
            result = result.filter(station =>
                (station.name?.toLowerCase() || '').includes(query) ||
                (station.locationName?.toLowerCase() || '').includes(query)
            );
        }

        // 2. Category Filter (Mock Logic as backend data might not have these tags yet)
        if (activeCategory) {
            // For now, if 'Fast Charging' is selected, we could filter by rate > 50 if available, 
            // but since data is limited, we will just simulate filtering or show all if logic is missing.
            // Example real logic:
            // if (activeCategory === '1') result = result.filter(s => s.chargers?.some(c => c.rate >= 50));
        }

        return result;
    }, [stations, searchText, activeCategory]);

    const handleSearchSubmit = () => {
        addRecentSearch(searchText);
    };

    const handleStationPress = (station) => {
        console.log('Station pressed:', station?.name);
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
            {/* Header Area */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find Stations</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by location, station..."
                        placeholderTextColor="#666"
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                        autoFocus={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                            <X size={16} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.filterBtn, activeCategory && { backgroundColor: 'rgba(57, 226, 155, 0.2)' }]}
                        onPress={() => setFilterVisible(true)}
                    >
                        <Filter size={20} color={activeCategory ? "#39E29B" : "#fff"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Searches - Only show if no search text and list is not empty */}
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
                                addRecentSearch(item.text); // Move to top logic
                            }}
                        >
                            <View style={styles.recentLeft}>
                                <Clock size={16} color="#666" />
                                <Text style={styles.recentText}>{item.text}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeRecentSearch(item.id)}>
                                <X size={16} color="#444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>
                    {searchText.length > 0 ? 'Search Results' : 'All Stations'}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            <FlatList
                data={filteredStations}
                renderItem={({ item, index }) => <StationItem station={item} index={index} onPress={handleStationPress} />}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    !loading && (
                        <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>No stations found</Text>
                    )
                }
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                                <X size={24} color="#fff" />
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
                                        style={[styles.categoryChip, styles.modalCategoryChip, isActive && styles.categoryChipActive]}
                                        onPress={() => {
                                            setActiveCategory(isActive ? null : cat.id);
                                            // Optional: Close modal on selection? 
                                            // setFilterVisible(false);
                                        }}
                                    >
                                        <Icon size={16} color={isActive ? "#000" : "#fff"} style={{ marginRight: 6 }} />
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
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#121212',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 54,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    clearBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        marginRight: 10,
    },
    filterBtn: {
        padding: 8,
        borderLeftWidth: 1,
        borderLeftColor: '#333',
        paddingLeft: 12,
    },
    scrollContent: {
        paddingTop: 10,
    },
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 20, // Align with padding
    },
    clearAllText: {
        color: '#39E29B',
        fontSize: 13,
        fontWeight: '500',
    },
    // Categories
    categoriesScroll: {
        marginBottom: 8,
    },
    categoriesContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#333',
    },
    categoryChipActive: {
        backgroundColor: '#39E29B',
        borderColor: '#39E29B',
    },
    categoryText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#000',
        fontWeight: '600',
    },
    // Recent Searches
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    recentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recentText: {
        color: '#aaa',
        fontSize: 15,
        marginLeft: 12,
    },
    // Station Cards
    stationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    stationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(57, 226, 155, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    stationInfo: {
        flex: 1,
    },
    stationName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    stationAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stationAddress: {
        color: '#888',
        fontSize: 12,
        marginLeft: 4,
    },
    stationRight: {
        alignItems: 'flex-end',
    },
    distanceText: {
        color: '#39E29B',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    ratingBadge: {
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    ratingText: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalLabel: {
        fontSize: 16,
        color: '#888',
        marginBottom: 12,
        fontWeight: '600',
    },
    modalCategories: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    modalCategoryChip: {
        marginBottom: 4,
    },
    applyBtn: {
        backgroundColor: '#39E29B',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
