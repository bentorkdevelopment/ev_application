import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User, LogOut, Bell, Shield, Smartphone, Code } from 'lucide-react-native';
import { authService } from '../services/auth';
import { sessionApi } from '../services/api'; // Added import
import { useAlert } from '../context/AlertContext';

export default function AccountsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const { showAlert } = useAlert();

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await authService.getUser();
        setUser(userData);
    };

    const performLogout = async () => {
        await authService.logout();
        // Reset navigation stack to Splash, which will likely redirect to Login
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

    const SettingItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, isDestructive && styles.destructiveIconContainer]}>
                    <Icon size={22} color={isDestructive ? "#FF4444" : "#fff"} />
                </View>
                <View>
                    <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>{title}</Text>
                    {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            {!isDestructive && <ChevronLight />}
        </TouchableOpacity>
    );

    const ChevronLight = () => (
        <View style={styles.chevronContainer}>
            {/* Using simple text or icon equivalent if ChevronRight not wanted, but ChevronRight is standard */}
            {/* Reusing the style from other screens usually involves ChevronRight */}
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* User Profile Section */}
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

                {/* Settings Groups */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Profile Settings</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem icon={User} title="Edit Profile" subtitle="Name, Phone, Email" onPress={() => { }} />
                        <SettingItem icon={Shield} title="Security" subtitle="Password, 2FA" onPress={() => { }} />
                        <SettingItem icon={Bell} title="Notifications" subtitle="Push, Email, SMS" onPress={() => { }} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>App Settings</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem icon={Smartphone} title="Device Preferences" subtitle="Theme, Language" onPress={() => { }} />
                    </View>
                </View>



                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut size={20} color="#FF4444" style={{ marginRight: 10 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>

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
        marginTop: 20,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
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
        borderColor: '#4CAF50', // Premium accent color
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
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    destructiveIconContainer: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    destructiveText: {
        color: '#FF4444',
    },
    settingSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1E1E',
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
