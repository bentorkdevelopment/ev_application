
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, Phone } from 'lucide-react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { authApi } from '../services/api';
import { useAlert } from '../context/AlertContext';

export default function RegisterScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    // Form State
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
            scopes: ['email', 'profile'],
        });
    }, []);

    const handleRegister = async () => {
        if (!name || !mobile || !email || !password) {
            showAlert("Error", "Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            showAlert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // Connected to backend Registration API
            console.log("Registering User:", { name, mobile, email });
            const response = await authApi.register({
                name,
                mobile,
                email,
                password,
                confirmPassword
            });

            setLoading(false);
            showAlert("Success", "Account created successfully! Please login.", [
                { text: "Login", onPress: () => navigation.navigate('Login') }
            ]);

        } catch (error) {
            console.error("Registration failed", error);
            setLoading(false);
            const msg = error.userMessage || error.response?.data || "Registration failed. Please try again.";
            showAlert("Error", typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
    };

    const handleGoogleRegister = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            console.log("Google Sign In Raw Response:", JSON.stringify(userInfo));

            // Robust user extraction for different library versions
            const user = userInfo.data?.user || userInfo.user || userInfo;

            if (user && user.email) {
                // Navigate to OTP Screen for Mobile Verification
                navigation.navigate('OtpLogin', {
                    googleUser: {
                        name: user.name,
                        email: user.email,
                        photo: user.photo
                    }
                });
            } else {
                console.warn("Could not extract user details.", userInfo);
                showAlert("Error", "Could not get user details from Google.");
            }
        } catch (error) {
            console.error("Google Sign Up Error:", error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled, do nothing or show toast
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // Operation in progress
            } else {
                showAlert("Sign In Failed", error.message || "Could not sign in with Google.");
            }
        }
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
                {/* Header / Logo Area */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../assets/images/logo_inverted.png')}
                            style={styles.logo}
                            resizeMode="contain"
                            tintColor="#ffffff"
                        />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to start charging</Text>
                </View>

                {/* Form Area */}
                <View style={styles.formContainer}>
                    {/* Name Input */}
                    <View style={styles.inputWrapper}>
                        <User size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Mobile Input */}
                    <View style={styles.inputWrapper}>
                        <Phone size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile Number"
                            placeholderTextColor="#666"
                            value={mobile}
                            onChangeText={setMobile}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputWrapper}>
                        <Lock size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            {showPassword ? <EyeOff size={20} color="#888" /> : <Eye size={20} color="#888" />}
                        </TouchableOpacity>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputWrapper}>
                        <CheckCircle size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#666"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    {/* Register Button */}
                    <TouchableOpacity
                        style={[styles.registerBtn, loading && styles.disabledBtn]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.registerBtnText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Button */}
                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleRegister}>
                        <Image
                            source={require('../assets/images/google_ic.webp')}
                            style={styles.googleIcon}
                        />
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginLinkText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLinkHighlight}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(57, 226, 156, 0)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
        borderWidth: 0,
        borderColor: 'rgba(57, 226, 155, 0.2)',
    },
    logo: {
        width: 140,
        height: 140,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
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
    eyeBtn: {
        padding: 8,
    },
    registerBtn: {
        backgroundColor: '#39E29B',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 24,
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    registerBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    dividerText: {
        color: '#666',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 16,
        marginBottom: 32,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#888',
        fontSize: 15,
    },
    loginLinkHighlight: {
        color: '#39E29B',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
