import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Zap, Clock, MapPin, ChevronRight, AlertCircle } from 'lucide-react-native';
import { sessionApi } from '../services/api';
import { authService } from '../services/auth';
import { Colors } from '../styles/GlobalStyles';
import LinearGradient from 'react-native-linear-gradient';

export default function ActiveSessionsScreen({ navigation }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchActiveSessions();
    }, []);

    const fetchActiveSessions = async () => {
        try {
            const user = await authService.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const userId = user.id || user.userId || user.email;

            // Note: Our API getActiveSession currently returns only 1 session object.
            // We'll call the direct endpoint to get all if possible, or handle the single one.
            // Based on api.js logic, it filters /sessions/active/details.

            const response = await sessionApi.getAllActiveSessions(userId);
            setSessions(response || []);
        } catch (error) {
            console.error("Error fetching active sessions:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActiveSessions();
    };

    const handleSessionPress = (session) => {
        navigation.navigate('Session', {
            resumeSessionId: session.sessionId,
            chargerId: session.chargerId,
            boxId: session.boxId,
            stationName: session.stationName,
            startTime: session.startTime,
            selectedKwh: session.selectedKwh,
            planId: session.planId,
            rate: session.rate,
            connectorType: session.connectorType,
            chargerType: session.chargerType,
            stationId: session.stationId,
            latitude: session.latitude,
            longitude: session.longitude
        });
    };

    const formatStartTime = (timestamp) => {
        if (!timestamp) return "Unknown";
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderSessionItem = ({ item }) => (
        <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => handleSessionPress(item)}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={['#2A2A2A', '#1E1E1E']}
                style={styles.cardGradient}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconWrapper}>
                        <Zap size={20} color={Colors.statusGreen} fill={Colors.statusGreen} />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.stationName} numberOfLines={1}>{item.stationName}</Text>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>ACTIVE</Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color="#555" />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Clock size={16} color="#888" style={styles.infoIcon} />
                        <Text style={styles.infoLabel}>Started at:</Text>
                        <Text style={styles.infoValue}>{formatStartTime(item.startTime)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Zap size={16} color="#888" style={styles.infoIcon} />
                        <Text style={styles.infoLabel}>Charger Type:</Text>
                        <Text style={styles.infoValue}>{item.chargerType}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.resumeBtn}
                    onPress={() => handleSessionPress(item)}
                >
                    <Text style={styles.resumeBtnText}>View Progress</Text>
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Active Sessions</Text>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.statusGreen} />
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderSessionItem}
                    keyExtractor={(item) => item.sessionId.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.statusGreen} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconWrapper}>
                                <AlertCircle size={48} color="#333" />
                            </View>
                            <Text style={styles.emptyTitle}>No Active Sessions</Text>
                            <Text style={styles.emptySubtitle}>You don't have any charging sessions running right now.</Text>
                            <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => navigation.navigate('Home')}
                            >
                                <Text style={styles.startBtnText}>Find a Station</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionCard: {
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardGradient: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerInfo: {
        flex: 1,
    },
    stationName: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.statusGreen,
        marginRight: 6,
    },
    statusText: {
        color: Colors.statusGreen,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 20,
    },
    cardBody: {
        gap: 12,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIcon: {
        marginRight: 10,
    },
    infoLabel: {
        color: '#888',
        fontSize: 14,
        marginRight: 5,
    },
    infoValue: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '500',
    },
    resumeBtn: {
        backgroundColor: Colors.statusGreen,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.statusGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    resumeBtnText: {
        color: Colors.matteBlack,
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1E1E1E',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        color: Colors.white,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    startBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    startBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
});
