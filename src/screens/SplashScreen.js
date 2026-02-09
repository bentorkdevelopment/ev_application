import React, { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Dimensions, Animated, Easing, StatusBar, Platform, Linking } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import { authService } from '../services/auth';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const { width, height } = Dimensions.get('window')

// Use a fixed size for the blob container relative to screen
const BLOB_SIZE = height * 1.0

// SVG Paths from Web Version
const PATH_DARK = "M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.3C59.6,43.1,48.3,51.8,36.5,58.8C24.7,65.8,12.4,71.1,-0.6,72.1C-13.6,73.1,-27.2,69.8,-39.6,62.8C-52,55.8,-63.2,45.1,-71.3,32.2C-79.4,19.3,-84.4,4.2,-81.8,-9.4C-79.2,-23,-69,-35.1,-57.4,-43.8C-45.8,-52.5,-32.8,-57.8,-19.9,-65.4C-7,-73,8.9,-82.9,25.4,-84.2C41.9,-85.5,59,-78.2,44.7,-76.4Z"
const PATH_GREEN = "M41.3,-72.6C53.4,-65.3,63.2,-54.6,70.4,-42.1C77.6,-29.6,82.2,-15.3,81.3,-1.4C80.4,12.5,74,26,64.8,37.3C55.6,48.6,43.6,57.7,30.8,63.2C18,68.7,4.4,70.6,-8.3,69.7C-21,68.8,-32.8,65.1,-43.2,58.3C-53.6,51.5,-62.6,41.6,-68.9,30.1C-75.2,18.6,-78.8,5.5,-75.9,-6.2C-73,-17.9,-63.6,-28.2,-53.4,-36.5C-43.2,-44.8,-32.2,-51.1,-20.9,-58.5C-9.6,-65.9,2,-74.4,14.5,-76.6C27,-78.8,40.4,-74.7,41.3,-72.6Z"
const PATH_LIGHT = "M35.6,-62.3C46.5,-55.8,55.9,-47.5,63.1,-37.2C70.3,-26.9,75.3,-14.6,74.7,-2.6C74.1,9.4,67.9,21.1,60.1,31.8C52.3,42.5,42.9,52.2,31.7,58.5C20.5,64.8,7.5,67.7,-4.8,67.3C-17.1,66.9,-32.7,63.2,-45.3,55.8C-57.9,48.4,-67.5,37.3,-72.8,24.6C-78.1,11.9,-79.1,-2.4,-75.3,-15.8C-71.5,-29.2,-62.9,-41.7,-51.5,-49.6C-40.1,-57.5,-25.9,-60.8,-11.8,-62.8C2.3,-64.8,16.4,-65.5,29.3,-62.9C42.2,-60.3,54,-54.4,35.6,-62.3Z"


// Separate component for each Blob Layer to optimize rendering
// We rotate the wrapping VIEW, not the SVG path, for native-driver performance.
const BlobLayer = ({ path, color, direction = 1, scaleRange = [1, 1.2], opacity = 0.6, duration }) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start()
    }, [])

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${360 * direction}deg`]
    })

    const scale = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [scaleRange[0], scaleRange[1], scaleRange[0]]
    })

    return (
        <Animated.View style={[
            StyleSheet.absoluteFill,
            {
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate }, { scale }],
                opacity: opacity
            }
        ]}>
            <Svg height="150%" width="150%" viewBox="0 0 200 200">
                <G transform="translate(100, 100)">
                    {/* Faux-Blur using Strokes: 
                        Layer 1: Wide, very transparent stroke (Outer Glow)
                        Layer 2: Medium, transparent stroke (Mid Glow)
                        Layer 3: Solid Fill (Core)
                    */}
                    <Path
                        d={path}
                        stroke={color}
                        strokeWidth="40"
                        strokeOpacity="0.1"
                        fill="none"
                    />
                    <Path
                        d={path}
                        stroke={color}
                        strokeWidth="20"
                        strokeOpacity="0.2"
                        fill="none"
                    />
                    <Path
                        d={path}
                        fill={color}
                    />
                </G>
            </Svg>

        </Animated.View>
    )
}

const EclipseLayer = ({ source, direction = 1, scaleRange = [1, 1.2], opacity = 1, duration, size = '150%', style }) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start()
    }, [])

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${360 * direction}deg`]
    })

    const scale = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [scaleRange[0], scaleRange[1], scaleRange[0]]
    })

    return (
        <Animated.View style={[
            StyleSheet.absoluteFill,
            style,
            {
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate }, { scale }],
                opacity: opacity
            }
        ]}>
            <Image
                source={source}
                style={{ width: size, height: size }}
                resizeMode="contain"
            />
        </Animated.View>
    )
}

export default function SplashScreen({ navigation, route } = {}) {
    // Animation Values
    const riseAnim = useRef(new Animated.Value(0)).current // Entrance opacity/rise

    useEffect(() => {
        // Entrance
        Animated.timing(riseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            useNativeDriver: true
        }).start()

        const checkAuth = async () => {
            // Start the minimum splash timer
            const minSplashTime = new Promise(resolve => setTimeout(resolve, 2000));

            // Failsafe: Force navigation after 8 seconds if nothing else happens
            const safetyTimeout = setTimeout(() => {
                console.warn("Splash Screen Timeout - Forcing Navigation");
                handleNavigation();
            }, 8000);

            const handleNavigation = async () => {
                try {
                    clearTimeout(safetyTimeout); // Clear the failsafe if we get here normally

                    if (!navigation) {
                        console.error("Navigation prop is missing in SplashScreen");
                        return;
                    }

                    const token = await authService.getToken();

                    // Check for Deep Link from Route Params (React Navigation)
                    // Configured in AppNavigator linking: splash/:chargerId
                    let deepLinkChargerId = route.params?.chargerId;

                    // Fallback: Check getInitialURL (mostly for Cold Starts if linking prop didn't catch it yet, or legacy support)
                    if (!deepLinkChargerId) {
                        try {
                            const initialUrl = await Linking.getInitialURL();
                            if (initialUrl) {
                                const parts = initialUrl.split('/splash/');
                                if (parts.length > 1) {
                                    let id = parts[1];
                                    id = id.split('?')[0].split('#')[0];
                                    if (id.endsWith('/')) id = id.slice(0, -1);
                                    if (id) deepLinkChargerId = id;
                                }
                            }
                        } catch (linkError) {
                            console.warn("Deep link check failed:", linkError);
                        }
                    }

                    if (deepLinkChargerId) {
                        const configParams = {
                            chargerId: deepLinkChargerId,
                            boxId: deepLinkChargerId,
                            stationName: 'Bentork Charger',
                            status: 'Available'
                        };

                        if (token) {
                            navigation.replace('Config', configParams);
                        } else {
                            navigation.replace('Login', {
                                postLoginTarget: 'Config',
                                postLoginParams: configParams
                            });
                        }
                    } else if (token) {
                        navigation.replace('Home');
                    } else {
                        navigation.replace('Login');
                    }
                } catch (navError) {
                    console.error("Navigation logic failed:", navError);
                    // Last resort fallback
                    if (navigation) navigation.replace('Login');
                }
            };

            // Check for In-App Updates (Android only for Immediate)
            if (Platform.OS === 'android') {
                try {
                    const inAppUpdates = new SpInAppUpdates(false); // isDebug=false
                    // Add a timeout to the update check so it doesn't freeze the app
                    const updateCheckPromise = inAppUpdates.checkNeedsUpdate();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Update check timeout')), 3000));

                    const result = await Promise.race([updateCheckPromise, timeoutPromise]);

                    if (result.shouldUpdate) {
                        await inAppUpdates.startUpdate({
                            updateType: IAUUpdateKind.IMMEDIATE,
                        });
                        return; // Stop here if updating
                    }
                } catch (error) {
                    console.log('In-App Update check failed or timed out:', error);
                    // Proceed even if update check fails
                }
            }

            // Ensure we wait for the minimum splash time
            await minSplashTime;

            // Proceed to navigation
            await handleNavigation();
        };

        checkAuth();

    }, [navigation, route.params])

    // Entrance Transforms
    const containerTranslateY = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.2, 0] })
    const containerScale = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
    const containerOpacity = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#212121" barStyle="light-content" />
            <Animated.View style={[
                styles.blobContainer,
                {
                    opacity: containerOpacity,
                    transform: [
                        { translateY: containerTranslateY },
                        { scale: containerScale }
                    ]
                }
            ]}>
                {/* Replaced BlobLayers with EclipseLayers */}

                {/* Darker Image (Back) - Positioned Top */}
                <EclipseLayer
                    source={require('../assets/images/ecllipse_3.png')}
                    duration={25000}
                    direction={1}
                    opacity={0.8}
                    scaleRange={[0.9, 1.0]}
                    style={{ top: -80, bottom: 80 }}
                />

                {/* Middle Image - Centered */}
                <EclipseLayer
                    source={require('../assets/images/ecllipse_2.png')}
                    duration={20000}
                    direction={-1}
                    opacity={0.8}
                    scaleRange={[1.0, 1.1]}
                />

                {/* Lighter Image (Front) - Positioned Bottom */}
                <EclipseLayer
                    source={require('../assets/images/ecllipse_1.png')}
                    duration={15000}
                    direction={1}
                    opacity={0.9}
                    scaleRange={[1.1, 1.2]}
                    style={{ top: 320, bottom: -120 }}
                />

            </Animated.View>

            <View style={styles.contentContainer}>
                <Image
                    source={require('../assets/images/logo_inverted.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111', // Dark background
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    contentContainer: {
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    logo: {
        width: 200,
        height: 200
    },
    blobContainer: {
        position: 'absolute',
        // Center on screen
        top: (height - BLOB_SIZE) / 2 + 300,
        left: (width - BLOB_SIZE) / 2 + 200,
        width: BLOB_SIZE,
        height: BLOB_SIZE,
        zIndex: 1,
    }
})
