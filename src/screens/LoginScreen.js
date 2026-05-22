import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authService } from '../services/auth';
import { authApi, userApi } from '../services/api';
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';

export default function LoginScreen({ navigation, route }) {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Note: Do NOT call authService.logout() here.
        // It destroys valid sessions when LoginScreen re-mounts (e.g. back navigation).
        // Session clearing is handled inside processLoginSuccess() before saving new data.

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
            showAlert("Missing Fields", "Please enter both email and password.");
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
                showAlert("Login Failed", "Invalid response from server.");
            }
        } catch (error) {
            console.error("Manual login error:", error);
            const msg = error.userMessage || (error.response?.data?.message) || "Invalid email or password.";
            showAlert("Login Failed", msg);
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
                showAlert("Login Error", "Could not retrieve email from Google Account.");
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled login");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Login in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                showAlert("Error", "Google Play Services not available");
            } else {
                console.error(error);
                showAlert("Error", "Google Login failed. Please try again.");
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
                showAlert("Login Failed", "No token received from server.");
            }
        } catch (error) {
            console.error("Backend Google login error:", error);
            showAlert("Login Failed", error.userMessage || "Server Error during Google Login");
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
            showAlert("Login Error", "No token received.");
            return;
        }
        await authService.setToken(token);

        // 3. Build user data from ALL available sources

        // Source A: Direct fields from login response
        let userData = {
            id: response.id || response.userId,
            name: response.name,
            email: response.email || email, // Always fallback to form input email
            imageUrl: response.imageUrl,
            mobile: response.mobile
        };

        // Source B: Decode JWT token for additional user info
        // This is reliable (no API call) and works even if getUserDetails fails.
        try {
            const decoded = jwtDecode(token);
            if (decoded) {
                userData.id = userData.id || decoded.id || decoded.userId || decoded.sub;
                userData.name = userData.name || decoded.name || decoded.fullName;
                userData.email = userData.email || decoded.email || decoded.sub;
            }
            console.log("JWT decoded claims:", JSON.stringify(decoded));
        } catch (decodeErr) {
            console.warn("JWT decode failed (non-critical):", decodeErr?.message);
        }

        // Ensure email is never empty (absolute fallback to form input)
        if (!userData.email) {
            userData.email = email;
        }

        // Save immediately so downstream screens have data even if getUserDetails fails
        await authService.setUser(userData);
        console.log("User data saved (initial):", JSON.stringify(userData));

        // Source C: Fetch full profile from backend to enhance data (non-critical)
        // This runs AFTER saving initial data, so login is not blocked if it fails.
        if (!userData.name || !userData.id) {
            const targetEmail = userData.email;
            if (targetEmail) {
                try {
                    const userDetails = await userApi.getUserDetails(targetEmail);
                    if (userDetails) {
                        userData = {
                            id: userDetails.id || userData.id,
                            name: userDetails.name || userData.name,
                            email: userDetails.email || userData.email,
                            imageUrl: userDetails.imageUrl || userData.imageUrl,
                            mobile: userDetails.mobile || userData.mobile
                        };
                        await authService.setUser(userData);
                        console.log("User data enhanced:", JSON.stringify(userData));
                    }
                } catch (err) {
                    console.warn("Failed to fetch user details after login:", err?.message);
                    // GUARD: If getUserDetails returned 401, the auth_session_expired handler
                    // may have wiped our token. Re-save it to undo the damage.
                    await authService.setToken(token);
                }
            }
        }

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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
