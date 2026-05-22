import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

/**
 * TestScreen - Cleaned version for Animation Testing
 * Focused on Shared Element Transitions (Manual)
 */
export default function TestScreen({ navigation, route }) {
    const { isSharedDemo, sourceLayout } = route.params || {};

    // Manual Shared Transition Logic
    const animProgress = React.useRef(new Animated.Value(0)).current;
    const targetRef = useRef(null);
    const [targetLayout, setTargetLayout] = useState(null);

    useEffect(() => {
        if (isSharedDemo && sourceLayout) {
            animProgress.setValue(0);
        }
    }, [isSharedDemo, sourceLayout]);

    const flyingSquareStyle = (!sourceLayout || !targetLayout) ? { opacity: 0 } : {
        position: 'absolute',
        top: 0,
        left: 0,
        width: sourceLayout.width,
        height: sourceLayout.height,
        borderRadius: 12,
        backgroundColor: '#39E29B',
        zIndex: 9999,
        transform: [
            { translateX: sourceLayout.x },
            { translateY: sourceLayout.y },
            {
                translateX: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetLayout.x - sourceLayout.x + (targetLayout.width - sourceLayout.width) / 2]
                })
            },
            {
                translateY: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetLayout.y - sourceLayout.y + (targetLayout.height - sourceLayout.height) / 2]
                })
            },
            {
                scaleX: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, targetLayout.width / sourceLayout.width]
                })
            },
            {
                scaleY: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, targetLayout.height / sourceLayout.height]
                })
            },
            {
                scale: animProgress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.1, 1]
                })
            }
        ],
        shadowColor: '#39E29B',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    };

    const contentStyle = {
        opacity: animProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
        transform: [{
            translateY: animProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
        }]
    };

    const handleTargetLayout = () => {
        if (targetLayout) return; // Only measure once

        if (targetRef.current) {
            targetRef.current.measureInWindow((x, y, width, height) => {
                if (width > 0) {
                    setTargetLayout({ x, y, width, height });
                    // Use native driver for 60fps UI thread animations
                    Animated.spring(animProgress, {
                        toValue: 1,
                        friction: 9,
                        tension: 40,
                        useNativeDriver: true
                    }).start();
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Animation Lab</Text>
            </View>

            <Animated.View style={[styles.content, contentStyle]}>
                {/* Shared Transition Demo Area */}
                {isSharedDemo && (
                    <View style={styles.sharedDemoHeader}>
                        <View
                            ref={targetRef}
                            onLayout={handleTargetLayout}
                            style={[styles.demoSquareLarge, { backgroundColor: 'transparent' }]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.demoTitle}>Transition Success!</Text>
                            <Text style={styles.demoSubtitle}>Flying from Developer Screen...</Text>
                        </View>
                    </View>
                )}

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Observe how the square expansion is perfectly timed with the screen fade-in.
                        This uses Reanimated 3 with absolute screen coordinates.
                    </Text>
                </View>
            </Animated.View>

            {/* The Flying Square Overlay - Always on top */}
            <Animated.View style={flyingSquareStyle} pointerEvents="none" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#270000ff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sharedDemoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(57, 226, 155, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(57, 226, 155, 0.1)',
        marginBottom: 20,
    },
    demoSquareLarge: {
        width: 80,
        height: 80,
        borderRadius: 20,
        marginRight: 20,
    },
    demoTitle: {
        color: '#39E29B',
        fontSize: 20,
        fontWeight: 'bold',
    },
    demoSubtitle: {
        color: '#888',
        fontSize: 13,
        marginTop: 4,
    },
    infoCard: {
        backgroundColor: '#252525',
        padding: 20,
        borderRadius: 16,
        marginTop: 20,
    },
    infoText: {
        color: '#ccc',
        fontSize: 15,
        lineHeight: 22,
    },
});
