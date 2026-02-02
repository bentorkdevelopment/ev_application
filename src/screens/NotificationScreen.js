import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Calendar, Info, AlertTriangle, CheckCircle } from 'lucide-react-native';

const INITIAL_NOTIFICATIONS = [
    {
        id: '1',
        title: 'Charging Session Completed',
        message: 'Your charging session at Bentork Station - Pune has successfully completed. Total cost: ₹250.',
        type: 'success',
        timestamp: '2 mins ago',
        read: false,
    },
    {
        id: '2',
        title: 'Low Wallet Balance',
        message: 'Your wallet balance is low. Please recharge to continue seamless charging services.',
        type: 'warning',
        timestamp: '1 hour ago',
        read: false,
    },
    {
        id: '3',
        title: 'New Feature Alert!',
        message: 'We have introduced custom power selection for supported chargers. Check it out now!',
        type: 'info',
        timestamp: '1 day ago',
        read: true,
    },
    {
        id: '4',
        title: 'Maintenance Update',
        message: 'Scheduled maintenance for server upgrades on Sunday from 2 AM to 4 AM.',
        type: 'alert',
        timestamp: '2 days ago',
        read: true,
    },
    {
        id: '5',
        title: 'Welcome to Bentork EV',
        message: 'Thanks for joining the revolution! Explore nearby chargers and start your first session.',
        type: 'info',
        timestamp: '5 days ago',
        read: true,
    }
];

const NotificationScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={24} color="#00E676" />;
            case 'warning': return <AlertTriangle size={24} color="#FFC107" />; // Amber
            case 'alert': return <AlertTriangle size={24} color="#FF5252" />; // Red
            default: return <Info size={24} color="#2979FF" />; // Blue
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                {getIcon(item.type)}
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
                    {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
        </TouchableOpacity>
    );

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

            {notifications.length > 0 ? (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        marginTop: 16,
        fontSize: 16,
    },
});

export default NotificationScreen;
