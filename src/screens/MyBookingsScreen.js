import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Clock, Zap, X, Play } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import { slotBookingApi, slotsApi } from '../services/api';
import { useAlert } from '../context/AlertContext';

const ITEM_HEIGHT = 165; // Estimated stable height

// --- Optimized Booking Card ---
const BookingCard = React.memo(({ booking, onPress, activeTab }) => {
    // Robust time parsing
    const formatDateTime = (inputTime) => {
        const now = new Date();
        let dateObj = new Date();
        let timeSet = false;

        if (!inputTime) {
            return {
                date: now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
                time: '---'
            };
        }

        try {
            if (Array.isArray(inputTime)) {
                const [y, M, d, h, m, s] = inputTime;
                dateObj = new Date(y, M - 1, d, h, m, s || 0);
                timeSet = true;
            } else if (typeof inputTime === 'string') {
                const timeOnlyRegex = /^([01]\d|2[0-3])[:.]([0-5]\d)([:.]([0-5]\d))?$/;
                if (timeOnlyRegex.test(inputTime)) {
                    const parts = inputTime.split(/[:.]/).map(Number);
                    dateObj.setHours(parts[0], parts[1], parts[2] || 0, 0);
                    timeSet = true;
                } else {
                    const safeDateStr = inputTime.replace(' ', 'T');
                    const parsed = new Date(safeDateStr);
                    if (!isNaN(parsed.getTime())) {
                        dateObj = parsed;
                        timeSet = true;
                    }
                }
            } else if (inputTime instanceof Date) {
                dateObj = inputTime;
                timeSet = true;
            } else if (typeof inputTime === 'number') {
                dateObj = new Date(inputTime);
                timeSet = true;
            }
        } catch (e) {
            console.warn("DateTime Parse Failed:", e);
        }

        if (isNaN(dateObj.getTime())) {
            return {
                date: now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
                time: '---'
            };
        }

        return {
            date: dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
            time: timeSet ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'
        };
    };

    const slotTimeSource = booking.slotStartTime ||
        booking.slot_start_time ||
        booking.slot?.startTime ||
        booking.slot?.start_time ||
        booking.slot?.startTimeOnly ||
        booking.startTime ||
        booking.start_time;

    const bookingTimeSource = booking.bookingTime || booking.booking_time;

    const slotInfo = formatDateTime(slotTimeSource);
    const bookingInfo = formatDateTime(bookingTimeSource);

    const hasSlot = slotInfo.time !== '---';
    const displayDate = hasSlot ? slotInfo.date : bookingInfo.date;
    const displayTime = hasSlot ? slotInfo.time : 'Slot Pending';
    const isPending = !hasSlot;

    const chargerType = booking.chargerType || booking.charger_type || booking.charger?.chargerType || 'Fast';
    const connector = booking.connectorType || booking.connector_type || booking.charger?.connectorType || 'CCS 2';
    const power = booking.power || booking.maxPower || booking.charger?.maxPower || '120';
    const currentType = (chargerType.toString().toUpperCase().includes('AC') || connector.includes('Type 2')) ? 'AC' : 'DC';

    const status = (booking.status || '').toUpperCase();

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={activeTab === 'Active' ? 0.7 : 1}
            onPress={() => onPress(booking)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.stationName} numberOfLines={1}>
                    {booking.stationName || booking.station_name || 'Unknown Station'}
                </Text>
                <View style={[
                    styles.statusPill,
                    {
                        backgroundColor: status === 'BOOKED'
                            ? 'rgba(76, 175, 80, 0.1)'
                            : (status === 'CANCELLED'
                                ? 'rgba(244, 67, 54, 0.1)'
                                : 'rgba(158, 158, 158, 0.1)')
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        {
                            color: status === 'BOOKED'
                                ? Colors.statusGreen
                                : (status === 'CANCELLED'
                                    ? Colors.statusRed
                                    : '#aaa')
                        }
                    ]}>{booking.status || 'Unknown'}</Text>
                </View>
            </View>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Zap size={14} color="#aaa" />
                    <Text style={styles.detailText}>
                        {connector} • {currentType} ({power}kW)
                    </Text>
                </View>
            </View>

            <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                    <Calendar size={16} color={isPending ? '#888' : Colors.primaryContainer} />
                    <Text style={[styles.timeText, isPending && { color: '#888' }]}>{displayDate}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.timeBlock}>
                    <Clock size={16} color={isPending ? '#FF9800' : Colors.primaryContainer} />
                    <Text style={[styles.timeText, isPending && { color: '#FF9800', fontStyle: 'italic' }]}>{displayTime}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function MyBookingsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('Active'); 
    const [cancellingId, setCancellingId] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await slotBookingApi.getMyBookings();
            const bookingsList = data || [];

            const chargersToFetch = [...new Set(bookingsList
                .filter(b => !b.slotStartTime && !b.slot?.startTime && b.slotId && b.chargerId)
                .map(b => b.chargerId)
            )];

            const chargerSlotsMap = {};
            await Promise.all(chargersToFetch.map(async (cid) => {
                try {
                    const slots = await slotsApi.getSlotsByCharger(cid);
                    chargerSlotsMap[cid] = Array.isArray(slots) ? slots : [];
                } catch (e) {
                    console.warn(`Failed to fetch slots for charger ${cid}:`, e.message);
                }
            }));

            const enrichedBookings = bookingsList.map(booking => {
                if (booking.slotStartTime || booking.slot?.startTime) return booking;

                if (booking.slotId && booking.chargerId && chargerSlotsMap[booking.chargerId]) {
                    const matchedSlot = chargerSlotsMap[booking.chargerId].find(s => String(s.id) === String(booking.slotId));
                    if (matchedSlot) {
                        return {
                            ...booking,
                            slotStartTime: matchedSlot.startTime || matchedSlot.start_time || matchedSlot.startTimeOnly
                        };
                    }
                }
                return booking;
            });

            setBookings(enrichedBookings);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBookings();
    }, []);

    const handleBookingPress = useCallback((booking) => {
        if (activeTab !== 'Active') return;
        setSelectedBooking(booking);
        setIsModalVisible(true);
    }, [activeTab]);

    const closeModal = useCallback(() => {
        setIsModalVisible(false);
        setSelectedBooking(null);
    }, []);

    const handleStartNow = () => {
        if (!selectedBooking) return;

        const booking = selectedBooking;
        const chargerType = booking.chargerType || booking.charger_type || booking.charger?.chargerType || 'Fast';
        const connector = booking.connectorType || booking.connector_type || booking.charger?.connectorType || 'CCS 2';
        const power = booking.power || booking.maxPower || booking.charger?.maxPower || '120';
        const typeStr = (chargerType.toString().toUpperCase().includes('AC') || connector.includes('Type 2')) ? 'AC' : 'DC';
        const fallbackConnector = typeStr === 'AC' ? 'Type 2' : 'CCS 2';

        closeModal();

        navigation.navigate('Config', {
            stationId: booking.stationId,
            stationName: booking.stationName,
            chargerId: booking.chargerId,
            boxId: booking.boxId || booking.charger?.ocppId || booking.chargerId, 
            chargerType: chargerType,
            maxPower: power,
            connectorType: connector || fallbackConnector,
            status: 'Available',
            bookingId: booking.id
        });
    };

    const handleCancel = async (bookingId) => {
        Alert.alert(
            "Cancel Booking",
            "Are you sure you want to cancel this booking?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setCancellingId(bookingId);
                            await slotBookingApi.cancelBooking(bookingId);
                            showAlert("Success", "Booking cancelled successfully.");
                            closeModal();
                            fetchBookings();
                        } catch (error) {
                            console.error(error);
                            showAlert("Error", "Failed to cancel booking.");
                        } finally {
                            setCancellingId(null);
                        }
                    }
                }
            ]
        );
    };

    const displayedBookings = useMemo(() => {
        return bookings.filter(b => {
            const s = (b.status || '').toUpperCase();
            const isActive = s === 'BOOKED' || s === 'CONFIRMED' || s === 'ACTIVE';
            return activeTab === 'Active' ? isActive : !isActive;
        });
    }, [bookings, activeTab]);

    const renderItem = useCallback(({ item }) => (
        <BookingCard 
            booking={item} 
            onPress={handleBookingPress} 
            activeTab={activeTab} 
        />
    ), [handleBookingPress, activeTab]);

    const getItemLayout = useCallback((data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    // Re-use derivation logic for modal (localized)
    const formatDateTime = (inputTime) => {
        if (!inputTime) return { date: '---', time: '---' };
        const dateObj = new Date(Array.isArray(inputTime) ? new Date(inputTime[0], inputTime[1]-1, inputTime[2], inputTime[3], inputTime[4]) : inputTime);
        return {
            date: dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Active' && styles.activeTab]}
                    onPress={() => setActiveTab('Active')}
                >
                    <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>Upcoming</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'History' && styles.activeTab]}
                    onPress={() => setActiveTab('History')}
                >
                    <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : (
                <FlatList
                    data={displayedBookings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primaryContainer} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings found.</Text>
                        </View>
                    }
                    getItemLayout={getItemLayout}
                    initialNumToRender={6}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}

            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedBooking && (() => {
                            const slotTimeSource = selectedBooking.slotStartTime || selectedBooking.slot?.startTime || selectedBooking.startTime;
                            const slotInfo = formatDateTime(slotTimeSource);
                            const bookedOn = formatDateTime(selectedBooking.bookingTime);
                            const chargerType = selectedBooking.chargerType || 'Fast';
                            const connector = selectedBooking.connectorType || 'CCS 2';
                            const power = selectedBooking.power || '120';
                            const status = (selectedBooking.status || 'unknown').toUpperCase();

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                                            <X size={24} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={styles.modalTitle}>Booking Details</Text>
                                        <View style={{ width: 24 }} />
                                    </View>

                                    <View style={styles.modalBody}>
                                        <Text style={styles.modalStationName}>{selectedBooking.stationName || 'Unknown Station'}</Text>
                                        <View style={styles.modalTimeContainer}>
                                            <View style={styles.modalTimeBlock}>
                                                <Calendar size={18} color={Colors.primaryContainer} />
                                                <Text style={styles.modalTimeText}>{slotInfo.date}</Text>
                                            </View>
                                            <View style={styles.modalTimeBlock}>
                                                <Clock size={18} color={Colors.primaryContainer} />
                                                <Text style={styles.modalTimeText}>{slotInfo.time}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.modalInfoRow}><Text style={styles.modalLabel}>Booking ID:</Text><Text style={styles.modalValue}>#{selectedBooking.id}</Text></View>
                                        <View style={styles.modalInfoRow}><Text style={styles.modalLabel}>Charger:</Text><Text style={styles.modalValue}>{connector} ({power}kW)</Text></View>
                                        <View style={styles.modalInfoRow}><Text style={styles.modalLabel}>Status:</Text><Text style={[styles.modalValue, { color: status === 'BOOKED' ? Colors.primaryContainer : Colors.statusRed }]}>{status}</Text></View>

                                        <TouchableOpacity style={styles.startBtn} onPress={handleStartNow}>
                                            <Play size={20} color={Colors.matteBlack} fill={Colors.matteBlack} />
                                            <Text style={styles.startBtnText}>Start Now</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => handleCancel(selectedBooking.id)}>
                                            <Text style={styles.modalCancelText}>Cancel Booking</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#141414ff' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10 },
    tab: { marginRight: 25, paddingVertical: 12 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primaryContainer },
    tabText: { color: '#888', fontSize: 16, fontWeight: '500' },
    activeTabText: { color: '#fff', fontWeight: 'bold' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 50 },
    card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    stationName: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', textTransform: 'capitalize' },
    detailsRow: { flexDirection: 'row', marginBottom: 12 },
    detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    detailText: { color: '#aaa', fontSize: 13, marginLeft: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 },
    timeBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
    divider: { width: 1, height: 20, backgroundColor: '#444', marginHorizontal: 10 },
    timeText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#666', fontSize: 14, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: '#1E1E1E', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    closeBtn: { padding: 4 },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalBody: { alignItems: 'center' },
    modalStationName: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    modalTimeContainer: { flexDirection: 'row', backgroundColor: '#2f2f2fff', borderRadius: 16, paddingVertical: 16, width: '100%', justifyContent: 'space-around', marginBottom: 24 },
    modalTimeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalTimeText: { color: '#eee', fontSize: 16 },
    modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
    modalLabel: { color: '#888', fontSize: 14 },
    modalValue: { color: '#fff', fontSize: 14 },
    startBtn: { flexDirection: 'row', backgroundColor: Colors.primaryContainer, width: '100%', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 12 },
    startBtnText: { color: Colors.matteBlack, fontSize: 16, fontWeight: 'bold' },
    modalCancelBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
    modalCancelText: { color: '#ff6767ff', fontSize: 14, fontWeight: '600' }
});
