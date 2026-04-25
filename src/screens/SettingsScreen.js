import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, ShieldCheck, ChevronRight, Lock, User, Smartphone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PinPromptModal from '../components/PinPromptModal';
import ReactNativeBiometrics from 'react-native-biometrics';

export default function SettingsScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // Settings States
    const [notifications, setNotifications] = useState(true);
    const [secureWallet, setSecureWallet] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showPinVerifyModal, setShowPinVerifyModal] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSecure = await AsyncStorage.getItem('secureWallet');
            if (savedSecure === 'true') {
                setSecureWallet(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleSecureWallet = async (value) => {
        if (value) {
            // Turning ON: Open Modal to Set PIN
            setShowPinModal(true);
        } else {
            // Turning OFF: verify identity
            try {
                const rnBiometrics = new ReactNativeBiometrics();
                const { available } = await rnBiometrics.isSensorAvailable();

                if (available) {
                    const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Confirm to disable Wallet Security' });
                    if (success) {
                        disableSecurity();
                    } else {
                        // Failed or cancelled? fallback to PIN if not cancelled
                        // But simplePrompt handles cancellation internally usually by returning success:false
                        // We can offer PIN if they prefer
                        Alert.alert("Authentication Failed", "Would you like to use PIN instead?", [
                            { text: "No", style: "cancel" },
                            { text: "Use PIN", onPress: () => setShowPinVerifyModal(true) }
                        ]);
                    }
                } else {
                    // No biometrics -> Prompt PIN
                    setShowPinVerifyModal(true);
                }
            } catch (error) {
                console.log("Biometric Error:", error);
                setShowPinVerifyModal(true); // Fallback to PIN
            }
        }
    };

    const disableSecurity = async () => {
        setSecureWallet(false);
        await AsyncStorage.setItem('secureWallet', 'false');
        Alert.alert("Security Disabled", "Wallet security has been turned off.");
    };

    const handlePinVerifySuccess = () => {
        setShowPinVerifyModal(false);
        disableSecurity();
    };

    const handlePinSetSuccess = () => {
        setSecureWallet(true);
        setShowPinModal(false);
        Alert.alert("Success", "Wallet Security Enabled. You can use PIN or Biometrics (if available) to access your wallet.");
    };

    const SettingItem = ({ icon: Icon, title, type = 'arrow', value, onValueChange, onPress }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={type === 'arrow' ? onPress : null}
            activeOpacity={type === 'arrow' ? 0.7 : 1}
        >
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    <Icon size={20} color="#fff" />
                </View>
                <Text style={styles.itemTitle}>{title}</Text>
            </View>

            {type === 'switch' && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#333', true: 'rgba(57, 226, 155, 0.5)' }}
                    thumbColor={value ? '#39E29B' : '#f4f3f4'}
                />
            )}

            {type === 'arrow' && (
                <ChevronRight size={20} color="#666" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <SettingItem
                        icon={User}
                        title="Edit Profile"
                        onPress={() => navigation.navigate('OnboardingSurvey')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon={Lock}
                        title="Forgot Password"
                        onPress={() => navigation.navigate('ResetPassword')}
                    />
                </View>

                {/* General Options */}
                <Text style={styles.sectionTitle}>General</Text>
                <View style={styles.card}>
                    <SettingItem
                        icon={Smartphone}
                        title="Device Preferences"
                        onPress={() => Alert.alert("Preferences", "Theme: Dark Mode (Default)\nLanguage: English")}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon={Bell}
                        title="Notifications"
                        type="switch"
                        value={notifications}
                        onValueChange={setNotifications}
                    />
                </View>

                {/* Security Add-on */}
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.card}>
                    <SettingItem
                        icon={ShieldCheck}
                        title="Secure Wallet"
                        type="switch"
                        value={secureWallet}
                        onValueChange={toggleSecureWallet}
                    />
                    {secureWallet && (
                        <Text style={styles.helperText}>
                            Wallet transactions will be protected by your device's default security (PIN, Fingerprint).
                        </Text>
                    )}
                </View>

            </ScrollView>

            <PinPromptModal
                visible={showPinModal}
                mode="set"
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSetSuccess}
            />

            <PinPromptModal
                visible={showPinVerifyModal}
                mode="verify"
                title="Enter PIN to Disable"
                onClose={() => setShowPinVerifyModal(false)}
                onSuccess={handlePinVerifySuccess}
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
        backgroundColor: '#121212',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
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
        padding: 20,
    },
    sectionTitle: {
        color: '#39E29B',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 48, // offset for icon
    },
    helperText: {
        color: '#888',
        fontSize: 12,
        marginLeft: 48,
        marginTop: -10,
        marginBottom: 12,
        lineHeight: 18,
    }
});
