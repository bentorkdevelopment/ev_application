import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { authService } from '../services/auth';
import { authApi } from '../services/api';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

export default function LoginScreen({ navigation }) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Clear any stale session data on mount to ensure a fresh login attempt
        const clearSession = async () => {
            console.log("Clearing old session data...");
            await authService.logout();
        };
        clearSession();

        const clientId = GOOGLE_WEB_CLIENT_ID;
        console.log("Configuring Google Sign-In...");
        if (!clientId || clientId.length < 10) {
            console.error("CRITICAL: GOOGLE_WEB_CLIENT_ID is missing or invalid in .env!");
            Alert.alert("Configuration Error", "Google Client ID is missing. Please restart the app with a valid environment.");
        } else {
            console.log("Using Web Client ID:", clientId.substring(0, 15) + "...");
        }

        GoogleSignin.configure({
            webClientId: clientId,
            offlineAccess: true,
            scopes: ['email', 'profile'],
            forceCodeForRefreshToken: true, // often helps with token issues
        });
    }, []);

    const signIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            // Handle the successful login
            const userEmail = userInfo?.data?.user?.email || userInfo?.user?.email;

            if (userEmail) {
                handleBackendLogin(userEmail.trim());
            } else {
                Alert.alert("Login Error", "Could not retrieve email from Google Account.");
            }

        } catch (error) {
            // ... (keep existing error handling)
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled login");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Login in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert("Error", "Google Play Services not available");
            } else {
                console.error(error);
                Alert.alert("Error", "Login failed. Please try again.");
            }
        }
    };

    const handleBackendLogin = async (email) => {
        console.log("Backend login initiated for:", email);
        setLoading(true);
        try {
            // Call backend to validate/get token
            console.log("Sending request to:", authApi.googleLoginSuccess);
            const response = await authApi.googleLoginSuccess(email);
            console.log("Backend response:", response);

            // Response structure from backend: { token, name, email, imageUrl } based on valid endpoint read
            if (response && response.token) {
                // 1. Clear any potential residual data first
                await authService.logout();

                // 2. Set new Token and User
                await authService.setToken(response.token);
                await authService.setUser({
                    name: response.name,
                    email: response.email,
                    imageUrl: response.imageUrl
                });

                // 3. Verify token is saved
                const savedToken = await authService.getToken();
                console.log("Token saved verification:", savedToken ? "Success" : "Failed");

                if (!savedToken) {
                    Alert.alert("Login Error", "Failed to save session. Please try again.");
                    return;
                }

                // 4. Reset navigation stack to Home
                // Using a small timeout to ensure AsyncStorage has settled (optional but safe)
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }, 100);
            } else {
                console.warn("No token in response");
                Alert.alert("Login Failed", "No token received from server.");
            }
        } catch (error) {
            console.error("Backend login error:", error);
            if (error.code === 'ECONNABORTED') {
                Alert.alert("Login Failed", "Request timed out. Please check your internet connection.");
            } else if (error.response) {
                Alert.alert("Login Failed", `Server Error: ${error.response.status}`);
            } else if (error.request) {
                Alert.alert("Login Failed", "No response from server.");
            } else {
                Alert.alert("Login Failed", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        console.log("Testing connection...");
        try {
            // Try fetching something public like plans (from demo)
            await authApi.googleLoginSuccess('test_ping@gmail.com');
        } catch (e) {
            console.log("Test Connection Error:", e);
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/images/logo_inverted.png')} // Reusing the logo
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <TouchableOpacity onPress={testConnection} style={{ padding: 10, marginBottom: 20 }}>
                <Text style={{ color: '#555' }}>Tap to Test Connection (Check Logs)</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            {loading ? (
                <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
                <TouchableOpacity style={styles.googleButton} onPress={signIn}>
                    {/* Google Icon/Text */}
                    <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png' }}
                        style={styles.googleIcon}
                    />
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logo: {
        width: 150,
        height: 80,
        marginBottom: 40,
        tintColor: '#fff'
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 50,
    },
    spacer: {
        height: 20,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 30,
        elevation: 5,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    googleButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: 'bold',
    },
});
