import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import { X, Delete } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function PinPromptModal({ visible, onClose, onSuccess, mode = 'verify', title }) {
    const [pin, setPin] = useState('');
    const [step, setStep] = useState(1); // 1: Enter, 2: Confirm (only for 'set' mode)
    const [firstPin, setFirstPin] = useState('');
    const [error, setError] = useState('');
    const progress = useSharedValue(0);

    useEffect(() => {
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

    useEffect(() => {
        if (visible) {
            resetState();
        }
    }, [visible]);

    const resetState = () => {
        setPin('');
        setStep(1);
        setFirstPin('');
        setError('');
    };

    const handlePress = async (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            if (newPin.length === 4) {
                // Determine action based on mode
                if (mode === 'verify') {
                    verifyPin(newPin);
                } else if (mode === 'set') {
                    handleSetPinStep(newPin);
                }
            }
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
            setError('');
        }
    };

    const verifyPin = async (inputPin) => {
        try {
            const storedPin = await AsyncStorage.getItem('userPin');
            if (storedPin === inputPin) {
                setTimeout(() => {
                    onSuccess();
                    resetState();
                }, 200);
            } else {
                Vibration.vibrate();
                setError('Incorrect PIN. Try again.');
                setPin('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSetPinStep = (inputPin) => {
        if (step === 1) {
            setFirstPin(inputPin);
            setPin('');
            setStep(2);
            setError(''); // Clear any previous errors
        } else {
            if (inputPin === firstPin) {
                savePin(inputPin);
            } else {
                Vibration.vibrate();
                setError('PINs do not match. Try again.');
                setPin('');
                setFirstPin('');
                setStep(1);
            }
        }
    };

    const savePin = async (newPin) => {
        try {
            await AsyncStorage.setItem('userPin', newPin);
            await AsyncStorage.setItem('secureWallet', 'true');
            setTimeout(() => {
                onSuccess();
                resetState();
            }, 200);
        } catch (e) {
            console.error(e);
        }
    };

    const renderDot = (index) => (
        <View style={[styles.dot, pin.length > index && styles.dotActive]} />
    );

    const renderKey = (num) => (
        <TouchableOpacity key={num} style={styles.key} onPress={() => handlePress(num)} activeOpacity={0.7}>
            <Text style={styles.keyText}>{num}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.container, overlayStyle]}>
                <Animated.View style={[styles.content, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        {/* Only show close button if allowed (e.g. not forced verify) */}
                        {onClose && (
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.title}>
                        {mode === 'set'
                            ? (step === 1 ? 'Set a 4-digit PIN' : 'Confirm your PIN')
                            : (title || 'Enter PIN')}
                    </Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3].map((i) => <View key={i}>{renderDot(i)}</View>)}
                    </View>

                    {/* Keypad */}
                    <View style={styles.keypad}>
                        <View style={styles.row}>
                            {[1, 2, 3].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            {[4, 5, 6].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            {[7, 8, 9].map(renderKey)}
                        </View>
                        <View style={styles.row}>
                            <View style={styles.keyEmpty} />
                            {renderKey(0)}
                            <TouchableOpacity style={styles.key} onPress={handleDelete}>
                                <Delete size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    closeBtn: {
        padding: 10,
    },
    title: {
        fontSize: 22,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorText: {
        color: '#FF5252',
        fontSize: 14,
        marginBottom: 10,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#555',
        backgroundColor: 'transparent',
    },
    dotActive: {
        backgroundColor: '#39E29B',
        borderColor: '#39E29B',
    },
    keypad: {
        width: '100%',
        gap: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    key: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyEmpty: {
        width: 70,
        height: 70,
    },
    keyText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '500',
    }
});
