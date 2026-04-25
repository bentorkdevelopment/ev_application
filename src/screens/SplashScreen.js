import React, { useEffect, useRef, useState } from 'react'
import { View, Image, StyleSheet, Dimensions, Animated, Easing, StatusBar, Platform, Linking } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import { authService } from '../services/auth';
import { NotificationService } from '../services/NotificationService';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import { BlurView } from '@react-native-community/blur';
import UpdateRequiredModal from '../components/UpdateRequiredModal';

const { width, height } = Dimensions.get('window')

// Use a fixed size for the blob container relative to screen
const BLOB_SIZE = height * 1.0

// SVG Paths from Web Version
const PATH_DARK = "M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.3C59.6,43.1,48.3,51.8,36.5,58.8C24.7,65.8,12.4,71.1,-0.6,72.1C-13.6,73.1,-27.2,69.8,-39.6,62.8C-52,55.8,-63.2,45.1,-71.3,32.2C-79.4,19.3,-84.4,4.2,-81.8,-9.4C-79.2,-23,-69,-35.1,-57.4,-43.8C-45.8,-52.5,-32.8,-57.8,-19.9,-65.4C-7,-73,8.9,-82.9,25.4,-84.2C41.9,-85.5,59,-78.2,44.7,-76.4Z"
const PATH_GREEN = "M41.3,-72.6C53.4,-65.3,63.2,-54.6,70.4,-42.1C77.6,-29.6,82.2,-15.3,81.3,-1.4C80.4,12.5,74,26,64.8,37.3C55.6,48.6,43.6,57.7,30.8,63.2C18,68.7,4.4,70.6,-8.3,69.7C-21,68.8,-32.8,65.1,-43.2,58.3C-53.6,51.5,-62.6,41.6,-68.9,30.1C-75.2,18.6,-78.8,5.5,-75.9,-6.2C-73,-17.9,-63.6,-28.2,-53.4,-36.5C-43.2,-44.8,-32.2,-51.1,-20.9,-58.5C-9.6,-65.9,2,-74.4,14.5,-76.6C27,-78.8,40.4,-74.7,41.3,-72.6Z"
const PATH_LIGHT = "M35.6,-62.3C46.5,-55.8,55.9,-47.5,63.1,-37.2C70.3,-26.9,75.3,-14.6,74.7,-2.6C74.1,9.4,67.9,21.1,60.1,31.8C52.3,42.5,42.9,52.2,31.7,58.5C20.5,64.8,7.5,67.7,-4.8,67.3C-17.1,66.9,-32.7,63.2,-45.3,55.8C-57.9,48.4,-67.5,37.3,-72.8,24.6C-78.1,11.9,-79.1,-2.4,-75.3,-15.8C-71.5,-29.2,-62.9,-41.7,-51.5,-49.6C-40.1,-57.5,-25.9,-60.8,-11.8,-62.8C2.3,-64.8,16.4,-65.5,29.3,-62.9C42.2,-60.3,54,-54.4,35.6,-62.3Z"


// Separate component for each Blob Layer to optimize rendering
// We rotate the wrapping VIEW, not the SVG path, for native-driver performance.
const BlobLayer = ({ path, color, direction = 1, scaleRange = [1, 1.2], opacity = 0.6, duration = 8000, delay = 0, pulseDelayHigh = 0, pulseDelayLow = 0, style }) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: duration, // Pulse Out and Rotate
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.delay(pulseDelayHigh), // Pause at peak
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: duration, // Pulse In and Rotate Back
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.delay(pulseDelayLow) // Pause at trough
                ])
            ).start()
        };

        const timer = setTimeout(startAnimation, delay);
        return () => clearTimeout(timer);
    }, [duration, delay, pulseDelayHigh, pulseDelayLow])

    // 0.25x rotation logic:
    // With direction=1, rotates 0 -> 90deg -> 0.
    // With direction=4, rotates 0 -> 360deg -> 0.
    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['5deg', `${10 * direction}deg`]
    })

    const scale = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [scaleRange[0], scaleRange[1]]
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
            <Svg height="150%" width="150%" viewBox="0 0 200 200">
                <G transform="translate(100, 100)">
                    {/* Single Solid Layer as requested */}
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
    const riseAnim = useRef(new Animated.Value(0)).current // Entrance scale/translate
    const isNavigating = useRef(false); // Ref for navigation race-condition fix
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // EXPLICIT EXIT ANIMATION REFS
    const blob1Exit = useRef(new Animated.Value(1)).current
    const blob2Exit = useRef(new Animated.Value(1)).current
    const blob3Exit = useRef(new Animated.Value(1)).current

    // EXPLICIT ENTRANCE ANIMATION REFS (Staggered Opacity)
    const blob1Enter = useRef(new Animated.Value(0)).current
    const blob2Enter = useRef(new Animated.Value(0)).current
    const blob3Enter = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Entrance: Parallel execution of Scale/Translate (Global) and Opacity (Staggered)
        Animated.parallel([
            // Global Container Rise & Scale
            Animated.timing(riseAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.bezier(0.2, 0.8, 0.2, 1),
                useNativeDriver: true
            }),
            // Staggered Blob Appearances
            Animated.timing(blob3Enter, {
                toValue: 1,
                duration: 500,
                delay: 0,
                useNativeDriver: true
            }),
            Animated.timing(blob2Enter, {
                toValue: 1,
                duration: 500,
                delay: 200,
                useNativeDriver: true
            }),
            Animated.timing(blob1Enter, {
                toValue: 1,
                duration: 500,
                delay: 400,
                useNativeDriver: true
            })
        ]).start()

        const checkAuth = async () => {
            // Start the minimum splash timer
            const minSplashTime = new Promise(resolve => setTimeout(resolve, 5000));

            // Failsafe: Force navigation after 8 seconds if nothing else happens
            const safetyTimeout = setTimeout(() => {
                console.warn("Splash Screen Timeout - Forcing Navigation");
                handleNavigation();
            }, 8000);

            const handleNavigation = async () => {
                try {
                    if (isNavigating.current) return;
                    isNavigating.current = true;

                    clearTimeout(safetyTimeout); // Clear the failsafe if we get here normally

                    if (!navigation) {
                        console.error("Navigation prop is missing in SplashScreen");
                        return;
                    }

                    // Smooth Exit Animation: Fade out blobs individually with staggered delay
                    await new Promise(resolve => {
                        Animated.parallel([
                            Animated.timing(blob1Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 0,
                                useNativeDriver: true
                            }),
                            Animated.timing(blob2Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 200,
                                useNativeDriver: true
                            }),
                            Animated.timing(blob3Exit, {
                                toValue: 0,
                                duration: 200,
                                delay: 400,
                                useNativeDriver: true
                            })
                        ]).start(resolve);
                    });

                    const token = await authService.getToken();
                    const isValid = await authService.isTokenValid(token);

                    if (token && !isValid) {
                        console.log("Token expired during splash check, logging out...");
                        await authService.logout();
                    }

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

                    // Re-enabled Navigation Logic
                    if (deepLinkChargerId) {
                        const configParams = {
                            chargerId: deepLinkChargerId,
                            boxId: deepLinkChargerId,
                            stationName: 'Bentork Charger',
                            status: 'Available'
                        };

                        if (token && isValid) {
                            const tcAccepted = await authService.hasAcceptedTerms();
                            if (!tcAccepted) {
                                navigation.replace('TermsConsent', {
                                    nextScreen: 'Config',
                                    nextParams: configParams,
                                });
                            } else {
                                navigation.replace('Config', configParams);
                            }
                        } else {
                            navigation.replace('Login', {
                                postLoginTarget: 'Config',
                                postLoginParams: configParams
                            });
                        }
                    } else if (token && isValid) {

                        // Ensure notification channels are set up for the user's persona
                        const surveyData = await authService.getSurveyData();
                        if (surveyData) {
                            NotificationService.setupPersonaChannels(surveyData);
                        }

                        const tcAccepted = await authService.hasAcceptedTerms();
                        if (!tcAccepted) {
                            navigation.replace('TermsConsent', { nextScreen: 'Home' });
                        } else {
                            navigation.replace('Home');
                        }
                    } else {
                        navigation.replace('Login');
                    }

                } catch (navError) {
                    console.error("Navigation logic failed:", navError);
                    // Last resort fallback
                    if (navigation) navigation.replace('Login');
                }
            };

            // Check for In-App Updates (Android only)
            if (Platform.OS === 'android') {
                try {
                    const inAppUpdates = new SpInAppUpdates(false); // isDebug=false
                    // Add a timeout so the check never stalls the splash indefinitely
                    const updateCheckPromise = inAppUpdates.checkNeedsUpdate();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Update check timeout')), 3000)
                    );

                    const result = await Promise.race([updateCheckPromise, timeoutPromise]);

                    if (result.shouldUpdate) {
                        // Show our own non-dismissable dialog instead of the native Play overlay
                        setShowUpdateModal(true);
                        return; // Navigation is paused until user updates
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

    // Removed containerOpacity to allow individual blob opacity control

    return (
        <>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

                {/* 1. Background Layer: Blob */}
                <Animated.View style={[
                    styles.blobContainer,
                    {
                        transform: [
                            { translateY: containerTranslateY },
                            { scale: containerScale }
                        ]
                    }
                ]}>
                    {/* 
                   Blob Stack using colors from ../assets/styles/SplashScreen.css:
                   - Dark: #082f20 (opacity 0.9)
                   - Green: #008f45 (opacity 0.7)
                   - Light: #80e8b1 (opacity 0.5)

                   Positioned based on user request:
                   - Dark: Moved UPWARD (top value decreased)
                   - Green: AS IS
                   - White/Light: Moved BOTTOM MOST (top value increased)
                */}

                    {/* Dark Green Blob: #082f20 */}
                    <BlobLayer
                        path={PATH_GREEN}
                        color="#082f20"
                        duration={2000} // Pulse Duration
                        delay={2000} // Start immediately
                        pulseDelayHigh={800} // Dynamic pause
                        pulseDelayLow={200}
                        direction={4}
                        // Combine Exit * Entrance * Base Opacity
                        opacity={Animated.multiply(Animated.multiply(blob1Exit, blob1Enter), 0.9)}
                        scaleRange={[1.1, 1.25]}
                        style={{ top: height * 0.25, left: 0 }}
                    />

                    {/* Main Brand Green Blob: #008f45 */}
                    <BlobLayer
                        path={PATH_GREEN}
                        color="#008f45"
                        duration={1000} // Faster Pulse
                        delay={1000} // Delayed start
                        pulseDelayHigh={1500} // Long pause at peak
                        pulseDelayLow={500}
                        direction={1}
                        opacity={Animated.multiply(Animated.multiply(blob2Exit, blob2Enter), 0.9)}
                        scaleRange={[0.95, 1.05]}
                        style={{ top: height * 0.5, left: -20 }}
                    />

                    {/* Light/White Glow Blob: #80e8b1 */}
                    <BlobLayer
                        path={PATH_GREEN}
                        color="#80e8b1"
                        duration={3000} // Medium Pulse
                        delay={0} // More Delay
                        pulseDelayHigh={0} // No pause at peak
                        pulseDelayLow={2000} // Long pause at trough
                        direction={8}
                        opacity={Animated.multiply(Animated.multiply(blob3Exit, blob3Enter), 0.9)}
                        scaleRange={[3.4, 3.6]} // Slight pulse on huge blob
                        style={{ top: height * 0.85, left: 20 }}
                    />
                </Animated.View>

                {/* 2. Fullscreen Blur Layer */}
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="dark"
                    blurAmount={32} // User edit: 8
                    reducedTransparencyFallbackColor="rgba(0,0,0,0.8)"
                />

                {/* 3. Foreground Layer: Logo */}
                <View style={styles.contentContainer}>
                    <Image
                        source={require('../assets/images/logo_inverted.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

            </View>

            {/* Non-dismissable update dialog – hoisted above splash UI */}
            <UpdateRequiredModal
                visible={showUpdateModal}
                onUpdate={() => {
                    // Keep modal visible after opening Play Store;
                    // the user must install the update and reopen the app.
                }}
            />
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -100, // User edit
        overflow: 'visible' // User fix for overflow
    },
    contentContainer: {
        zIndex: 10,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    logo: {
        width: 200,
        height: 100,
        marginBottom: 10
    },
    blobContainer: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1, // User edit
        overflow: 'visible' // User fix for overflow
    }
})
