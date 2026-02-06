import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Platform, KeyboardAvoidingView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, ChevronLeft, KeyRound, CheckCircle, ArrowRight } from 'lucide-react-native';

export default function ResetPasswordScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    // UI State
    const [step, setStep] = useState(1); // 1: Email, 2: New Password
    const [loading, setLoading] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendCode = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert("Invalid Email", "Please enter a valid email address.");
            return;
        }

        setLoading(true);
        // Simulate API Call to send OTP
        console.log("Sending OTP to:", email);

        setTimeout(() => {
            setLoading(false);
            setStep(2);
            Alert.alert("Code Sent", `We've sent a verification code to ${email}`);
        }, 1500);
    };

    const handleResetPassword = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert("Invalid Code", "Please enter the valid verification code.");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            Alert.alert("Weak Password", "Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Mismatch", "Passwords do not match.");
            return;
        }

        setLoading(true);
        // Simulate API Call to reset password
        console.log("Resetting password for:", email, "with code:", otp);

        setTimeout(() => {
            setLoading(false);
            Alert.alert("Success", "Your password has been reset successfully!", [
                { text: "Login Now", onPress: () => navigation.navigate('Login') }
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
                        <KeyRound size={32} color="#39E29B" />
                    </View>
                    <Text style={styles.title}>
                        {step === 1 ? "Forgot Password?" : "Reset Password"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 1
                            ? "Don't worry! It happens. Please enter the email associated with your account."
                            : `Enter the code sent to ${email} and your new password.`}
                    </Text>
                </View>

                {/* Form Step 1: Email */}
                {step === 1 && (
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#666"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
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

                {/* Form Step 2: OTP & New Password */}
                {step === 2 && (
                    <View style={styles.formContainer}>
                        {/* OTP Input */}
                        <Text style={styles.inputLabel}>Verification Code</Text>
                        <View style={styles.inputWrapper}>
                            <CheckCircle size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter OTP Code"
                                placeholderTextColor="#666"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* New Password */}
                        <Text style={styles.inputLabel}>New Password</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor="#666"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Confirm Password */}
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={20} color="#888" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter password"
                                placeholderTextColor="#666"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.btnText}>Reset Password</Text>
                            )}
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
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    inputIcon: {
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
});
