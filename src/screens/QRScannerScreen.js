/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PermissionsAndroid,
    Platform,
    Alert,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    AppState
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7; // Square size, 1:1 ratio
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';

const QRScannerScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [hasPermission, setHasPermission] = useState(false);
    const [scanned, setScanned] = useState(false);

    // Data passed from Home
    const stations = route.params?.stations || [];
    const allChargers = route.params?.allChargers || [];

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        checkPermission();
        const subscription = AppState.addEventListener("change", nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === "active") {
                checkPermission();
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, []);

    const checkPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
                if (granted) {
                    setHasPermission(true);
                } else {
                    requestPermission();
                }
            } catch (err) {
                console.warn(err);
            }
        } else {
            setHasPermission(true);
        }
    };

    const requestPermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: 'Camera Permission',
                    message: 'App needs access to your camera to scan QR codes for charging.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                setHasPermission(true);
            } else {
                setHasPermission(false);
            }
        } catch (err) {
            console.warn(err);
        }
    }

    const processQRCode = (code) => {
        console.log("Processing QR:", code);

        // Expected format: http://web.bentork.in/splash/OCPPCHG-1123-0116
        // Extract ID: OCPPCHG-1123-0116

        let chargerId = null;

        if (code.includes('splash/')) {
            const parts = code.split('splash/');
            if (parts.length > 1) {
                chargerId = parts[1].trim();
            }
        } else {
            // Fallback: assume code IS the ID if it looks like one
            chargerId = code;
        }

        console.log("Extracted ID:", chargerId);

        if (chargerId && allChargers.length > 0) {
            // Find charger in the provided list
            // Check against ocppId, id, boxId...
            const charger = allChargers.find(c =>
                (c.ocppId && c.ocppId === chargerId) ||
                (c.id && String(c.id) === chargerId) ||
                (c.charger_id && c.charger_id === chargerId)
            );

            if (charger) {
                console.log("Scanner Found Charger:", charger.id);
                // Find Station
                const station = stations.find(s => s.id === charger.stationId);

                if (station) {
                    // Direct redirect without confirmation
                    navigation.navigate('Home', {
                        foundStationId: station.id,
                        foundChargerId: charger.id
                    });
                    return;
                }
            }
        }

        // If not found or logic failed
        Alert.alert("Invalid QR", `Code: ${code}\nCould not find a matching charger.`, [
            { text: "Retry", onPress: () => setScanned(false) }
        ]);
    };

    const onReadCode = (event) => {
        if (scanned) return;
        const code = event.nativeEvent.codeStringValue || event.nativeEvent.code;
        if (!code) return;

        setScanned(true);
        processQRCode(code);
    };

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#121212" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scan QR</Text>
                </View>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>Camera access is required to scan QR codes</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.button}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="black" translucent />

            <Camera
                style={styles.camera}
                scanBarcode={true}
                onReadCode={onReadCode}
                showFrame={false} // Custom Frame
                laserColor='transparent' // Hide default laser
                frameColor='transparent' // Hide default frame
            />

            {/* Dark Overlay to create 1:1 Scan Box */}
            <View style={styles.overlayContainer}>
                <View style={styles.overlayTop} />
                <View style={styles.overlayCenterRow}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanWindow}>
                        {/* Corner Markers */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                    <Text style={styles.instructionText}>Scan the QR code available on Station</Text>
                </View>
            </View>

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color="white" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan QR</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    header: {
        marginTop: Platform.OS === 'android' ? 40 : 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'android' ? 40 : 60,
        paddingHorizontal: 20,
        height: 100, // Includes status bar area
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    backButton: {
        marginRight: 15,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#121212'
    },
    permissionText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        opacity: 0.8
    },
    button: {
        backgroundColor: '#00E676',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        elevation: 5
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // Overlay Styles for 1:1 Aspect Ratio
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
    },
    overlayCenterRow: {
        height: SCAN_AREA_SIZE,
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
    },
    scanWindow: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        backgroundColor: 'transparent',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
        alignItems: 'center',
        paddingTop: 40,
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.9,
    },

    // Corners
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#00E676',
        borderWidth: 4,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderRadius: 4,
        borderTopLeftRadius: 16
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderRadius: 4,
        borderTopRightRadius: 16
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderRadius: 4,
        borderBottomLeftRadius: 16
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderRadius: 4,
        borderBottomRightRadius: 16
    },
});

export default QRScannerScreen;
