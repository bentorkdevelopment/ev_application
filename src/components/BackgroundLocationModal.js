// src/components/BackgroundLocationModal.js
// Play Store Compliant – Prominent Disclosure for Background Location
// Shown ONCE per device install, just after the user first reaches HomeScreen.

import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    PermissionsAndroid,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, Zap } from 'lucide-react-native';
import { authService } from '../services/auth';

/**
 * BackgroundLocationModal
 *
 * Props:
 *  visible  {boolean}   – controls modal visibility
 *  onDone   {function}  – called after user taps Allow OR Not Now (modal dismissed)
 */
export default function BackgroundLocationModal({ visible, onDone }) {
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.88);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const handleAllow = async () => {
        // Mark shown first (so we don't loop even if permission fails)
        await authService.setBgLocationConsentShown();

        if (Platform.OS === 'android') {
            try {
                // Step 1: Ensure foreground location is granted (required before bg on Android 11+)
                const fgGranted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );

                if (!fgGranted) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Location Access',
                            message: 'Bentork EV needs your location to find nearby charging stations.',
                            buttonPositive: 'Allow',
                            buttonNegative: 'Deny',
                        }
                    );
                }

                // Step 2: Request background location (Android 10+)
                if (Platform.Version >= 29) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                        {
                            title: 'Allow Background Location',
                            message:
                                'To monitor your charging session and send arrival / departure alerts, ' +
                                'Bentork EV needs location access even when the app is in the background.\n\n' +
                                'On the next screen, please select "Allow all the time".',
                            buttonPositive: 'Continue',
                            buttonNegative: 'Skip',
                        }
                    );
                }
            } catch (err) {
                console.warn('Background location permission error:', err);
            }
        }

        onDone?.();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => { /* intentionally blocked */ }}
        >
            {/* Dim overlay */}
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    {/* Icon Badge */}
                    <View style={styles.iconBadge}>
                        <Navigation size={26} color="#39E29B" />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Background Location Access</Text>
                    <Text style={styles.subtitle}>
                        Allow Bentork EV to access your location{' '}
                        <Text style={styles.highlight}>even when the app is closed</Text>
                    </Text>

                    {/* Feature list */}
                    <View style={styles.featureList}>
                        <FeatureRow
                            Icon={MapPin}
                            text="Find the nearest available charger in real time"
                        />
                        <FeatureRow
                            Icon={Zap}
                            text="Monitor your charging session and notify you when it's complete"
                        />
                        <FeatureRow
                            Icon={Navigation}
                            text="Auto-detect your arrival and departure at stations"
                        />
                    </View>

                    {/* Privacy note */}
                    <Text style={styles.privacyNote}>
                        Your location is{' '}
                        <Text style={styles.privacyHighlight}>never sold to third parties</Text>
                        {' '}and is processed per our{' '}
                        <Text
                            style={styles.link}
                            onPress={() => Linking.openURL('https://bentork.in/privacy-policy')}
                        >
                            Privacy Policy
                        </Text>
                        .{'\n'}You can revoke access anytime in{' '}
                        <Text style={styles.privacyHighlight}>Settings → Apps → Bentork EV → Permissions</Text>.
                    </Text>

                    {/* CTA buttons */}
                    <TouchableOpacity
                        style={styles.allowBtn}
                        onPress={handleAllow}
                        activeOpacity={0.85}
                        accessibilityLabel="Allow background location"
                    >
                        <Text style={styles.allowBtnText}>Allow Access</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

function FeatureRow({ Icon, text }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
                <Icon size={15} color="#39E29B" />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },

    card: {
        width: '100%',
        backgroundColor: '#161616',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 28,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(57,226,155,0.18)',
    },

    iconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(57,226,155,0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(57,226,155,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'center',
    },

    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 22,
    },

    highlight: {
        color: '#FFFFFF',
        fontWeight: '600',
    },

    featureList: {
        gap: 12,
        marginBottom: 20,
    },

    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },

    featureIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(57,226,155,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },

    featureText: {
        flex: 1,
        fontSize: 14,
        color: '#CCCCCC',
        lineHeight: 21,
    },

    privacyNote: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 22,
    },

    privacyHighlight: {
        color: '#777',
    },

    link: {
        color: '#39E29B',
        textDecorationLine: 'underline',
    },

    allowBtn: {
        backgroundColor: '#39E29B',
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },

    allowBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },

});
