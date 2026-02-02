import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Wallet, Menu, ChevronRight, Zap, Info, ShieldCheck, HelpCircle, Plus, Minus, MapPin } from 'lucide-react-native';
import LinearGradient from 'react-native-svg'; // You might need react-native-linear-gradient but user said "Use Vanilla CSS" style logic. 
// Actually linear-gradient is native. I'll use simple views if not installed.
import { Colors } from '../styles/GlobalStyles';

import { plansApi, authApi, userApi } from '../services/api';
import { authService } from '../services/auth';

export default function ConfigScreen({ route }) {
    const navigation = useNavigation();
    const { stationName, chargerId, chargerType, maxPower, connectorType, status } = route.params || {};

    // Logic for Status Display & Button State
    const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
    const isChargerAvailable = formattedStatus === 'Available';

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [customPower, setCustomPower] = useState(25); // Default Custom power
    const [walletBalance, setWalletBalance] = useState('0.00');

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        try {
            const token = await authService.getToken();
            const user = await authService.getUser();

            if (!token || !user) {
                console.log("No token or user found, redirecting to Login");
                Alert.alert("Authentication Required", "Please login to view plans.", [
                    { text: "OK", onPress: () => navigation.replace('Login') }
                ]);
                return;
            }
            fetchPlans();
            fetchWalletBalance(user.email);
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    const fetchWalletBalance = async (email) => {
        try {
            const userData = await userApi.getUserDetails(email);
            if (userData && userData.walletBalance !== undefined) {
                setWalletBalance(userData.walletBalance);
            }
        } catch (error) {
            console.error("Failed to fetch wallet balance", error);
        }
    }

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const data = await plansApi.getAllPlans();

            console.error("DEBUG: Filter Plans. data.length:", data?.length, "chargerType:", chargerType);
            // Filter plans based on chargerType match (AC vs DC)
            let filteredPlans = data || [];
            if (filteredPlans.length > 0 && chargerType) {
                const isAC = chargerType.toString().toUpperCase().includes('AC');

                filteredPlans = filteredPlans.filter(p => {
                    const planType = (p.chargerType || '').toUpperCase();
                    // If Charger is AC, allow AC plans. If DC/Fast, allow non-AC plans.
                    return isAC ? planType.includes('AC') : !planType.includes('AC');
                });
            }
            console.error("DEBUG: Filtered:", filteredPlans?.length);

            setPlans(filteredPlans);
            // Default Select first plan
            if (filteredPlans && filteredPlans.length > 0) {
                // Try to find a default or just first
                setSelectedPlanId(filteredPlans[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch plans", error);
            if (error.response && error.response.status === 401) {
                Alert.alert("Session Expired", "Please login again.", [
                    {
                        text: "OK", onPress: () => {
                            authService.logout();
                            navigation.replace('Login');
                        }
                    }
                ]);
            } else {
                Alert.alert("Error", error.userMessage || "Could not fetch plans.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (id) => {
        setSelectedPlanId(id);
    };

    const handlePay = () => {
        if (!selectedPlanId) {
            Alert.alert("Select Plan", "Please select a charging plan to continue.");
            return;
        }
        // Simulate Payment Success
        Alert.alert("Payment", "Payment Successful!", [
            {
                text: "Start Session",
                onPress: () => navigation.replace('Session', { planId: selectedPlanId })
            }
        ]);
    };

    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    return (
        <View style={styles.container}>
            {/* ... (TopBar remains same) ... */}
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            {/* Top Bar with Blur effect simulation */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
                <View style={styles.topBarContent}>
                    <View style={styles.leftNav}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.pageTitle}>Charging Config</Text>
                    </View>

                    <View style={styles.rightNav}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Map')}>
                            <MapPin color="#fff" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.walletPill} onPress={() => navigation.navigate('Wallet')}>
                            <Wallet color="#fff" size={14} />
                            <Text style={styles.walletText}>₹ {walletBalance}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Charger Card */}
                <View style={styles.chargerCard}>
                    <View style={styles.chargerInfo}>
                        <Text style={styles.chargerName}>{stationName || 'Bentork Charger'}</Text>
                        <Text style={styles.chargerMeta}>
                            {connectorType || 'CCS 2'} • {maxPower || '120'}kW {chargerType || 'Fast'} Charging {'\n'}
                            <Text style={{ color: isChargerAvailable ? Colors.primaryContainer : '#FF4213' }}>{formattedStatus}</Text> • ID: {chargerId || 'Unknown'}
                        </Text>
                    </View>
                    {/* Placeholder for Charger Image */}
                    <View style={styles.chargerImgBox}>
                        <Zap size={32} color={Colors.primaryContainer} />
                    </View>
                </View>

                {/* Custom Power Control */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Set Power Limit</Text>
                </View>
                <View style={[styles.planItem, { justifyContent: 'space-between', marginBottom: 10 }]}>
                    <View>
                        <Text style={styles.planName}>Max Power</Text>
                        <Text style={styles.planMeta}>Limit charging speed</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <TouchableOpacity
                            onPress={() => setCustomPower(p => Math.max(1, p - 5))}
                            style={styles.powerBtn}
                        >
                            <Minus size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', minWidth: 60, textAlign: 'center' }}>{customPower} kW</Text>
                        <TouchableOpacity
                            onPress={() => setCustomPower(p => Math.min(Number(maxPower) || 120, p + 5))}
                            style={styles.powerBtn}
                        >
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Plans Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Select Plan</Text>
                    <View style={styles.lastUsedPill}>
                        <Text style={styles.lastUsedText}>Last Used</Text>
                    </View>
                </View>

                {
                    loading ? (
                        <ActivityIndicator size="large" color={Colors.primaryContainer} style={{ marginTop: 50 }} />
                    ) : (
                        <View style={styles.plansContainer}>
                            {Array.isArray(plans) && plans.length > 0 ? (
                                plans.map((plan) => (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[
                                            styles.planItem,
                                            selectedPlanId === plan.id && styles.planActive
                                        ]}
                                        onPress={() => handleSelectPlan(plan.id)}
                                    >
                                        <View style={styles.planInfo}>
                                            <Text style={styles.planName}>{plan.planName}</Text>
                                            <Text style={styles.planMeta}>{plan.description || `${plan.durationMin || 'Auto'} mins`}</Text>
                                            <Text style={styles.planRate}>@ ₹{plan.rate || 0}/kWh</Text>
                                        </View>
                                        <Text style={styles.planPrice}>₹ {plan.walletDeduction || plan.price || '0'}</Text>
                                    </TouchableOpacity>
                                ))) : (
                                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No plans available.</Text>
                            )}
                        </View>
                    )
                }

            </ScrollView >

            {/* Pay Button */}
            {!loading && (
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[styles.payBtn, !isChargerAvailable && { backgroundColor: '#333' }]}
                        onPress={handlePay}
                        disabled={!isChargerAvailable}
                    >
                        <Text style={[styles.payBtnText, !isChargerAvailable && { color: '#888' }]}>
                            {isChargerAvailable ? 'Pay & Start Charging' : `Charger ${formattedStatus}`}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Matte black
    },
    topBar: {
        backgroundColor: 'rgba(18,18,18,0.9)',
        zIndex: 10,
    },
    topBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        height: 60,
    },
    leftNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    pageTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    rightNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconBtn: {
        padding: 5,
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    walletText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Charger Card
    chargerCard: {
        backgroundColor: '#1E1E1E',
        margin: 16,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    chargerInfo: {
        flex: 1,
    },
    chargerName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    chargerMeta: {
        color: '#aaa',
        fontSize: 13,
        lineHeight: 18,
    },
    chargerImgBox: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(57, 226, 155, 0.1)', // Keep rgba for opacity or use hex to rgba utility if available
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Plans
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
        marginTop: 10,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    lastUsedPill: {
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    lastUsedText: {
        color: Colors.primaryContainer,
        fontSize: 10,
        fontWeight: 'bold',
    },
    plansContainer: {
        paddingHorizontal: 16,
        gap: 12,
    },
    planItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    planActive: {
        backgroundColor: '#252525',
        borderColor: Colors.primaryContainer,
        borderWidth: 2,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    planMeta: {
        color: '#888',
        fontSize: 12,
    },
    planRate: {
        color: '#aaa',
        fontSize: 11,
        marginTop: 2,
    },
    planPrice: {
        color: Colors.primaryContainer, // Green price
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Bottom
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    payBtn: {
        backgroundColor: '#fff',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 5,
    },
    payBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    powerBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },
});
