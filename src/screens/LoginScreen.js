import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authService } from '../services/auth';
import { authApi, userApi } from '../services/api';
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react-native';

export default function LoginScreen({ navigation, route }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Clear any stale session data on mount
        const clearSession = async () => {
            await authService.logout();
        };
        clearSession();

        const clientId = GOOGLE_WEB_CLIENT_ID;
        if (!clientId || clientId.length < 10) {
            console.warn("GOOGLE_WEB_CLIENT_ID is missing or invalid in .env");
        }

        GoogleSignin.configure({
            webClientId: clientId,
            offlineAccess: true,
            scopes: ['email', 'profile'],
            forceCodeForRefreshToken: true,
        });
    }, []);

    const handleManualLogin = async () => {
        if (!email || !password) {
            Alert.alert("Missing Fields", "Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            console.log("Attempting manual login for:", email);
            const response = await authApi.login(email, password);

            // Expected response: { token: "JWT...", ... }
            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                Alert.alert("Login Failed", "Invalid response from server.");
            }
        } catch (error) {
            console.error("Manual login error:", error);
            const msg = error.userMessage || (error.response?.data?.message) || "Invalid email or password.";
            Alert.alert("Login Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const userEmail = userInfo?.data?.user?.email || userInfo?.user?.email;

            if (userEmail) {
                handleBackendGoogleLogin(userEmail.trim());
            } else {
                Alert.alert("Login Error", "Could not retrieve email from Google Account.");
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled login");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Login in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert("Error", "Google Play Services not available");
            } else {
                console.error(error);
                Alert.alert("Error", "Google Login failed. Please try again.");
            }
        }
    };

    const handleBackendGoogleLogin = async (email) => {
        setLoading(true);
        try {
            const response = await authApi.googleLoginSuccess(email);
            if (response && response.token) {
                await processLoginSuccess(response);
            } else {
                Alert.alert("Login Failed", "No token received from server.");
            }
        } catch (error) {
            console.error("Backend Google login error:", error);
            Alert.alert("Login Failed", error.userMessage || "Server Error during Google Login");
        } finally {
            setLoading(false);
        }
    };

    const processLoginSuccess = async (response) => {
        // 1. Clear old data
        await authService.logout();

        // 2. Save new Token
        const token = response.token;
        if (!token) {
            Alert.alert("Login Error", "No token received.");
            return;
        }
        await authService.setToken(token);

        // 3. Get User Details if missing (Manual Login)
        let userData = {
            id: response.id || response.userId,
            name: response.name,
            email: response.email,
            imageUrl: response.imageUrl,
            mobile: response.mobile
        };

        // If name is missing, we likely just got a token. Fetch full profile.
        if (!userData.name) {
            try {
                // We rely on the 'email' state variable from the form for manual login
                // OR decode token if possible. For now, use the email state if available.
                const targetEmail = response.email || email; // 'email' from component state

                if (targetEmail) {
                    const userDetails = await userApi.getUserDetails(targetEmail);
                    userData = {
                        id: userDetails.id,
                        name: userDetails.name,
                        email: userDetails.email,
                        imageUrl: userDetails.imageUrl,
                        mobile: userDetails.mobile
                    };
                }
            } catch (err) {
                console.warn("Failed to fetch user details after login:", err);
                // Continue anyway, maybe retrying later or relying on partial data
            }
        }

        await authService.setUser(userData);

        // 4. FCM Token Sync (Send to Backend)
        try {
            const { getFCMToken } = require('../services/fcmService');
            getFCMToken(); // Run in background
        } catch (fcmErr) {
            console.warn("FCM sync error after login:", fcmErr);
        }

        // 5. Navigation
        const { postLoginTarget, postLoginParams } = route.params || {};

        // Check if Terms & Conditions have been accepted on this device
        const tcAccepted = await authService.hasAcceptedTerms();

        if (postLoginTarget) {
            if (!tcAccepted) {
                // Show T&C first, then go to the intended target
                navigation.reset({
                    index: 0,
                    routes: [{
                        name: 'TermsConsent',
                        params: { nextScreen: postLoginTarget, nextParams: postLoginParams }
                    }],
                });
            } else {
                navigation.replace(postLoginTarget, postLoginParams);
            }
        } else if (!tcAccepted) {
            // First-time user or device — show T&C before Home
            navigation.reset({
                index: 0,
                routes: [{ name: 'TermsConsent', params: { nextScreen: 'Home' } }],
            });
        } else {
            setTimeout(() => {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                });
            }, 100);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue charging</Text>

                {/* Manual Login Form */}
                <View style={styles.formContainer}>
                    {/* Email Input */}
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
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
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <EyeOff size={20} color="#888" />
                            ) : (
                                <Eye size={20} color="#888" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPassBtn}
                        onPress={() => navigation.navigate('ResetPassword')}
                    >
                        <Text style={styles.forgotPassText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.disabledBtn]}
                        onPress={handleManualLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.loginBtnText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Secondary Options */}
                <View style={styles.secondaryContainer}>
                    {/* Google Login */}
                    <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading}>
                        <Image
                            source={require('../assets/images/google_ic.webp')}
                            style={styles.googleIcon}
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Phone Login */}
                    {/* Phone Login - Disabled
                    <TouchableOpacity
                        style={styles.phoneButton}
                        onPress={() => navigation.navigate('MobileLogin')}
                        disabled={loading}
                    >
                        <Smartphone size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.phoneButtonText}>Login with Phone Number</Text>
                    </TouchableOpacity>
                    */}
                </View>

                {/* Register Link */}
                <View style={styles.footerLinkContainer}>
                    <Text style={styles.footerLinkText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.footerLinkHighlight}>Register</Text>
                    </TouchableOpacity>
                </View>

                {/* Extra padding for scroll */}
                <View style={{ height: 40 }} />
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    logo: {
        width: 160,
        height: 60,
        marginBottom: 30,
        tintColor: '#fff',
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 32,
    },
    formContainer: {
        width: '100%',
        marginBottom: 20,
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
    forgotPassBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPassText: {
        color: '#39E29B',
        fontSize: 14,
        fontWeight: '600',
    },
    loginBtn: {
        backgroundColor: '#39E29B',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Divider
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 24,
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
        fontWeight: '600',
    },

    // Secondary Buttons
    secondaryContainer: {
        width: '100%',
        gap: 16,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 16,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: 'bold',
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#555',
    },
    phoneButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },

    // Footer
    footerLinkContainer: {
        flexDirection: 'row',
        marginTop: 40,
        alignItems: 'center',
    },
    footerLinkText: {
        color: '#888',
        fontSize: 15,
    },
    footerLinkHighlight: {
        color: '#39E29B',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
