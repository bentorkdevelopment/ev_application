import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Mail, MessageSquare, Star, User } from 'lucide-react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';
import { useAlert } from '../context/AlertContext';

export default function ContactDetailsScreen({ route, navigation }) {
    const { showAlert } = useAlert();
    const { contact } = route.params;

    const handleAction = (actionType) => {
        // In a real app, you would use Linking to open dialer, SMS, or email client
        showAlert("Action Triggered", `Triggered ${actionType} for ${contact.name}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Star size={24} color={contact.isFavorite ? '#FFD700' : '#fff'} fill={contact.isFavorite ? '#FFD700' : 'transparent'} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {contact.avatar ? (
                            <Image source={{ uri: contact.avatar }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {contact.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {contact.status === 'online' && (
                            <View style={styles.statusIndicatorWrapper}>
                                <View style={styles.statusIndicator} />
                            </View>
                        )}
                    </View>
                    
                    <Text style={styles.nameText}>{contact.name}</Text>
                    <Text style={styles.statusText}>
                        {contact.status === 'online' ? 'Online' : 'Offline'}
                    </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleAction('Call')}>
                        <View style={[styles.actionIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
                            <Phone size={24} color={Colors.statusGreen || '#00E676'} />
                        </View>
                        <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleAction('Message')}>
                        <View style={[styles.actionIconBox, { backgroundColor: 'rgba(57, 226, 155, 0.15)' }]}>
                            <MessageSquare size={24} color={Colors.primaryContainer} />
                        </View>
                        <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleAction('Email')}>
                        <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                            <Mail size={24} color={Colors.statusOrange || '#FF9800'} />
                        </View>
                        <Text style={styles.actionText}>Email</Text>
                    </TouchableOpacity>
                </View>

                {/* Details Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Contact Information</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Phone size={20} color="#888" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Mobile</Text>
                            <Text style={styles.infoValue}>{contact.phone}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Mail size={20} color="#888" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{contact.email || 'Not provided'}</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: Colors.primaryContainer,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#444',
    },
    avatarText: {
        color: '#fff',
        fontSize: 36,
        fontWeight: 'bold',
    },
    statusIndicatorWrapper: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#0F0F0F',
        borderRadius: 10,
        padding: 3,
    },
    statusIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.statusGreen || '#00E676',
    },
    nameText: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        fontFamily: Fonts.primary,
        marginBottom: 5,
        textAlign: 'center',
    },
    statusText: {
        color: '#888',
        fontSize: 14,
        fontFamily: Fonts.primary,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 30,
    },
    quickActionBtn: {
        alignItems: 'center',
    },
    actionIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        fontFamily: Fonts.primary,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 4,
    },
    infoValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 15,
        marginLeft: 55,
    },
});
