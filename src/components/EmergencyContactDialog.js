import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Platform, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Phone, X, User, ShieldAlert, Building2 } from 'lucide-react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';
import { emergencyApi } from '../services/api';

const { width } = Dimensions.get('window');

const EmergencyContactDialog = ({ visible, onClose, stationId }) => {
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const overlayStyle = {
        opacity: progress,
    };

    const cardStyle = {
        opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                }),
            },
        ],
    };

    useEffect(() => {
        if (visible && stationId) {
            fetchContact();
        }
    }, [visible, stationId]);

    const fetchContact = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await emergencyApi.getContact(stationId);
            console.log(">>> Emergency Contact Data:", data);

            // Normalize response — handle both single object and array response
            const contactData = Array.isArray(data) ? data[0] : data;

            if (contactData) {
                setContact(contactData);
            } else {
                setError("No contact details found.");
            }
        } catch (err) {
            console.error("Failed to fetch emergency contact", err);

            if (err.response) {
                const status = err.response.status;
                if (status === 404) {
                    setError("No emergency contact found for this station.");
                } else if (status === 403) {
                    setError("You do not have permission to view contact details.");
                } else if (status === 500) {
                    setError("Server error. Please try again later.");
                } else {
                    setError("Unable to load contact details.");
                }
            } else if (err.request) {
                setError("Network error. Check your internet connection.");
            } else {
                setError("Unable to load contact details.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    // Extraction logic
    // We prioritize the fields from the admin panel (cpuSupportNumber, companySupportNumber)
    // but add more fallbacks to ensure something shows up.
    const cpuNumber = contact?.contactNumber || contact?.contactNumber || contact?.phoneNumber || contact?.phone || contact?.emergencyContact;
    const companyNumber = contact?.companySupportNumber || contact?.companyPhone || contact?.supportNumber;
    const stationName = 'Station Support';

    const handleCall = (number) => {
        if (!number) return;
        const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
        Linking.openURL(`${scheme}${number}`);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.dialogContainer, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <View style={styles.iconContainer}>
                                <ShieldAlert size={24} color={Colors.statusRed} />
                            </View>
                            <Text style={styles.title}>Emergency Support</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#aaa" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Contact support for immediate assistance with safety or operational issues.
                    </Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primaryContainer} />
                            <Text style={styles.loadingText}>Loading contact info...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={fetchContact}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        contact && (
                            <View style={styles.card}>
                                <View style={styles.managerHeader}>
                                    <View style={styles.avatar}>
                                        <User size={24} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.managerName}>{stationName}</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                {/* Actions */}
                                <View style={styles.actionContainer}>
                                    {/* CPU Support Number */}
                                    <TouchableOpacity
                                        style={[styles.actionRow, !cpuNumber && styles.disabledAction]}
                                        onPress={() => handleCall(cpuNumber)}
                                        disabled={!cpuNumber}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0, 230, 118, 0.1)' }]}>
                                            <Phone size={20} color={Colors.statusGreen} />
                                        </View>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={styles.actionLabel}>CPU Support</Text>
                                            <Text style={[styles.actionValue, { color: Colors.statusGreen }]}>
                                                {cpuNumber || 'Not Available'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Company Support Number */}
                                    <TouchableOpacity
                                        style={[styles.actionRow, !companyNumber && styles.disabledAction]}
                                        onPress={() => handleCall(companyNumber)}
                                        disabled={!companyNumber}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(100, 149, 237, 0.1)' }]}>
                                            <Building2 size={20} color="#6495ED" />
                                        </View>
                                        <View style={styles.actionTextContainer}>
                                            <Text style={styles.actionLabel}>Company Support</Text>
                                            <Text style={[styles.actionValue, { color: '#6495ED' }]}>
                                                {companyNumber || 'Not Available'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )
                    )}

                    {/* Dismiss Button */}
                    <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 66, 19, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: Fonts.primary,
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 24,
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 24,
    },
    managerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    managerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    designation: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginBottom: 16,
    },
    actionContainer: {
        gap: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTextContainer: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    actionValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    disabledAction: {
        opacity: 0.5,
    },
    dismissButton: {
        width: '100%',
        paddingVertical: 14,
        backgroundColor: '#333',
        borderRadius: 12,
        alignItems: 'center',
    },
    dismissText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#ccc',
        marginTop: 10,
    },
    errorContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    errorText: {
        color: Colors.statusRed,
        marginBottom: 15,
        textAlign: 'center',
    },
    retryBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#333',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    }
});

export default EmergencyContactDialog;
