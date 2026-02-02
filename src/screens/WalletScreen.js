import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, Image, Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowDown, ArrowUp, X, Wallet as WalletIcon } from 'lucide-react-native';
import { authService } from '../services/auth';
import { authApi, userApi } from '../services/api';
import api from '../services/api';

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const userData = await authService.getUser();
        setUser(userData);
        if (userData?.userId || userData?.id) {
            fetchTransactions(userData.userId || userData.id);
        }
        if (userData?.email) {
            fetchWalletBalance(userData.email);
        }
    };

    const fetchWalletBalance = async (email) => {
        try {
            const userDetails = await userApi.getUserDetails(email);
            if (userDetails && userDetails.walletBalance !== undefined) {
                setWalletBalance(userDetails.walletBalance);
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
            // Fallback?
        }
    };

    const handleAddAmount = (val) => {
        const current = parseFloat(amount) || 0;
        const next = current + val;
        setAmount(next > 100000 ? '100000' : next.toString());
    };

    const GST_RATE = 0.18;
    const baseAmount = (parseFloat(amount) || 0) * (1 - GST_RATE);
    const gstAmount = (parseFloat(amount) || 0) * GST_RATE;

    const renderTransactionItem = ({ item }) => {
        const isCredit = item.type === 'credit' || item.type === 'CREDIT';

        // Determine icon color and bg based on type
        // Web: credit = primary container (greenish), debit = red tint
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

                {/* Ad Carousel (Simplified for now - static image or simple view) */}
                <View style={styles.adCard}>
                    <View style={styles.adContent}>
                        <Text style={styles.adTitle}>Bentork Batteries</Text>
                        <Text style={styles.adDesc}>Power your drive with long-lasting life.</Text>
                        <TouchableOpacity style={styles.adButton}>
                            <Text style={styles.adButtonText}>View Range</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Placeholder for battery image if we had one locally */}
                    {/* <Image source={...} style={styles.adImage} /> */}
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

                        <TouchableOpacity style={[styles.payBtn, { opacity: !amount ? 0.5 : 1 }]} disabled={!amount}>
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
