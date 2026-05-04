import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, Search, UserPlus, KeyRound, Smartphone, Layout, Code, Bell, Navigation, Car, TrendingUp, MapPin, Zap, FlaskConical, Shield, X } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { getSimulateRelease, setSimulateRelease } from '../utils/devSettings';
import UpdateRequiredModal from '../components/UpdateRequiredModal';

const DevMenuItem = ({ icon: Icon, title, subtitle, onPress, color = "#fff" }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <View style={[styles.iconBox, { borderColor: color }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.menuItemTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        <ChevronRight size={20} color="#444" />
    </TouchableOpacity>
);

export default function DeveloperScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [simulateRelease, setSimRelease] = useState(false);
    const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);

    useEffect(() => {
        getSimulateRelease().then(val => setSimRelease(val));
    }, []);

    const handleToggleSimulateRelease = async (value) => {
        setSimRelease(value);
        await setSimulateRelease(value);
        showAlert(
            value ? "Release Mode" : "Debug Mode",
            value
                ? "App will now respect Firebase maintenance config. Restart the app for full effect."
                : "Firebase maintenance config will be ignored. Restart the app for full effect."
        );
    };


    const handleTestNotification = async () => {
        try {
            // Request permissions (required for iOS)
            await notifee.requestPermission();

            // Create a channel (required for Android)
            const channelId = await notifee.createChannel({
                id: 'test-channel',
                name: 'Test Channel',
                importance: AndroidImportance.HIGH,
            });

            // Display a notification
            await notifee.displayNotification({
                title: 'Test Notification',
                body: 'This is a test notification from Developer Options 🚀',
                android: {
                    channelId,
                    smallIcon: 'ic_launcher', // verify if this resource exists, fallback if needed
                    pressAction: {
                        id: 'default',
                    },
                },
            });

            // Optional: Feedback toast/alert
            // showAlert("Success", "Notification dispatched!");
        } catch (error) {
            console.error("Notification failed", error);
            showAlert("Error", "Failed to trigger notification: " + error.message);
        }
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Developer Options</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Build Mode Section */}
                <Text style={styles.sectionTitle}>Build Mode</Text>
                <View style={styles.card}>
                    <View style={styles.toggleItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { borderColor: simulateRelease ? '#FF5252' : '#39E29B' }]}>
                                <Shield size={20} color={simulateRelease ? '#FF5252' : '#39E29B'} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.menuItemTitle}>Simulate Release</Text>
                                <Text style={styles.menuItemSubtitle}>
                                    {simulateRelease
                                        ? 'Maintenance config is active'
                                        : 'Maintenance config is ignored'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={simulateRelease}
                            onValueChange={handleToggleSimulateRelease}
                            trackColor={{ false: '#333', true: 'rgba(255, 82, 82, 0.4)' }}
                            thumbColor={simulateRelease ? '#FF5252' : '#39E29B'}
                        />
                    </View>
                    <View style={styles.buildModeIndicator}>
                        <View style={[styles.buildModeDot, { backgroundColor: simulateRelease ? '#FF5252' : '#39E29B' }]} />
                        <Text style={[styles.buildModeText, { color: simulateRelease ? '#FF5252' : '#39E29B' }]}>
                            {simulateRelease ? 'RELEASE BEHAVIOR' : 'DEBUG BEHAVIOR'}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>System States</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={TrendingUp}
                        title="Force Update Modal"
                        subtitle="Test the simplified update dialog"
                        color="#39E29B"
                        onPress={() => setIsUpdateModalVisible(true)}
                    />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Screen Previews</Text>
                <View style={styles.card}>

                    <DevMenuItem
                        icon={KeyRound}
                        title="Reset Password"
                        subtitle="Forgot password flow"
                        onPress={() => navigation.navigate('ResetPassword')}
                        color="#00E5FF"
                    />
                    <DevMenuItem
                        icon={Smartphone}
                        title="OTP Login"
                        subtitle="Phone number & OTP verification"
                        onPress={() => navigation.navigate('OtpLogin')}
                        color="#FFD740"
                    />
                </View>


                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Testing Tools</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={FlaskConical}
                        title="Test Screen"
                        subtitle="Component & UI playground"
                        color="#39E29B"
                        onPress={() => navigation.navigate('Test')}
                    />
                    <DevMenuItem
                        icon={Code}
                        title="Test Charging Session"
                        subtitle="Simulate active session"
                        color="#00E676"
                        onPress={() => navigation.navigate('Session', {
                            chargerId: 'DEV-CHG-01',
                            boxId: 'DEV-BOX-01',
                            stationName: 'Dev Simulation Station',
                            selectedKwh: '45',
                            planId: 'DEV-PLAN',
                            isDev: true,
                            latitude: 18.5204, // Pune Latitude
                            longitude: 73.8567 // Pune Longitude
                        })}
                    />
                    <DevMenuItem
                        icon={Code}
                        title="Test Invoice"
                        subtitle="View sample invoice"
                        color="#00E676"
                        onPress={() => navigation.navigate('Invoice', {
                            sessionData: {
                                id: 'DEV-INV-001',
                                startTime: new Date(Date.now() - 3600000).toISOString(),
                                endTime: new Date().toISOString(),
                                energyUsed: 22.5,
                                cost: 350.00
                            },
                            sessionId: 'DEV-SESS-001',
                            finalEnergy: 22.5,
                            finalDuration: 3600,
                            stationName: 'Dev Spec Station',
                            rate: '15.50',
                            connectorType: 'CCS2',
                            chargerType: 'DC Fast'
                        })}
                    />

                    <DevMenuItem
                        icon={Bell}
                        title="Test Notification"
                        subtitle="Trigger local alert"
                        color="#FF9800"
                        onPress={handleTestNotification}
                    />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>App Info</Text>
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Version: 1.0.0 (Dev)</Text>
                    <Text style={styles.infoText}>Build: {simulateRelease ? 'Debug (Simulating Release)' : 'Debug'}</Text>
                    <Text style={styles.infoText}>React Native: 0.72.6</Text>
                </View>

            </ScrollView>

            <UpdateRequiredModal
                visible={isUpdateModalVisible}
                onUpdate={() => setIsUpdateModalVisible(false)}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#333',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
    },
    textContainer: {
        justifyContent: 'center',
    },
    menuItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSubtitle: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    infoCard: {
        padding: 20,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
        gap: 8,
    },
    infoText: {
        color: '#888',
        fontFamily: 'monospace',
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    buildModeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 12,
        paddingTop: 4,
    },
    buildModeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    buildModeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    jsonContainer: {
        backgroundColor: '#121212',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    jsonText: {
        color: '#39E29B',
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 20,
    },
    closeBtn: {
        backgroundColor: '#39E29B',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
