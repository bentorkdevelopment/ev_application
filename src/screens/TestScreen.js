import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated3, { useSharedValue, useAnimatedStyle, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';

/**
 * TestScreen - Cleaned version for Animation Testing
 * Focused on Shared Element Transitions (Manual)
 */
export default function TestScreen({ navigation, route }) {
    const { isSharedDemo, sourceLayout } = route.params || {};

    // Manual Shared Transition Logic
    const animProgress = useSharedValue(0);
    const targetRef = useRef(null);
    const [targetLayout, setTargetLayout] = useState(null);

    useEffect(() => {
        if (isSharedDemo && sourceLayout) {
            animProgress.value = 0;
            // The withSpring will start once we have the target layout via onLayout
        }
    }, [isSharedDemo, sourceLayout]);

    const flyingSquareStyle = useAnimatedStyle(() => {
        if (!sourceLayout || !targetLayout) {
            return { opacity: 0 };
        }

        // We use animProgress.value (0 to 1) to interpolate everything
        const top = interpolate(animProgress.value, [0, 1], [sourceLayout.y, targetLayout.y]);
        const left = interpolate(animProgress.value, [0, 1], [sourceLayout.x, targetLayout.x]);
        const width = interpolate(animProgress.value, [0, 1], [sourceLayout.width, targetLayout.width]);
        const height = interpolate(animProgress.value, [0, 1], [sourceLayout.height, targetLayout.height]);
        const borderRadius = interpolate(animProgress.value, [0, 1], [12, 20]);
        const scale = interpolate(animProgress.value, [0, 0.5, 1], [1, 1.2, 1]); // Pop effect

        return {
            position: 'absolute',
            top,
            left,
            width,
            height,
            borderRadius,
            backgroundColor: '#39E29B',
            zIndex: 9999,
            transform: [{ scale }],
            shadowColor: '#39E29B',
            shadowOffset: { width: 0, height: 15 * animProgress.value },
            shadowOpacity: 0.5 * animProgress.value,
            shadowRadius: 20 * animProgress.value,
            elevation: 10 * animProgress.value,
        };
    });

    const contentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animProgress.value, [0, 0.5, 1], [0, 0, 1]),
        transform: [{ translateY: interpolate(animProgress.value, [0, 1], [20, 0]) }]
    }));

    const handleTargetLayout = () => {
        if (targetLayout) return; // Only measure once
        
        if (targetRef.current) {
            targetRef.current.measureInWindow((x, y, width, height) => {
                if (width > 0) {
                    setTargetLayout({ x, y, width, height });
                    animProgress.value = withSpring(1, { damping: 70, stiffness: 700 });
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

            <Animated3.View style={[styles.content, contentStyle]}>
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
            </Animated3.View>

            {/* The Flying Square Overlay - Always on top */}
            <Animated3.View style={flyingSquareStyle} pointerEvents="none" />
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
