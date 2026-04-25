import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Info, AlertTriangle, CheckCircle, SmartphoneCharging } from 'lucide-react-native';
import { notificationApi } from '../services/api';
import { authService } from '../services/auth';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../styles/GlobalStyles';

const NotificationScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [allNotifications, setAllNotifications] = useState([]);
    const [displayLimit, setDisplayLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Derived state for visible items
    const visibleNotifications = allNotifications.slice(0, displayLimit);

    const fetchNotifications = async () => {
        try {
            const user = await authService.getUser();
            if (user) {
                const userId = user.id || user.userId;
                const data = await notificationApi.getAllNotifications(userId);
                // Ensure data is array
                const list = Array.isArray(data) ? data : (data?.notifications || []);

                // Sort by new first if not already
                const sorted = list.sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
                    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
                    return timeB - timeA;
                });

                setAllNotifications(sorted);
                setDisplayLimit(10); // Reset limit on fresh fetch
            }
        } catch (error) {
            console.log("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id, currentReadStatus) => {
        if (currentReadStatus) return; // Already read

        // Optimistic update
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, isRead: true } : n));

        try {
            await notificationApi.markAsRead(id);
        } catch (error) {
            console.error("Failed to mark as read", error);
            // Revert on failure? Usually not worth the jarring UI flip for read status.
        }
    };

    const markAllAsRead = async () => {
        const unread = allNotifications.filter(n => !n.read && !n.isRead);
        if (unread.length === 0) return;

        // Optimistic
        setAllNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));

        try {
            await Promise.all(unread.map(n => notificationApi.markAsRead(n.id)));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    }

    const getIcon = (type) => {
        const lowerType = (type || '').toLowerCase();
        if (lowerType.includes('success') || lowerType.includes('complete')) return <CheckCircle size={24} color={Colors.statusGreen} />;
        if (lowerType.includes('warn') || lowerType.includes('low')) return <AlertTriangle size={24} color={Colors.statusOrange} />;
        if (lowerType.includes('alert') || lowerType.includes('fail')) return <AlertTriangle size={24} color={Colors.statusRed} />;
        if (lowerType.includes('charging') || lowerType.includes('session')) return <SmartphoneCharging size={24} color={Colors.primary} />;
        return <Info size={24} color={Colors.white} />;
    };

    const formatTime = (time) => {
        if (!time) return '';
        try {
            const date = new Date(time);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.round(diffMs / 60000);
            const diffHrs = Math.round(diffMs / 3600000);
            const diffDays = Math.round(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHrs < 24) return `${diffHrs} hr ago`;
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return time; // Fallback
        }
    };

    const renderItem = ({ item }) => {
        const isRead = item.read || item.isRead || false; // Handle common backend field names
        return (
            <TouchableOpacity
                style={[styles.notificationCard, !isRead && styles.unreadCard]}
                onPress={() => markAsRead(item.id, isRead)}
                activeOpacity={0.8}
            >
                {/* Unread Indicator Vertical Bar */}
                {!isRead && <View style={styles.unreadIndicator} />}

                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        {getIcon(item.type)}
                    </View>
                    <View style={styles.textContainer}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, !isRead && styles.unreadTitle]}>{item.title}</Text>
                            <Text style={styles.timestamp}>
                                {formatTime(item.createdAt || item.timestamp)}
                            </Text>
                        </View>
                        <Text style={styles.message} numberOfLines={3}>{item.message || item.body}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
                    <Text style={styles.markAllText}>Read all</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : allNotifications.length > 0 ? (
                <FlatList
                    data={visibleNotifications}
                    renderItem={renderItem}
                    keyExtractor={item => (item.id || Math.random()).toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListFooterComponent={
                        allNotifications.length > displayLimit ? (
                            <TouchableOpacity
                                style={styles.loadMoreButton}
                                onPress={() => setDisplayLimit(prev => prev + 10)}
                            >
                                <Text style={styles.loadMoreText}>Load More</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.footerNote}>
                                <Text style={styles.footerNoteText}>You're all caught up</Text>
                            </View>
                        )
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Bell size={48} color={Colors.white} />
                    </View>
                    <Text style={styles.emptyText}>No notifications yet</Text>
                    <Text style={styles.emptySubText}>We'll notify you when something happens.</Text>
                </View>
            )}
        </View>
    );
};

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
        paddingBottom: 20,
        marginTop: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.white,
        flex: 1,
        marginLeft: 8,
    },
    markReadBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(57, 226, 155, 0.1)',
        borderRadius: 20,
    },
    markAllText: {
        color: Colors.statusGreen,
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    notificationCard: {
        backgroundColor: Colors.cardBg, // #1E1E1E usually
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',

        // Shadow/Elevation
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
        borderWidth: 0,
    },
    unreadCard: {
        // Slightly lighter bg to distinguish? OR usage of the stripe
        backgroundColor: '#252525',
    },
    unreadIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: Colors.statusGreen,
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
    },
    iconContainer: {
        marginRight: 16,
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.white,
        flex: 1,
        paddingRight: 8,
    },
    unreadTitle: {
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    message: {
        fontSize: 14,
        color: '#aaa',
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadMoreButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    loadMoreText: {
        color: Colors.statusGreen,
        fontSize: 14,
        fontWeight: '600',
    },
    footerNote: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerNoteText: {
        color: '#555',
        fontSize: 14,
        fontStyle: 'italic',
    },
});

export default NotificationScreen;
