import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming, 
    FadeInDown,
    Layout,
    FadeIn,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolation,
    FadeInLeft
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { ChevronRight, Car, Calendar, TrendingUp, Zap, MapPin, Layout as LayoutIcon } from 'lucide-react-native';
import { authService } from '../services/auth';
import { Colors } from '../styles/GlobalStyles';

const MenuItem = ({ icon: Icon, title, onPress, subtitle, showChevron = true, color = Colors.white, index = 0 }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const onPressIn = () => {
        scale.value = withSpring(0.97, { damping: 60, stiffness: 600 });
        opacity.value = withTiming(0.8, { duration: 100 });
    };

    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 60, stiffness: 600 });
        opacity.value = withTiming(1, { duration: 100 });
    };

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 50).springify().damping(60)}
            style={animatedStyle}
        >
            <Pressable
                style={styles.menuItem}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
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
        </Animated.View>
    );
};

export default function LibraryScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const [user, setUser] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const scrollY = useSharedValue(0);

    useEffect(() => {
        if (isFocused) {
            loadUser();
        }
    }, [isFocused]);

    const loadUser = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } finally {
            setIsLoaded(true);
        }
    };

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP);
        const translateY = interpolate(scrollY.value, [0, 50], [0, -10], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    return (
        <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            style={styles.container}
            contentContainerStyle={[styles.contentContainer]}
            showsVerticalScrollIndicator={false}
        >
            



            <Animated.View 
                entering={FadeIn.duration(400)}
                style={styles.sectionContainer}
            >
                <Animated.Text 
                    entering={FadeInDown.delay(300).springify()}
                    style={styles.sectionTitle}
                >
                    My Activity
                </Animated.Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={Zap}
                        title="Active Sessions"
                        onPress={() => navigation.navigate('ActiveSessions')}
                        index={0}
                    />
                    <MenuItem
                        icon={Calendar}
                        title="My Bookings"
                        onPress={() => navigation.navigate('MyBookings')}
                        index={1}
                    />
                    <MenuItem
                        icon={Car}
                        title="My Vehicles"
                        onPress={() => navigation.navigate('VehicleDetails')}
                        index={2}
                    />
                    <MenuItem
                        icon={TrendingUp}
                        title="Charging Insights"
                        onPress={() => navigation.navigate('ChargingInsights')}
                        index={3}
                    />
                    <MenuItem
                        icon={MapPin}
                        title="Trip Planner (Beta)"
                        onPress={() => navigation.navigate('TripPlanner')}
                        index={4}
                    />
                </View>
            </Animated.View>

            {/* Developer Section */}
            {(user && (user.email?.toLowerCase().includes('om.lokhande34') || user.email?.toLowerCase().includes('jayeshmahajan340') || user.email?.toLowerCase().includes('sj020420'))) && (
                <Animated.View 
                    layout={Layout.springify()}
                    entering={FadeInDown.springify().damping(60)}
                    style={styles.sectionContainer}
                >
                    <Text style={styles.sectionTitle}>Developer</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon={LayoutIcon}
                            title="Developer Options"
                            onPress={() => navigation.navigate('DeveloperOptions')}
                            index={6}
                        />
                    </View>
                </Animated.View>
            )}





            <View style={{ height: 100 + insets.bottom }} />
        </Animated.ScrollView>
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
        backgroundColor: '#141414ff',
        borderRadius: 1,
        overflow: 'hidden',
    },
    // Menu Item
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 14,
        paddingHorizontal: 4,
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
