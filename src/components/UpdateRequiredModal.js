// src/components/UpdateRequiredModal.js
// Non-dismissable update required dialog shown on the Splash Screen.
// Opens the Play Store listing when the user taps "Update Now".

import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Linking,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../styles/GlobalStyles';

/**
 * UpdateRequiredModal
 *
 * Props:
 *   visible  {boolean}   – controls visibility
 *   onUpdate {function}  – called when user taps "Update Now"
 */
export default function UpdateRequiredModal({ visible, onUpdate }) {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 60,
                    friction: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const handleUpdate = async () => {
        try {
            const playStoreUrl =
                Platform.OS === 'android'
                    ? 'market://details?id=com.bentork.application'
                    : 'https://play.google.com/store/apps/details?id=com.bentork.application';

            const canOpen = await Linking.canOpenURL(playStoreUrl);
            if (canOpen) {
                await Linking.openURL(playStoreUrl);
            } else {
                await Linking.openURL(
                    'https://play.google.com/store/apps/details?id=com.bentork.application'
                );
            }
        } catch (e) {
            console.warn('Could not open Play Store:', e);
        }
        onUpdate?.();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => { /* Intentionally blocked – non-dismissable */ }}
        >
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    <Text style={styles.title}>Update Required</Text>

                    <Text style={styles.body}>
                        A new version of the app is available. Please update to continue using the services.
                    </Text>

                    <TouchableOpacity
                        onPress={handleUpdate}
                        activeOpacity={0.8}
                        style={styles.updateBtn}
                    >
                        <LinearGradient
                            colors={Colors.primaryGradient}
                            locations={[1, 1]}
                            start={{ x: 0.7, y: 0.9 }}
                            end={{ x: 1, y: 0.9 }}
                            style={styles.gradient}
                        >
                            <Text style={styles.updateBtnText}>Update Now</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    card: {
        width: '100%',
        backgroundColor: '#1C1C1E',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },

    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },

    body: {
        fontSize: 15,
        color: '#A0A0A0',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },

    updateBtn: {
        width: '100%',
        height: 50,
        borderRadius: 28,
        overflow: 'hidden',
    },

    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    updateBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
});

