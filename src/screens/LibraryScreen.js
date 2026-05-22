import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { ChevronRight, Car, Calendar, TrendingUp, Zap, MapPin, Layout as LayoutIcon } from 'lucide-react-native';
import { authService } from '../services/auth';
import { Colors } from '../styles/GlobalStyles';

const MenuItem = ({ icon: Icon, title, onPress, subtitle, showChevron = true, color = Colors.white, index = 0 }) => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const opacity = React.useRef(new Animated.Value(1)).current;
    const enterAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(enterAnim, {
            toValue: 1,
            duration: 500,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);

    const animatedStyle = {
        transform: [
            { scale },
            {
                translateY: enterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            },
        ],
        opacity: Animated.multiply(opacity, enterAnim),
    };

    const onPressIn = () => {
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
        Animated.timing(opacity, { toValue: 0.8, duration: 100, useNativeDriver: true }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    };

    return (
        <Animated.View 
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
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isFocused) {
            const task = InteractionManager.runAfterInteractions(() => {
                loadUser();
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            });
            return () => task.cancel();
        } else {
            fadeAnim.setValue(0);
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

    return (
        <Animated.ScrollView
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            style={styles.container}
            contentContainerStyle={[styles.contentContainer]}
            showsVerticalScrollIndicator={false}
        >
            
            <Animated.View 
                style={[styles.sectionContainer, { opacity: fadeAnim }]}
            >
                <Animated.Text 
                    style={[styles.sectionTitle, {
                        transform: [{
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            })
                        }]
                    }]}
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
                    style={[styles.sectionContainer, { opacity: fadeAnim }]}
                >
                    <Animated.Text 
                        style={[styles.sectionTitle, {
                            transform: [{
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                })
                            }]
                        }]}
                    >
                        Developer
                    </Animated.Text>
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
        fontFamily: 'Google Sans',
    },
    menuGroup: {
        backgroundColor: '#141414ff',
        borderRadius: 1,
        overflow: 'hidden',
    },
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
        fontFamily: 'Google Sans',
    },
    menuItemSubtitle: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
        fontFamily: 'Google Sans',
    },
});
