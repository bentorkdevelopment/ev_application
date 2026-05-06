import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    Modal, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import { X, User, Phone, Mail } from 'lucide-react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';

export default function AddContactModal({ visible, onClose, onSave }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const progress = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            progress.value = withTiming(1, { duration: 200 });
        } else {
            progress.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const cardStyle = useAnimatedStyle(() => {
        const translateY = interpolate(progress.value, [0, 1], [100, 0], Extrapolation.CLAMP);
        const scale = interpolate(progress.value, [0, 1], [0.9, 1], Extrapolation.CLAMP);
        const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP);

        return {
            opacity,
            transform: [
                { translateY: withSpring(translateY, { damping: 1150, stiffness: 1000 }) },
                { scale: withSpring(scale, { damping: 1150, stiffness: 1000 }) }
            ],
        };
    });

    const handleSave = () => {
        if (!name.trim() || !phone.trim()) {
            // Simple validation, normally we show error
            return;
        }
        onSave({
            name,
            phone,
            email,
        });
        // Reset
        setName('');
        setPhone('');
        setEmail('');
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <Animated.View style={[styles.modalOverlay, overlayStyle]}>
                    <Animated.View style={[styles.modalContent, cardStyle]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>New Contact</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputContainer}>
                                <User size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#666"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Phone size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter phone number"
                                    placeholderTextColor="#666"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputContainer}>
                                <Mail size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter email address"
                                    placeholderTextColor="#666"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.saveBtn, (!name.trim() || !phone.trim()) && styles.saveBtnDisabled]} 
                            onPress={handleSave}
                            disabled={!name.trim() || !phone.trim()}
                        >
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center', // Changed to centered
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1C1C1E', 
        borderRadius: 24, // Consistent radius
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: Fonts.primary,
    },
    closeBtn: {
        padding: 5,
    },
    form: {
        paddingHorizontal: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
        fontFamily: Fonts.primary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#333',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.primary,
        height: '100%',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        gap: 15,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#333',
    },
    saveBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
