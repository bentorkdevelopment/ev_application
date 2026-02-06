import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, X, Clock, Zap, Coffee, ShoppingBag, Filter } from 'lucide-react-native';

const CATEGORIES = [
    { id: '1', name: 'Fast Charging', icon: Zap },
    { id: '2', name: 'Restaurants', icon: Coffee },
    { id: '3', name: 'Shopping', icon: ShoppingBag },
    { id: '4', name: '24/7 Open', icon: Clock },
];

const RECENT_SEARCHES = [
    { id: '1', text: 'Connaught Place' },
    { id: '2', text: 'Cyber Hub, Gurgaon' },
    { id: '3', text: 'MG Road' },
];

const POPULAR_LOCATIONS = [
    { id: '1', name: 'DLF Mall of India', address: 'Sector 18, Noida', distance: '2.5 km', rating: 4.8 },
    { id: '2', name: 'Ambience Mall', address: 'Vasant Kunj, Delhi', distance: '5.2 km', rating: 4.5 },
    { id: '3', name: 'Pacific Mall', address: 'Tagore Garden, Delhi', distance: '8.0 km', rating: 4.2 },
];

export default function SearchScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [searchText, setSearchText] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

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
                        autoFocus={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                            <X size={16} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.filterBtn}>
                        <Filter size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Categories */}
                <Text style={styles.sectionTitle}>Categories</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                    contentContainerStyle={styles.categoriesContent}
                >
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                onPress={() => setActiveCategory(isActive ? null : cat.id)}
                            >
                                <Icon size={16} color={isActive ? "#000" : "#fff"} style={{ marginRight: 6 }} />
                                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Recent Searches */}
                {RECENT_SEARCHES.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Searches</Text>
                            <TouchableOpacity>
                                <Text style={styles.clearAllText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                        {RECENT_SEARCHES.map((item) => (
                            <TouchableOpacity key={item.id} style={styles.recentItem}>
                                <View style={styles.recentLeft}>
                                    <Clock size={16} color="#666" />
                                    <Text style={styles.recentText}>{item.text}</Text>
                                </View>
                                <TouchableOpacity>
                                    <X size={16} color="#444" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Popular / Results */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Popular Stations</Text>
                    {POPULAR_LOCATIONS.map((station) => (
                        <TouchableOpacity key={station.id} style={styles.stationCard}>
                            <View style={styles.stationIconContainer}>
                                <Zap size={20} color="#39E29B" />
                            </View>
                            <View style={styles.stationInfo}>
                                <Text style={styles.stationName}>{station.name}</Text>
                                <View style={styles.stationAddressRow}>
                                    <MapPin size={12} color="#888" />
                                    <Text style={styles.stationAddress}>{station.address}</Text>
                                </View>
                            </View>
                            <View style={styles.stationRight}>
                                <Text style={styles.distanceText}>{station.distance}</Text>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>★ {station.rating}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bottom Padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
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
});
