import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, ChevronLeft, ArrowRight, CheckCircle, Smartphone } from 'lucide-react-native';

export default function OtpScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // UI State
    const [step, setStep] = useState(1); // 1: Phone Number, 2: OTP
    const [loading, setLoading] = useState(false);

    // Form Data
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');

    const handleSendCode = async () => {
        // Basic validation
        if (!phoneNumber || phoneNumber.length < 10) {
            Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
            return;
        }

        setLoading(true);
        // Simulate API Call to send OTP
        console.log("Sending OTP to:", phoneNumber);

        setTimeout(() => {
            setLoading(false);
            setStep(2);
            // In a real app, you might auto-fill the OTP or show a toast
            Alert.alert("Code Sent", `We've sent a text to +91 ${phoneNumber}`);
        }, 1500);
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert("Invalid Code", "Please enter the valid 4-digit code.");
            return;
        }

        setLoading(true);
        console.log("Verifying OTP:", otp, "for number:", phoneNumber);

        // Simulate Verification
        setTimeout(() => {
            setLoading(false);
            // Determine where to go - usually Home if login, or next step if registration
            // Assuming this is "Login with OTP"
            Alert.alert("Success", "Verified successfully!", [
                { text: "Continue", onPress: () => navigation.replace('Home') }
            ]);
        }, 2000);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
                >
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>

                {/* Header Content */}
                <View style={styles.headerContainer}>
                    <View style={styles.iconCircle}>
                        <Smartphone size={32} color="#39E29B" />
                    </View>
                    <Text style={styles.title}>
                        {step === 1 ? "Login with Phone" : "Verify Number"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 1
                            ? "Enter your mobile number to receive a verification code."
                            : `Enter the 4-digit code sent to +91 ${phoneNumber}`}
                    </Text>
                </View>

                {/* Form Step 1: Phone Number */}
                {step === 1 && (
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Mobile Number</Text>
                        <View style={styles.inputWrapper}>
                            <Phone size={20} color="#888" style={styles.inputIcon} />
                            <Text style={styles.countryCode}>+91</Text>
                            <View style={styles.verticalDivider} />
                            <TextInput
                                style={styles.input}
                                placeholder="00000 00000"
                                placeholderTextColor="#666"
                                value={phoneNumber}
                                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleSendCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Text style={styles.btnText}>Send Code</Text>
                                    <ArrowRight size={20} color="#000" style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Form Step 2: OTP Input */}
                {step === 2 && (
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Verification Code</Text>
                        <View style={styles.inputWrapper}>
                            <CheckCircle size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { letterSpacing: 5, fontSize: 18 }]}
                                placeholder="- - - -"
                                placeholderTextColor="#666"
                                value={otp}
                                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleVerifyOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.btnText}>Verify & Login</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendBtn}
                            onPress={() => {
                                setOtp('');
                                Alert.alert("Sent!", "New code sent.");
                            }}
                        >
                            <Text style={styles.resendText}>Resend Code</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    headerContainer: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(57, 226, 155, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.2)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        lineHeight: 24,
    },
    formContainer: {
        width: '100%',
    },
    inputLabel: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    inputIcon: {
        marginRight: 10,
    },
    countryCode: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#444',
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    actionBtn: {
        backgroundColor: '#39E29B',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resendBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    resendText: {
        color: '#888',
        fontSize: 14,
    },
});
