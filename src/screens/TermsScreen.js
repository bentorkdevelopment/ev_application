import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms and Conditions</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last updated: January 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.paragraph}>
                        Welcome to Bentork EV. These Terms and Conditions govern your use of our mobile application and charging services. By using our app, you agree to these terms.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Account Registration</Text>
                    <Text style={styles.paragraph}>
                        To use our services, you must register accurately. You are responsible for maintaining the confidentiality of your account credentials.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Charging Services</Text>
                    <Text style={styles.paragraph}>
                        Our app allows you to locate and use EV charging stations. Pricing and availability may vary. You agree to pay all applicable fees for charging sessions initiated through your account.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Wallet & Payments</Text>
                    <Text style={styles.paragraph}>
                        You may maintain a wallet balance for payments. Refunds are processed according to our Refund Policy. We use secure third-party payment gateways.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. User Conduct</Text>
                    <Text style={styles.paragraph}>
                        You agree to use the charging stations responsibly and safely. Any damage caused by negligence may result in liability.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Privacy</Text>
                    <Text style={styles.paragraph}>
                        Your data is handled according to our Privacy Policy. We value your privacy and only collect necessary information for service delivery.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
                    <Text style={styles.paragraph}>
                        We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of new terms.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
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
        backgroundColor: '#121212',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
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
        padding: 24,
    },
    lastUpdated: {
        color: '#888',
        fontSize: 14,
        marginBottom: 30,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#39E29B',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    paragraph: {
        color: '#ccc',
        fontSize: 15,
        lineHeight: 24,
    },
});
