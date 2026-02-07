import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Info, AlertTriangle, CheckCircle, SmartphoneCharging } from 'lucide-react-native';
import { notificationApi } from '../services/api';
import { authService } from '../services/auth';
import { useFocusEffect } from '@react-navigation/native';

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
        if (lowerType.includes('success') || lowerType.includes('complete')) return <CheckCircle size={24} color="#00E676" />;
        if (lowerType.includes('warn') || lowerType.includes('low')) return <AlertTriangle size={24} color="#FFC107" />;
        if (lowerType.includes('alert') || lowerType.includes('fail')) return <AlertTriangle size={24} color="#FF5252" />;
        if (lowerType.includes('charging') || lowerType.includes('session')) return <SmartphoneCharging size={24} color="#00E676" />;
        return <Info size={24} color="#2979FF" />;
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
                <View style={styles.iconContainer}>
                    {getIcon(item.type)}
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, !isRead && styles.unreadTitle]}>{item.title}</Text>
                        {!isRead && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={3}>{item.message || item.body}</Text>
                    <Text style={styles.timestamp}>
                        {formatTime(item.createdAt || item.timestamp)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllText}>Read all</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#00E676" />
                </View>
            ) : allNotifications.length > 0 ? (
                <FlatList
                    data={visibleNotifications}
                    renderItem={renderItem}
                    keyExtractor={item => (item.id || Math.random()).toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />
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
                                <Text style={styles.footerNoteText}>No more notifications</Text>
                            </View>
                        )
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Bell size={64} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    markAllText: {
        color: '#39E29B',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    unreadCard: {
        backgroundColor: 'rgba(57, 226, 155, 0.05)',
        borderColor: 'rgba(57, 226, 155, 0.3)',
    },
    iconContainer: {
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
    unreadTitle: {
        fontWeight: '700',
        color: '#39E29B',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#39E29B',
        marginLeft: 8,
    },
    message: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 8,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        marginTop: 16,
        fontSize: 16,
    },
    loadMoreButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
    },
    loadMoreText: {
        color: '#00E676',
        fontSize: 14,
        fontWeight: '600',
    },
    footerNote: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerNoteText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
    },
});

export default NotificationScreen;
