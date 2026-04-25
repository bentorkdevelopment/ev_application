import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, User, LogOut } from 'lucide-react-native';
import { authService } from '../services/auth';
import { sessionApi } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { Colors } from '../styles/GlobalStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AccountsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const { showAlert } = useAlert();
    const [loggingOut, setLoggingOut] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        loadUser();

        // Enter Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                damping: 20,
                stiffness: 90,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const closeSheet = () => {
        // Exit Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
        });
    };

    const loadUser = async () => {
        const userData = await authService.getUser();
        setUser(userData);
    };

    const performLogout = async () => {
        setLoggingOut(true);
        await authService.logout();
        setLoggingOut(false);
        navigation.reset({
            index: 0,
            routes: [{ name: 'Splash' }],
        });
    };

    const handleLogout = async () => {
        const currentUser = await authService.getUser();
        const userId = currentUser?.id || currentUser?.userId || currentUser?.email;
        let activeSessionId = null;

        if (userId) {
            try {
                const session = await sessionApi.getActiveSession(userId);
                if (session && session.status === 'ACTIVE') {
                    activeSessionId = session.sessionId;
                }
            } catch (e) {
                console.warn("Error checking session during logout:", e);
            }
        }

        if (activeSessionId) {
            showAlert(
                "Active Session Detected",
                "You have an ongoing charging session. Logging out will STOP this session automatically. Do you want to proceed?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Stop & Logout",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await sessionApi.stopSession(activeSessionId);
                            } catch (e) {
                                console.warn("Failed to stop session on logout", e);
                            }
                            await performLogout();
                        }
                    }
                ]
            );
        } else {
            showAlert(
                "Logout",
                "Are you sure you want to logout?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Logout",
                        style: "destructive",
                        onPress: performLogout
                    }
                ]
            );
        }
    };

    return (
        <View style={[styles.container, { justifyContent: 'flex-end' }]}>
            {/* Backdrop - animate opacity */}
            <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={closeSheet}
            >
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableOpacity>

            {/* Bottom Sheet Content - animate translation */}
            <Animated.View style={[
                styles.sheet,
                {
                    paddingBottom: insets.bottom + 20,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>

                {/* Drag Handle */}
                <View style={styles.handleContainer} pointerEvents="none">
                    <View style={styles.handle} />
                </View>

                {/* Header Actions */}
                <View style={styles.sheetHeader}>
                    <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                        <ChevronDown size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* User Profile */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {user?.imageUrl ? (
                            <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
                        ) : (
                            <User size={40} color="#fff" />
                        )}
                    </View>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <ActivityIndicator color="#FF4444" />
                    ) : (
                        <>
                            <LogOut size={20} color="#FF4444" style={{ marginRight: 10 }} />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#1E1E1E', // standard card/sheet color
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 3,
    },
    sheetHeader: {
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    closeBtn: {
        padding: 5,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.primary || '#00E676',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 14,
        color: '#aaa',
    },
    divider: {
        height: 1,
        backgroundColor: '#2A2A2A',
        marginBottom: 30,
        width: '100%',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF4444',
    },
    versionText: {
        textAlign: 'center',
        color: '#555',
        fontSize: 12,
    },
});
