import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import { Colors, Fonts } from '../styles/GlobalStyles';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.alertContainer, cardStyle]}>
                    {title && <Text style={styles.title}>{title}</Text>}
                    {message && <Text style={styles.message}>{message}</Text>}

                    <View style={styles.buttonContainer}>
                        {buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        btn.style === 'cancel' && styles.cancelButton,
                                        btn.style === 'destructive' && styles.destructiveButton,
                                        // If frequent buttons, might want column layout, but row is standard for 2
                                    ]}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        onClose(); // Auto close on press usually desirable
                                    }}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        btn.style === 'cancel' && styles.cancelText,
                                        btn.style === 'destructive' && styles.destructiveText,
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity style={styles.button} onPress={onClose}>
                                <Text style={styles.buttonText}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: Colors.cardBg, // Matte theme card
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.glassBorderDark,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: Fonts.primary,
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: 10,
        textAlign: 'left',
    },
    message: {
        fontSize: 16,
        fontFamily: Fonts.primary,
        color: '#ccc',
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        flexWrap: 'wrap',
    },
    button: {
        backgroundColor: Colors.primaryContainer,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
        flex: 1,
    },
    buttonText: {
        color: Colors.onPrimaryContainer,
        fontWeight: 'bold',
        fontSize: 13,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#555',
    },
    cancelText: {
        color: '#fff',
    },
    destructiveButton: {
        backgroundColor: '#FF453A', // Standard Red
    },
    destructiveText: {
        color: '#fff',
    },
});

export default CustomAlert;
