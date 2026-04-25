import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Car, Calendar, TrendingUp, Layout, Zap, MapPin } from 'lucide-react-native';
import { authService } from '../services/auth';
import { Colors } from '../styles/GlobalStyles';

const MenuItem = ({ icon: Icon, title, onPress, subtitle, showChevron = true, color = Colors.white }) => (
    <Pressable
        style={({ pressed }) => [
            styles.menuItem,
            pressed && Platform.OS === 'ios' && { backgroundColor: 'rgba(255,255,255,0.05)' }
        ]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Icon size={22} color={color} />
        </View>
        <View style={styles.menuTextContainer}>
            <Text style={[styles.menuItemText, { color }]}>{title}</Text>
            {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
        {showChevron && <ChevronRight size={20} color="#555" />}
    </Pressable>
);

export default function LibraryScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await authService.getUser();
        console.log("LibraryScreen: Loaded user", userData);
        setUser(userData);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.contentContainer]}
            showsVerticalScrollIndicator={false}
        >



            {/* Menu Section 1 */}
            <View style={styles.sectionContainer}>
                {/* <Text style={styles.sectionTitle}>My Activity</Text> */}
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={Zap}
                        title="Active Sessions"
                        onPress={() => navigation.navigate('ActiveSessions')}
                    />
                    <MenuItem
                        icon={Calendar}
                        title="My Bookings"
                        onPress={() => navigation.navigate('MyBookings')}
                    />
                    <MenuItem
                        icon={Car}
                        title="My Vehicles"
                        onPress={() => navigation.navigate('VehicleDetails')}
                    />
                    <MenuItem
                        icon={TrendingUp}
                        title="Charging Insights"
                        onPress={() => navigation.navigate('ChargingInsights')}
                    />
                    <MenuItem
                        icon={MapPin}
                        title="Trip Planner (Beta)"
                        onPress={() => navigation.navigate('TripPlanner')}
                    />
                </View>
            </View>

            {/* Developer Section */}
            {(user && (user.email?.toLowerCase().includes('om.lokhande34') || user.email?.toLowerCase().includes('jayeshmahajan340') || user.email?.toLowerCase().includes('sj020420'))) && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Developer</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon={Layout}
                            title="Developer Options"
                            onPress={() => navigation.navigate('DeveloperOptions')}
                        />
                    </View>
                </View>
            )}





            <View style={{ height: 100 + insets.bottom }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#141414ff",
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.white,
        marginTop: 20,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
        marginTop: 4,
    },
    // Sections
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGroup: {
        backgroundColor: Colors.matteBlack,
        borderRadius: 20,
        overflow: 'hidden',
    },
    // Menu Item
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSubtitle: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
});
