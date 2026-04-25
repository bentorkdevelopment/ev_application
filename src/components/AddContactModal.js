import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    Modal, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { X, User, Phone, Mail } from 'lucide-react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';

export default function AddContactModal({ visible, onClose, onSave }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

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
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
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
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1C1C1E', // standard card color
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingVertical: 20,
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
