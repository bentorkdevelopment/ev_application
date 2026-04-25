// src/screens/TermsConsentScreen.js
// Play Console compliant: Prominent Disclosure & Consent for Background Location
// Shown ONCE per device on first login or registration. No Decline option.

import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Linking, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, MapPin, Wifi, Bell, CheckCircle } from 'lucide-react-native';
import { authService } from '../services/auth';

export default function TermsConsentScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Where to go after accepting (passed as param from login/register flows)
    const nextScreen = route?.params?.nextScreen || 'Home';
    const nextParams = route?.params?.nextParams || {};

    const handleScroll = ({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingThreshold = 40;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingThreshold) {
            setHasScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (accepting) return;
        setAccepting(true);

        // Animate button press
        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();

        try {
            await authService.setTermsAccepted();
        } catch (e) {
            console.warn('Failed to save TC acceptance:', e);
        }

        // Navigate to destination (reset stack so user can't go back)
        navigation.reset({
            index: 0,
            routes: [{ name: nextScreen, params: nextParams }],
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIconContainer}>
                    <ShieldCheck size={28} color="#39E29B" />
                </View>
                <Text style={styles.headerTitle}>Before You Continue</Text>
                <Text style={styles.headerSubtitle}>
                    Please review how Bentork EV uses your data and device permissions.
                </Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}
            >
                {/* ─────────────────────────────────────────
                    SECTION 1: PROMINENT DISCLOSURE (Required by Play Console)
                    Background Location disclosure MUST appear before any permission request.
                ───────────────────────────────────────── */}
                <View style={styles.disclosureCard}>
                    <View style={styles.disclosureBadge}>
                        <Text style={styles.disclosureBadgeText}>IMPORTANT DATA DISCLOSURE</Text>
                    </View>

                    <Text style={styles.disclosureHeading}>Location & Background Access</Text>
                    <Text style={styles.disclosureBody}>
                        Bentork collects your <Text style={styles.bold}>precise location</Text>, including{' '}
                        <Text style={styles.bold}>background location</Text>, even when the app is minimized or not actively in use.
                    </Text>
                    <Text style={styles.disclosureBody}>
                        Background location is required to support the following core feature:
                    </Text>

                    <View style={styles.purposeList}>
                        <View style={styles.purposeItem}>
                            <MapPin size={16} color="#39E29B" style={styles.purposeIcon} />
                            <Text style={styles.purposeText}>
                                Continuous location tracking to provide real-time service functionality, ensuring uninterrupted service operation and accurate feature performance.
                            </Text>
                        </View>
                        <View style={styles.purposeItem}>
                            <Wifi size={16} color="#39E29B" style={styles.purposeIcon} />
                            <Text style={styles.purposeText}>
                                Precise GPS location (latitude and longitude) and background location updates when enabled by the user.
                            </Text>
                        </View>
                        <View style={styles.purposeItem}>
                            <Bell size={16} color="#39E29B" style={styles.purposeIcon} />
                            <Text style={styles.purposeText}>
                                We do not collect location data for advertising purposes. Disabling background location may limit certain core functionalities.
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.disclosureBody}>
                        Your location data is <Text style={styles.bold}>not sold to third parties</Text>. You may revoke location access at any time from your device{' '}
                        <Text style={styles.bold}>Settings → Apps → Bentork → Permissions</Text>.
                    </Text>
                </View>

                {/* ─────────────────────────────────────────
                    SECTION 2: PRIVACY POLICY
                ───────────────────────────────────────── */}
                <Text style={styles.sectionHeading}>Privacy Policy</Text>
                <Text style={styles.lastUpdated}>Last Updated: 03/02/2026</Text>

                <Text style={styles.tcBody}>
                    Bentork respects your privacy and is committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data when using the Bentork mobile application.
                </Text>

                <View style={[styles.tcSection, { marginTop: 16 }]}>
                    <Text style={styles.tcTitle}>1. Information We Collect</Text>

                    <Text style={styles.tcSubTitle}>A. Location Information (Precise – Foreground & Background)</Text>
                    <Text style={styles.tcBody}>
                        Our app collects precise location data, including when the app is running in the background, to support core functionality. We collect:
                    </Text>
                    <Text style={styles.tcBullet}>• Precise GPS location (latitude and longitude)</Text>
                    <Text style={styles.tcBullet}>• Background location updates when enabled by the user</Text>
                    <Text style={styles.tcBody}>
                        We do not collect location data for advertising purposes. Users can disable location access at any time through device settings. Disabling background location may limit certain core functionalities.
                    </Text>

                    <Text style={[styles.tcSubTitle, { marginTop: 12 }]}>B. Device Information</Text>
                    <Text style={styles.tcBody}>
                        We may collect limited device information including:
                    </Text>
                    <Text style={styles.tcBullet}>• Device model</Text>
                    <Text style={styles.tcBullet}>• Operating system and version</Text>
                    <Text style={styles.tcBullet}>• App version</Text>
                    <Text style={styles.tcBullet}>• Unique device identifiers (if applicable and permitted by Android policies)</Text>
                    <Text style={styles.tcBody}>
                        This information is used to ensure app security, prevent fraud and misuse, maintain session integrity, and improve performance and compatibility. We do not sell device information.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>2. How We Use Information</Text>
                    <Text style={styles.tcBody}>We use collected information to:</Text>
                    <Text style={styles.tcBullet}>• Provide, operate, and maintain Bentork services</Text>
                    <Text style={styles.tcBullet}>• Enable core app features including background functionality</Text>
                    <Text style={styles.tcBullet}>• Improve app performance and user experience</Text>
                    <Text style={styles.tcBullet}>• Ensure security and prevent abuse</Text>
                    <Text style={styles.tcBullet}>• Comply with legal obligations</Text>
                    <Text style={[styles.tcBody, { marginTop: 8 }]}>
                        We do not sell personal data to third parties.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>3. Data Sharing</Text>
                    <Text style={styles.tcBody}>
                        We do not sell your personal information. We may share information only in the following situations:
                    </Text>
                    <Text style={styles.tcBullet}>• With service providers who support app functionality (under confidentiality obligations)</Text>
                    <Text style={styles.tcBullet}>• If required by law or regulatory authority</Text>
                    <Text style={styles.tcBullet}>• To protect legal rights, safety, and prevent fraud</Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>4. Data Retention</Text>
                    <Text style={styles.tcBody}>
                        We retain personal data only for as long as necessary to provide services, comply with legal requirements, resolve disputes, and enforce agreements. Users may request deletion of their personal data by contacting us.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>5. User Rights</Text>
                    <Text style={styles.tcBody}>You may:</Text>
                    <Text style={styles.tcBullet}>• Access your data</Text>
                    <Text style={styles.tcBullet}>• Request correction</Text>
                    <Text style={styles.tcBullet}>• Request deletion</Text>
                    <Text style={styles.tcBullet}>• Withdraw location permission at any time via device settings</Text>
                    <Text style={[styles.tcBody, { marginTop: 8 }]}>
                        To exercise your rights, contact us at the email below.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>6. Security</Text>
                    <Text style={styles.tcBody}>
                        We implement appropriate technical and organizational measures to protect your data from unauthorized access, alteration, disclosure, or destruction.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>7. Children's Privacy</Text>
                    <Text style={styles.tcBody}>
                        Bentork does not knowingly collect personal information from children under 13 years of age. If we become aware of such collection, we will delete the information promptly.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>8. Changes to This Privacy Policy</Text>
                    <Text style={styles.tcBody}>
                        We may update this Privacy Policy periodically. Any changes will be reflected by updating the "Last Updated" date above.
                    </Text>
                </View>

                <View style={styles.tcSection}>
                    <Text style={styles.tcTitle}>9. Contact Us</Text>
                    <Text style={styles.tcBody}>
                        If you have questions about this Privacy Policy, contact us at:
                    </Text>
                    <Text
                        style={[styles.link, { marginTop: 6 }]}
                        onPress={() => Linking.openURL('mailto:support@bentork.com')}
                    >
                        support@bentork.com
                    </Text>
                    <Text
                        style={[styles.link, { marginTop: 4 }]}
                        onPress={() => Linking.openURL('https://bentork.com')}
                    >
                        https://bentork.com
                    </Text>
                </View>

                {/* Scroll hint */}
                {!hasScrolledToBottom && (
                    <View style={styles.scrollHint}>
                        <Text style={styles.scrollHintText}>↓ Scroll down to read all terms</Text>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Footer: Accept Button (ONLY option — no Decline) */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <Text style={styles.consentNote}>
                    By continuing, you confirm that you have read, understood and agree to the above disclosures and Terms &amp; Conditions.
                </Text>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        style={[
                            styles.acceptBtn,
                            !hasScrolledToBottom && styles.acceptBtnDimmed
                        ]}
                        onPress={handleAccept}
                        disabled={accepting}
                        activeOpacity={0.85}
                    >
                        <CheckCircle size={20} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.acceptBtnText}>
                            {accepting ? 'Saving...' : 'I Accept & Continue'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {!hasScrolledToBottom && (
                    <Text style={styles.scrollToAcceptHint}>
                        Scroll to the bottom to enable this button
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0E0E0E',
    },

    // Header
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
    },
    headerIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(57, 226, 155, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.25)',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // Prominent Disclosure Card (Google Play requirement)
    disclosureCard: {
        backgroundColor: 'rgba(57, 226, 155, 0.06)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 28,
        borderWidth: 1.5,
        borderColor: 'rgba(57, 226, 155, 0.30)',
    },
    disclosureBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(57, 226, 155, 0.18)',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 12,
    },
    disclosureBadgeText: {
        color: '#39E29B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    disclosureHeading: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    disclosureBody: {
        fontSize: 14,
        color: '#BBBBBB',
        lineHeight: 22,
        marginBottom: 10,
    },
    bold: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    purposeList: {
        marginVertical: 8,
        gap: 10,
    },
    purposeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    purposeIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    purposeText: {
        flex: 1,
        fontSize: 14,
        color: '#CCCCCC',
        lineHeight: 21,
    },

    // T&C sections
    sectionHeading: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#555',
        fontStyle: 'italic',
        marginBottom: 20,
    },
    tcSection: {
        marginBottom: 20,
    },
    tcTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#39E29B',
        marginBottom: 6,
    },
    tcBody: {
        fontSize: 14,
        color: '#AAAAAA',
        lineHeight: 22,
    },
    tcSubTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#CCCCCC',
        marginTop: 10,
        marginBottom: 4,
    },
    tcBullet: {
        fontSize: 14,
        color: '#AAAAAA',
        lineHeight: 22,
        marginLeft: 6,
        marginBottom: 2,
    },
    link: {
        color: '#39E29B',
        textDecorationLine: 'underline',
    },

    // Scroll hint
    scrollHint: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    scrollHintText: {
        color: '#555',
        fontSize: 13,
        fontStyle: 'italic',
    },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: '#0E0E0E',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    consentNote: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
    },
    acceptBtn: {
        flexDirection: 'row',
        backgroundColor: '#39E29B',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    acceptBtnDimmed: {
        // Slightly muted (still tappable, but visual cue to scroll first)
        backgroundColor: '#1E7A4E',
        shadowOpacity: 0.1,
    },
    acceptBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollToAcceptHint: {
        textAlign: 'center',
        color: '#444',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
});
