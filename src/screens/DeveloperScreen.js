import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, Search, UserPlus, KeyRound, Smartphone, Layout, Code } from 'lucide-react-native';

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
                <Text style={styles.sectionTitle}>Screen Previews</Text>
                <View style={styles.card}>
                    <DevMenuItem
                        icon={Search}
                        title="Search Screen"
                        subtitle="Station search & filters"
                        onPress={() => navigation.navigate('Search')}
                        color="#39E29B"
                    />
                    <DevMenuItem
                        icon={UserPlus}
                        title="Register Screen"
                        subtitle="Sign up flow"
                        onPress={() => navigation.navigate('Register')}
                        color="#FF4081"
                    />
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
                            isDev: true
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
                        icon={Code}
                        title="Wallet Screen"
                        subtitle="Direct Access"
                        color="#00E676"
                        onPress={() => navigation.navigate('Wallet')}
                    />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>App Info</Text>
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Version: 1.0.0 (Dev)</Text>
                    <Text style={styles.infoText}>Build: Debug</Text>
                    <Text style={styles.infoText}>React Native: 0.72.6</Text>
                </View>

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
});
