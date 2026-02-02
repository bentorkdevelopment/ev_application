import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Animated, Easing, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Flag, Bell, X, Info } from 'lucide-react-native';

export default function SessionScreen({ navigation, route }) {
    // Session State
    const [percentage, setPercentage] = useState(0);
    const [kwh, setKwh] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
    const [isActive, setIsActive] = useState(true);
    const [isStopping, setIsStopping] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    const [notify, setNotify] = useState(false);

    // Animation Values
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Params (e.g. from ConfigScreen)
    const { planId } = route.params || {};

    // Simulation Logic
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setPercentage(prev => {
                if (prev >= 100) {
                    setIsActive(false);
                    return 100;
                }
                const increment = Math.random() * 0.5 + 0.1; // Random increment
                return Math.min(prev + increment, 100);
            });

            setTimeElapsed(prev => prev + 1);
            setKwh(prev => prev + 0.005); // Rough simulation
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    // Animate the circle stroke
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 500,
            useNativeDriver: true, // true for better performance
            easing: Easing.linear,
        }).start();
    }, [percentage]);

    // Format Time Metrics
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStopPress = () => {
        setShowStopModal(true);
    };

    const confirmStop = () => {
        setIsStopping(true);
        setTimeout(() => {
            setIsStopping(false);
            setShowStopModal(false);
            setIsActive(false);
            Alert.alert("Session Stopped", "Your charging session has been stopped.", [
                { text: "OK", onPress: () => navigation.navigate('Home') } // Or Receipt screen
            ]);
        }, 2000);
    };

    // Circular Progress Props
    const size = 280;
    const strokeWidth = 10; // Thicker for premium look
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Interpolate Dashoffset
    // Interpolate Dashoffset (Unused without SVG)
    // const strokeDashoffset = animatedValue.interpolate({
    //    inputRange: [0, 100],
    //    outputRange: [circumference, 0], 
    // });

    return (
        <View style={styles.container}>
            {/* Background Gradient Simulation using View */}
            <View style={styles.background}>
                {/*  Blobs could go here as absolute positioned Images or SVGs */}
            </View>

            <SafeAreaView style={styles.content} edges={['top', 'bottom']}>

                {/* Header */}
                <View style={styles.header}>
                    {/* Logo/Brand */}
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Main Hero Section: Percentage Circle */}
                <View style={styles.heroSection}>
                    <View style={styles.circleContainer}>
                        {/* Glow Effect Background */}
                        {/* <View style={styles.glow} /> */}

                        {/* Simple Circle View instead of SVG */}
                        <View style={{
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: strokeWidth,
                            borderColor: 'rgba(0, 230, 118, 0.3)',
                            position: 'absolute'
                        }} />

                        {/* Inner Content */}
                        <View style={styles.circleInner}>
                            <Zap size={32} color="#00E676" style={styles.pulseIcon} />
                            <Text style={styles.percentText}>
                                {percentage.toFixed(2)}<Text style={styles.unitText}>%</Text>
                            </Text>
                            <Text style={styles.statusText}>{isActive ? 'CHARGING' : 'COMPLETED'}</Text>
                        </View>
                    </View>
                </View>

                {/* Metrics Cards */}
                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Energy Delivered</Text>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricValue}>{kwh.toFixed(2)}</Text>
                            <Text style={styles.metricUnit}>kWh</Text>
                        </View>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Session Duration</Text>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricValue}>{formatTime(timeElapsed)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notification Toggle */}
                <View style={styles.notifyRow}>
                    <View style={styles.notifyInfo}>
                        <View style={styles.notifyIconBox}>
                            <Bell size={18} color="#fff" />
                        </View>
                        <Text style={styles.notifyText}>Notify when complete</Text>
                    </View>
                    <Switch
                        value={notify}
                        onValueChange={setNotify}
                        trackColor={{ false: "#555", true: "rgba(0, 230, 118, 0.5)" }}
                        thumbColor={notify ? "#00E676" : "#f4f3f4"}
                    />
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Flag color="#aaa" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.stopBtn, (isStopping || !isActive) && styles.disabledBtn]}
                        onPress={handleStopPress}
                        disabled={isStopping || !isActive}
                    >
                        <Text style={styles.stopBtnText}>
                            {isStopping ? "Stopping..." : "Stop Charging"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.stationId}>Station ID: 8839202</Text>

            </SafeAreaView>

            {/* Stop Confirmation Modal */}
            <Modal
                transparent={true}
                visible={showStopModal}
                animationType="fade"
                onRequestClose={() => setShowStopModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Stop Session?</Text>
                            <TouchableOpacity onPress={() => setShowStopModal(false)}>
                                <X color="#ccc" size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>Are you sure you want to stop the charging session?</Text>

                        <View style={styles.modalStats}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Time Elapsed</Text>
                                <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Energy Used</Text>
                                <Text style={styles.statValue}>{kwh.toFixed(2)} kWh</Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStopModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmStop}>
                                <Text style={styles.confirmBtnText}>Stop Charging</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#121212', // Fallback or base
        // Could add gradient image here
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 150,
        height: 80,
        marginTop: 80,
        tintColor: '#fff',
    },

    // Hero
    heroSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    circleContainer: {
        width: 280,
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        shadowColor: '#00E676',
        shadowRadius: 50,
        shadowOpacity: 0.5,
        elevation: 10, // Android glow approximation
    },
    circleInner: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseIcon: {
        marginBottom: 10,
    },
    percentText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    unitText: {
        fontSize: 24,
        color: '#888',
        fontWeight: 'normal',
    },
    statusText: {
        color: '#aaa',
        fontSize: 12,
        letterSpacing: 2,
        marginTop: 5,
        fontWeight: '600',
    },

    // Metrics
    metricsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    metricLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 5,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    metricValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricUnit: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
    },

    // Notify
    notifyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    notifyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notifyIconBox: {
        width: 32,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifyText: {
        color: '#eee',
        fontSize: 14,
        fontWeight: '600',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 10,
    },
    iconBtn: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(40,40,40,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopBtn: {
        flex: 1,
        height: 52,
        backgroundColor: '#FF4213',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF4213',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    stopBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    stationId: {
        textAlign: 'center',
        color: '#444',
        fontSize: 10,
        marginTop: 5,
        fontFamily: 'monospace',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalDesc: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 20,
    },
    modalStats: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        color: '#ccc',
        fontSize: 14,
    },
    statValue: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#888',
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#EF4444',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
