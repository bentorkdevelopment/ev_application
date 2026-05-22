import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
    const progress = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const overlayStyle = {
        opacity: progress,
    };

    const cardStyle = {
        opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                }),
            },
        ],
    };

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
