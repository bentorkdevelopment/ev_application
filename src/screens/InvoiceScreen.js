import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Receipt, Download, Share2 } from 'lucide-react-native';
import InAppReview from 'react-native-in-app-review';

export default function InvoiceScreen({ navigation, route }) {
    const {
        sessionData,
        finalEnergy,
        finalDuration,
        sessionId,
        stationName: paramStationName,
        rate: paramRate,
        chargerType: paramChargerType,
        stationId // Ensure we pass stationId from SessionScreen
    } = route.params || {};

    // Generate dynamic or fallback values
    // Ideally sessionData contains everything returned from stopSession
    const stationName = sessionData?.stationName || paramStationName || "Unknown Station";
    const address = sessionData?.address || "Bentork Charging Station";

    // Date & Time
    const endTime = sessionData?.endTime || new Date().toISOString();
    const dateObj = new Date(endTime);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Duration formatting
    const durationSeconds = parseFloat(finalDuration) || parseFloat(sessionData?.duration) || 0;
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;

    // Metrics
    const energy = Number(finalEnergy || sessionData?.energyUsed || 0).toFixed(2);
    const rate = Number(sessionData?.rate ?? paramRate ?? 15).toFixed(2);

    // Charger Type
    const displayChargerType = sessionData?.chargerType || paramChargerType || "DC Fast";

    // Cost Calculation
    // If backend provides cost, use it. Otherwise calculate.
    const rawCost = sessionData?.finalCost || sessionData?.amountDebited || (Number(energy) * Number(rate));
    const totalCost = Number(rawCost).toFixed(2);

    const paymentMethod = sessionData?.paymentMethod || "Wallet";
    const receiptId = sessionData?.transactionId || sessionData?.sessionId || sessionId || "N/A";

    const handleDone = async () => {
        // Integrate Google Play Rating
        const isAvailable = InAppReview.isAvailable();

        if (isAvailable) {
            try {
                await InAppReview.RequestInAppReview();
            } catch (error) {
                console.log("In-App Review Error:", error);
            }
        }

        // Navigate to Home regardless of review outcome
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Receipt Card */}
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.cardTitle}>INVOICE</Text>
                        <Text style={styles.totalAmount}>₹{totalCost}</Text>

                        <View style={styles.statusBadge}>
                            <CheckCircle size={14} color="#00E676" />
                            <Text style={styles.statusText}>Payment Successful</Text>
                        </View>
                    </View>

                    {/* Dotted Line / Divider */}
                    <View style={styles.dottedLineContainer}>
                        <View style={styles.dottedLine} />
                    </View>

                    {/* Body */}
                    <View style={styles.cardBody}>
                        {/* Session Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>SESSION DETAILS</Text>

                            <View style={styles.row}>
                                <Text style={styles.label}>Station</Text>
                                <Text style={styles.value}>{stationName}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Date</Text>
                                <Text style={styles.value}>{dateStr}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Time</Text>
                                <Text style={styles.value}>{timeStr}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Duration</Text>
                                <Text style={styles.value}>{durationStr}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Charging Usage */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>CHARGING USAGE</Text>

                            <View style={styles.row}>
                                <Text style={styles.label}>Energy Consumed</Text>
                                <Text style={styles.value}>{energy} kWh</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Charger Type</Text>
                                <Text style={styles.value}>{displayChargerType}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Rate Info</Text>
                                <Text style={styles.value}>₹{rate} / kWh</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Payment Method */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Payment Method</Text>
                            <View style={styles.paymentMethodBox}>
                                <View style={styles.dot} />
                                <Text style={styles.value}>{paymentMethod}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                        <Text style={styles.footerLabel}>Receipt ID:</Text>
                        <Text style={styles.receiptId}>{receiptId}</Text>
                    </View>
                </View>

                {/* Additional Actions (Optional placeholder for Download/Share) */}
                <View style={styles.actionsRow}>
                    {/* 
                    <TouchableOpacity style={styles.actionIconBtn}>
                        <Download size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconBtn}>
                        <Share2 size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Share</Text>
                    </TouchableOpacity> 
                   */}
                </View>

            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#181818',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 20,
    },
    cardHeader: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    logo: {
        height: 50,
        width: 120,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 3,
        fontWeight: '600',
        marginBottom: 8,
    },
    totalAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.2)',
        gap: 6,
    },
    statusText: {
        color: '#00E676',
        fontSize: 12,
        fontWeight: '600',
    },
    dottedLineContainer: {
        height: 1,
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#181818',
    },
    dottedLine: {
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 10,
        height: 0,
    },
    cardBody: {
        padding: 24,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '600',
        marginBottom: 16,
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    label: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
    },
    value: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 16,
    },
    paymentMethodBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00E676',
    },
    cardFooter: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderStyle: 'dashed',
    },
    footerLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
    },
    receiptId: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#000', // Or gradient
    },
    doneBtn: {
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
