import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, Image, Dimensions, Platform, StatusBar, Alert, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowDown, ArrowUp, X, Wallet as WalletIcon } from 'lucide-react-native';
import { authService } from '../services/auth';
import { authApi, userApi, razorpayApi } from '../services/api';
import api from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PinPromptModal from '../components/PinPromptModal';

const { width } = Dimensions.get('window');

// Mock data to match webpage style if API fails or is empty initially
const MOCK_TRANSACTIONS = [];

export default function WalletScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState('0.00');

    // Skeleton Loading & Fade State
    const [isFetching, setIsFetching] = useState(true);
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Security State
    const [isLocked, setIsLocked] = useState(false); // Default to false, check on mount
    const [showPinModal, setShowPinModal] = useState(false);

    useEffect(() => {
        checkSecurity();
    }, []);

    const checkSecurity = async () => {
        try {
            const secureWallet = await AsyncStorage.getItem('secureWallet');
            if (secureWallet === 'true') {
                setIsLocked(true);
                // Check Biometrics
                const rnBiometrics = new ReactNativeBiometrics();
                const { available, biometryType } = await rnBiometrics.isSensorAvailable();

                if (available && biometryType) {
                    // Trigger Fingerprint/Biometric
                    rnBiometrics.simplePrompt({ promptMessage: 'Confirm fingerprint to access Wallet' })
                        .then((resultObject) => {
                            const { success } = resultObject;
                            if (success) {
                                setIsLocked(false);
                                startLoadingData(); // Load data after unlock
                            } else {
                                // Failed or cancelled, fallback to PIN logic
                                setShowPinModal(true);
                            }
                        })
                        .catch(() => {
                            setShowPinModal(true);
                        });
                } else {
                    // No Bio, show PIN
                    setShowPinModal(true);
                }
            } else {
                setIsLocked(false);
                startLoadingData();
            }
        } catch (e) {
            console.error("Security check failed:", e);
            startLoadingData();
        }
    };

    const startLoadingData = () => {
        // Start Pulse Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.6,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        loadDataWithDelay();
    };

    const loadDataWithDelay = async () => {
        setIsFetching(true);
        // Minimum loading time of 1.5s to show skeleton as per user request
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 1500));
        const dataLoad = loadData();

        await Promise.all([minLoadTime, dataLoad]);

        setIsFetching(false);
        // Fade in actual content
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
        }).start();
    };

    const loadData = async () => {
        const userData = await authService.getUser();
        setUser(userData);
        if (userData?.userId || userData?.id) {
            await fetchTransactions(userData.userId || userData.id);
        }
        if (userData?.email) {
            await fetchWalletBalance(userData.email);
        }
    };

    const fetchWalletBalance = async (email) => {
        try {
            const userDetails = await userApi.getUserDetails(email);
            if (userDetails) {
                // Update local user state with full details from backend (includes ID and real balance)
                setUser(prev => ({ ...prev, ...userDetails }));
                // Also update stored user data to persist the ID
                authService.setUser({ ...user, ...userDetails });

                if (userDetails.walletBalance !== undefined) {
                    setWalletBalance(userDetails.walletBalance);
                }
            }
        } catch (error) {
            console.error("Failed to fetch wallet balance", error);
        }
    };

    const fetchTransactions = async (userId) => {
        try {
            const response = await api.get(`/wallet/history/${userId}`);
            console.log("Transactions:", response.data);
            setTransactions(response.data || []);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        }
    };

    const handleAddAmount = (val) => {
        const current = parseFloat(amount) || 0;
        const next = current + val;
        setAmount(next > 100000 ? '100000' : next.toString());
    };

    const handlePayment = async () => {
        if (!amount) return;

        // Ensure we have a valid User ID from the latest state
        const userId = user?.id || user?.userId;

        if (!userId) {
            console.error("Payment failed: Missing User ID. User object:", user);
            Alert.alert("Session Error", "Could not identify user. Please wait a moment or try logging in again.");
            return;
        }

        try {
            setLoading(true);
            // 1. Create Order on Backend
            console.log("Creating order for amount:", amount);
            const orderData = await razorpayApi.createOrder(amount);

            const orderId = orderData.id || orderData; // Fallback if returns string directly

            const options = {
                description: 'Wallet Recharge',
                image: 'https://github.com/StartLedger/ev-ui/blob/main/src/assets/images/logo.png?raw=true',
                currency: 'INR',
                key: RAZORPAY_KEY_ID,
                amount: parseFloat(amount) * 100, // Amount in paise
                name: 'Bentork EV',
                order_id: orderId, // Pass the order ID created on backend
                prefill: {
                    email: user?.email || 'user@bentork.in',
                    contact: user?.phone || '9999999999',
                    name: user?.name || 'Bentork User'
                },
                theme: { color: '#39E29B' }
            };

            RazorpayCheckout.open(options).then(async (data) => {
                // handle success
                console.log(`Razorpay Success: ${data.razorpay_payment_id}`);

                // 2. Verify Payment on Backend
                try {
                    const verificationPayload = {
                        order_id: data.razorpay_order_id,
                        payment_id: data.razorpay_payment_id,
                        signature: data.razorpay_signature,
                        user_id: userId.toString()
                    };

                    console.log("Verifying payment...", verificationPayload);
                    const verificationResponse = await razorpayApi.verifyPayment(verificationPayload);

                    console.log("Verification Success:", verificationResponse);

                    Alert.alert("Success", "Wallet updated successfully!");

                    // 3. Update UI
                    setShowAddModal(false);
                    setAmount('');

                    // Update balance and transactions by reloading full data
                    if (verificationResponse.walletAmount) {
                        setWalletBalance(verificationResponse.walletAmount);
                    }

                    // Reload all data to ensure synchronization
                    loadData();

                } catch (verifyErr) {
                    console.error("Verification Failed:", verifyErr);
                    Alert.alert("Payment Verification Failed", "Payment was successful but verification failed. Please contact support.");
                }

            }).catch((error) => {
                // handle failure
                console.log(`Razorpay Error: ${error.code} | ${error.description}`);
                if (error.code !== 0) {
                    Alert.alert("Payment Failed", error.description);
                }
            });

        } catch (err) {
            console.error("Order Creation Failed:", err);
            Alert.alert("Error", "Failed to initiate payment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const GST_RATE = 0.18;
    const baseAmount = (parseFloat(amount) || 0) * (1 - GST_RATE);
    const gstAmount = (parseFloat(amount) || 0) * GST_RATE;

    const renderTransactionItem = ({ item }) => {
        const isCredit = item.type === 'credit' || item.type === 'CREDIT';
        const iconBg = isCredit ? '#004D40' : 'rgba(255, 82, 82, 0.2)';
        const iconColor = isCredit ? '#39E29B' : '#FF5252';

        return (
            <View style={styles.txItem}>
                <View style={styles.txLeft}>
                    <View style={[styles.txIconBox, { backgroundColor: iconBg }]}>
                        {isCredit ?
                            <ArrowDown size={20} color={iconColor} /> :
                            <ArrowUp size={20} color={iconColor} />
                        }
                    </View>
                    <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>{isCredit ? "Wallet Recharge" : "Deducted"}</Text>
                        <Text style={styles.txDesc} numberOfLines={1}>
                            {isCredit ? (item.method || "Payment") : "Charging Session"}
                        </Text>
                    </View>
                </View>
                <View style={styles.txRight}>
                    <Text style={[styles.amountText, { color: isCredit ? '#39E29B' : '#fff' }]}>
                        {isCredit ? "+" : "-"}₹{item.amount}
                    </Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Done</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Skeleton Component
    const SkeletonBlock = ({ width, height, style }) => (
        <Animated.View
            style={[
                {
                    width: width,
                    height: height,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    opacity: pulseAnim,
                },
                style
            ]}
        />
    );

    // If locked, show minimal UI + PIN Modal
    if (isLocked) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#121212" />
                <View style={[styles.header, { position: 'absolute', top: 0, width: '100%', paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>My Wallet</Text>
                </View>

                <Text style={{ color: '#fff', fontSize: 16 }}>Authentication Required</Text>

                <PinPromptModal
                    visible={showPinModal}
                    title="Enter Access PIN"
                    onSuccess={() => {
                        setShowPinModal(false);
                        setIsLocked(false);
                        startLoadingData();
                    }}
                    onClose={() => {
                        setShowPinModal(false);
                        navigation.goBack();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>My Wallet</Text>
            </View>

            {isFetching ? (
                /* Skeleton Loader UI */
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Balance Card Skeleton */}
                    <View style={[styles.balanceCard, { borderColor: 'transparent' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <SkeletonBlock width={100} height={16} />
                        </View>
                        <SkeletonBlock width={180} height={36} style={{ marginBottom: 20 }} />
                        <SkeletonBlock width="100%" height={50} style={{ borderRadius: 14 }} />
                    </View>

                    {/* Ad Card Skeleton */}
                    <View style={styles.adCard}>
                        <SkeletonBlock width={120} height={20} style={{ marginBottom: 10 }} />
                        <SkeletonBlock width={200} height={14} style={{ marginBottom: 20 }} />
                        <SkeletonBlock width={80} height={30} style={{ borderRadius: 8 }} />
                    </View>

                    {/* Transactions Header Skeleton */}
                    <SkeletonBlock width={150} height={20} style={{ marginBottom: 20 }} />

                    {/* List Items Skeleton */}
                    {[1, 2, 3, 4, 5].map((key) => (
                        <View key={key} style={styles.txItem}>
                            <View style={styles.txLeft}>
                                <SkeletonBlock width={42} height={42} style={{ borderRadius: 14, marginRight: 14 }} />
                                <View>
                                    <SkeletonBlock width={100} height={16} style={{ marginBottom: 6 }} />
                                    <SkeletonBlock width={60} height={12} />
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <SkeletonBlock width={50} height={16} style={{ marginBottom: 6 }} />
                                <SkeletonBlock width={40} height={12} />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                /* Actual Content */
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Balance Card - Gradient Style */}
                        <View style={styles.balanceCard}>
                            <View style={styles.balanceLabelRow}>
                                <WalletIcon size={18} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.balanceLabel}>Total Balance</Text>
                            </View>
                            <Text style={styles.balanceAmount}>
                                ₹{parseFloat(walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                                <Text style={styles.addBtnText}>+ Add Money</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Ad Carousel */}
                        <View style={styles.adCard}>
                            <View style={styles.adContent}>
                                <Text style={styles.adTitle}>Bentork Batteries</Text>
                                <Text style={styles.adDesc}>Power your drive with long-lasting life.</Text>
                                <TouchableOpacity style={styles.adButton}>
                                    <Text style={styles.adButtonText}>View Range</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Transactions */}
                        <Text style={styles.sectionTitle}>Payment History</Text>

                        {transactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No recent transactions</Text>
                            </View>
                        ) : (
                            transactions.map((item, index) => (
                                <View key={index}>{renderTransactionItem({ item })}</View>
                            ))
                        )}

                        {/* Add ample bottom padding */}
                        <View style={{ height: 50 }} />
                    </ScrollView>
                </Animated.View>
            )}

            {/* Add Money Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Balance</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <X size={24} color="#aaa" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                placeholderTextColor="#555"
                                keyboardType="numeric"
                            />
                            {amount.length > 0 && (
                                <TouchableOpacity onPress={() => setAmount('')}>
                                    <X size={18} color="#555" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Chips */}
                        <View style={styles.chipGroup}>
                            {[100, 200, 500, 1000].map(val => (
                                <TouchableOpacity key={val} style={styles.amtChip} onPress={() => handleAddAmount(val)}>
                                    <Text style={styles.chipText}>+{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Bill Details */}
                        <View style={styles.billDetails}>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Base Amount</Text>
                                <Text style={styles.billValue}>₹{baseAmount.toFixed(2)}</Text>
                            </View>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>GST (18%)</Text>
                                <Text style={styles.billValue}>₹{gstAmount.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.billRow, styles.billTotal]}>
                                <Text style={styles.billTotalLabel}>Total Payable</Text>
                                <Text style={styles.billTotalValue}>₹{parseFloat(amount || 0).toFixed(2)}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.payBtn, { opacity: !amount ? 0.5 : 1 }]}
                            disabled={!amount}
                            onPress={handlePayment}
                        >
                            <Text style={styles.payBtnText}>Pay ₹{amount || 0}</Text>
                        </TouchableOpacity>

                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
        backgroundColor: '#121212', // or semi transparent
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
    pageTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    // Balance Card
    balanceCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        // Simulate gradient with a slight greenish tint background or use overlay
        // For simple RN, we stick to solid dark or setup LinearGradient later. 
        // Let's us a dark green tint color
        backgroundColor: '#0A2A1E',
    },
    balanceLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginLeft: 8,
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    addBtn: {
        backgroundColor: 'rgba(57, 226, 155, 0.15)',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.3)',
    },
    addBtnText: {
        color: '#39E29B',
        fontSize: 16,
        fontWeight: '600',
    },
    // Ad Card
    adCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    adTitle: {
        color: '#39E29B',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    adDesc: {
        color: '#aaa',
        fontSize: 12,
        marginBottom: 12,
    },
    adButton: {
        backgroundColor: '#39E29B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    adButtonText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '600',
    },
    // Transactions
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#555',
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(48, 48, 48, 0.4)',
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    txIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    txInfo: {
        justifyContent: 'center',
    },
    txTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    txDesc: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        maxWidth: 150,
    },
    txRight: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    statusBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    currencySymbol: {
        color: '#aaa',
        fontSize: 20,
        marginRight: 10,
    },
    amountInput: {
        flex: 1,
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
        padding: 0,
    },
    chipGroup: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    amtChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        marginRight: 8,
    },
    chipText: {
        color: '#fff',
        fontSize: 13,
    },
    billDetails: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    billLabel: {
        color: '#ccc',
        fontSize: 14,
    },
    billValue: {
        color: '#ccc',
        fontSize: 14,
    },
    billTotal: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#444',
    },
    billTotalLabel: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    billTotalValue: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    payBtn: {
        backgroundColor: '#39E29B', // Green
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    payBtnText: {
        color: '#000', // On Primary Container
        fontSize: 16,
        fontWeight: '600',
    },
});
