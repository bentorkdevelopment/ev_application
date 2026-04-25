import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Clock, MapPin, XCircle, Zap, X, Play } from 'lucide-react-native';
import { Colors, GlobalStyles } from '../styles/GlobalStyles';
import { slotBookingApi, slotsApi } from '../services/api';
import { useAlert } from '../context/AlertContext';

export default function MyBookingsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'History'
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

            // 1. Identify unique chargerIds that have bookings with missing slotStartTime
            const chargersToFetch = [...new Set(bookingsList
                .filter(b => !b.slotStartTime && !b.slot?.startTime && b.slotId && b.chargerId)
                .map(b => b.chargerId)
            )];
            console.log('--- ENRICHMENT DEBUG ---');
            console.log('Chargers to fetch slots for:', chargersToFetch);

            // 2. Fetch all slots for those chargers in parallel
            const chargerSlotsMap = {};
            await Promise.all(chargersToFetch.map(async (cid) => {
                try {
                    const slots = await slotsApi.getSlotsByCharger(cid);
                    console.log(`Fetched ${slots?.length || 0} slots for Charger ${cid}`);
                    chargerSlotsMap[cid] = Array.isArray(slots) ? slots : [];
                } catch (e) {
                    console.warn(`Failed to fetch slots for charger ${cid}:`, e.message);
                }
            }));

            // 3. Map through bookings and enrich using the local map
            const enrichedBookings = bookingsList.map(booking => {
                if (booking.slotStartTime || booking.slot?.startTime) return booking;

                if (booking.slotId && booking.chargerId && chargerSlotsMap[booking.chargerId]) {
                    // Use string matching for safety with backend IDs
                    const matchedSlot = chargerSlotsMap[booking.chargerId].find(s => String(s.id) === String(booking.slotId));
                    if (matchedSlot) {
                        console.log(`Matched Slot for Booking ${booking.id}:`, JSON.stringify(matchedSlot, null, 2));
                        return {
                            ...booking,
                            slotStartTime: matchedSlot.startTime || matchedSlot.start_time || matchedSlot.startTimeOnly
                        };
                    } else {
                        console.log(`Match NOT Found for Booking ${booking.id}: Slot ${booking.slotId} in Charger ${booking.chargerId} list`);
                    }
                }
                return booking;
            });
            console.log('--- ENRICHMENT COMPLETE ---');

            setBookings(enrichedBookings);
        } catch (error) {
            console.error(error);
            // showAlert("Error", "Failed to fetch bookings.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const handleBookingPress = (booking) => {
        if (activeTab !== 'Active') return;
        setSelectedBooking(booking);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setSelectedBooking(null);
    };

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
            boxId: booking.boxId || booking.charger?.ocppId || booking.chargerId, // Best guess mapping
            chargerType: chargerType,
            maxPower: power,
            connectorType: connector || fallbackConnector,
            status: 'Available', // Assuming available since booked
            bookingId: booking.id // Pass booking ID if Config needs it to validate
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
                            fetchBookings(); // Refresh list
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

    const formatDate = (dateString, timeString) => {
        try {
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    // Helper to format array timestamp [y, m, d, h, m] to string
    const formatTime = (timeArray) => {
        if (!Array.isArray(timeArray)) return timeArray;
        const [y, M, d, h, m] = timeArray;
        const date = new Date(y, M - 1, d, h, m);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (inputTime) => {
        const now = new Date();
        let dateObj = new Date(); // Defaults to "Today"
        let timeSet = false;

        if (!inputTime) {
            return {
                date: now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
                time: '---'
            };
        }

        try {
            if (Array.isArray(inputTime)) {
                // Jackson array format: [y, M, d, h, m, s, ms]
                const [y, M, d, h, m, s] = inputTime;
                dateObj = new Date(y, M - 1, d, h, m, s || 0);
                timeSet = true;
            } else if (typeof inputTime === 'string') {
                // Check if it's strictly HH:mm or HH:mm:ss format
                const timeOnlyRegex = /^([01]\d|2[0-3])[:.]([0-5]\d)([:.]([0-5]\d))?$/;
                if (timeOnlyRegex.test(inputTime)) {
                    // Handle times like "14:30" or "14.30"
                    const parts = inputTime.split(/[:.]/).map(Number);
                    dateObj.setHours(parts[0], parts[1], parts[2] || 0, 0);
                    timeSet = true;
                } else {
                    // Try parsing as ISO or full date string
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
                // Handle timestamp
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

    // Filter Logic
    const activeBookings = bookings.filter(b => {
        const s = (b.status || '').toUpperCase();
        return s === 'BOOKED' || s === 'CONFIRMED' || s === 'ACTIVE';
    });

    const historyBookings = bookings.filter(b => {
        const s = (b.status || '').toUpperCase();
        return s !== 'BOOKED' && s !== 'CONFIRMED' && s !== 'ACTIVE';
    });

    const displayedBookings = activeTab === 'Active' ? activeBookings : historyBookings;

    const BookingCard = ({ booking }) => {
        // Robust time finding - checking all likely permutations
        // Strict Slot Time only
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

        // Header Time Display Logic
        const hasSlot = slotInfo.time !== '---';
        const displayDate = hasSlot ? slotInfo.date : bookingInfo.date;
        const displayTime = hasSlot ? slotInfo.time : 'Slot Pending';
        const isPending = !hasSlot;

        // Derive Charger Details safely
        const chargerType = booking.chargerType || booking.charger_type || booking.charger?.chargerType || 'Fast';
        const connector = booking.connectorType || booking.connector_type || booking.charger?.connectorType || 'CCS 2';
        const power = booking.power || booking.maxPower || booking.charger?.maxPower || '120';

        // Determine AC/DC based on known types or explicit field
        const currentType = (chargerType.toString().toUpperCase().includes('AC') || connector.includes('Type 2')) ? 'AC' : 'DC';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={activeTab === 'Active' ? 0.7 : 1}
                onPress={() => handleBookingPress(booking)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.stationName}>{booking.stationName || booking.station_name || 'Unknown Station'}</Text>
                    <View style={[
                        styles.statusPill,
                        {
                            backgroundColor: (booking.status || '').toUpperCase() === 'BOOKED'
                                ? 'rgba(76, 175, 80, 0.1)'
                                : ((booking.status || '').toUpperCase() === 'CANCELLED'
                                    ? 'rgba(244, 67, 54, 0.1)'
                                    : 'rgba(158, 158, 158, 0.1)')
                        }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            {
                                color: (booking.status || '').toUpperCase() === 'BOOKED'
                                    ? Colors.statusGreen
                                    : ((booking.status || '').toUpperCase() === 'CANCELLED'
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

                {/* Inline Cancel button removed */}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            {/* Tabs */}
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

            {/* List */}
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primaryContainer} />}
                >
                    {displayedBookings.length > 0 ? (
                        displayedBookings.map(item => {
                            console.log('Booking Item Raw:', JSON.stringify(item, null, 2));
                            return <BookingCard key={item.id} booking={item} />;
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings found.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Booking Details Modal */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedBooking && (() => {
                            // Re-use robust derivation logic in modal
                            // Strict Slot Time
                            const slotTimeSource = selectedBooking.slotStartTime ||
                                selectedBooking.slot_start_time ||
                                selectedBooking.slot?.startTime ||
                                selectedBooking.slot?.start_time ||
                                selectedBooking.slot?.startTimeOnly ||
                                selectedBooking.startTime ||
                                selectedBooking.start_time;

                            const slotInfo = formatDateTime(slotTimeSource);
                            const bookedOn = formatDateTime(selectedBooking.bookingTime || selectedBooking.booking_time);
                            const chargerType = selectedBooking.chargerType || selectedBooking.charger_type || 'Fast';
                            const connector = selectedBooking.connectorType || selectedBooking.connector_type || 'CCS 2';
                            const power = selectedBooking.power || selectedBooking.maxPower || selectedBooking.kwOutput || '120';
                            const status = (selectedBooking.status || 'unknown').toUpperCase();

                            return (
                                <>
                                    {/* Close Button */}
                                    <View style={styles.modalHeader}>
                                        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                                            <X size={24} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={styles.modalTitle}>Booking Details</Text>
                                        <View style={{ width: 24 }} />
                                    </View>

                                    {/* Content */}
                                    <View style={styles.modalBody}>
                                        <Text style={styles.modalStationName}>{selectedBooking.stationName || selectedBooking.station_name || 'Unknown Station'}</Text>

                                        <View style={styles.modalTimeContainer}>
                                            <View style={styles.modalTimeBlock}>
                                                <Calendar size={18} color={slotInfo.time === '---' ? '#888' : Colors.primaryContainer} />
                                                <Text style={[styles.modalTimeText, slotInfo.time === '---' && { color: '#888' }]}>
                                                    {slotInfo.time !== '---' ? slotInfo.date : bookedOn.date}
                                                </Text>
                                            </View>
                                            <View style={styles.modalTimeBlock}>
                                                <Clock size={18} color={slotInfo.time === '---' ? '#FF9800' : Colors.primaryContainer} />
                                                <Text style={[styles.modalTimeText, slotInfo.time === '---' && { color: '#FF9800' }]}>
                                                    {slotInfo.time !== '---' ? slotInfo.time : 'Slot Pending'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={styles.modalLabel}>Booking ID:</Text>
                                            <Text style={styles.modalValue}>#{selectedBooking.id}</Text>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={styles.modalLabel}>Booked On:</Text>
                                            <Text style={styles.modalValue}>{bookedOn.date} at {bookedOn.time}</Text>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={styles.modalLabel}>Charger Details:</Text>
                                            <Text style={styles.modalValue}>{connector} • {chargerType} ({power}kW)</Text>
                                        </View>

                                        <View style={styles.modalInfoRow}>
                                            <Text style={styles.modalLabel}>Status:</Text>
                                            <Text style={[styles.modalValue, {
                                                color: status === 'BOOKED' ? Colors.primaryContainer : (status === 'CANCELLED' ? Colors.statusRed : '#aaa')
                                            }]}>{status}</Text>
                                        </View>

                                        {/* Actions */}
                                        <TouchableOpacity
                                            style={[styles.startBtn]}
                                            onPress={handleStartNow}
                                            disabled={false}
                                        >
                                            <Play size={20} color={Colors.matteBlack} fill={Colors.matteBlack} />
                                            <Text style={styles.startBtnText}>Start Now</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.modalCancelBtn}
                                            onPress={() => handleCancel(selectedBooking.id)}
                                            disabled={cancellingId === selectedBooking.id}
                                        >
                                            {cancellingId === selectedBooking.id ? (
                                                <ActivityIndicator color="#6e0000ff" />
                                            ) : (
                                                <Text style={styles.modalCancelText}>Cancel Booking</Text>
                                            )}
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
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: Colors.matteBlack,
        zIndex: 10,
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
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        marginBottom: 10,
    },
    tab: {
        marginRight: 25,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.primaryContainer,
    },
    tabText: {
        color: '#888',
        fontSize: 16,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 50,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    stationName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        width: '100%',
        textAlign: 'center',
        textTransform: 'capitalize',
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    detailText: {
        color: '#aaa',
        fontSize: 13,
        marginLeft: 6,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: '#444',
        marginHorizontal: 10,
    },
    timeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    closeBtn: {
        padding: 4
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    modalBody: {
        alignItems: 'center'
    },
    modalStationName: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20
    },
    modalTimeContainer: {
        flexDirection: 'row',
        backgroundColor: '#2f2f2fff',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 0,
        width: '100%',
        justifyContent: 'space-around',
        marginBottom: 24
    },
    modalTimeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    modalTimeText: {
        color: '#eee',
        fontSize: 16,
        fontWeight: '400'
    },
    modalInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 12
    },
    modalLabel: {
        color: '#888',
        fontSize: 14
    },
    modalValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '400'
    },
    startBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primaryContainer,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 20,
        marginBottom: 12
    },
    startBtnText: {
        color: Colors.matteBlack,
        fontSize: 16,
        fontWeight: 'bold'
    },
    modalCancelBtn: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center'
    },
    modalCancelText: {
        color: '#ff6767ff',
        fontSize: 14,
        fontWeight: '600'
    }
});
