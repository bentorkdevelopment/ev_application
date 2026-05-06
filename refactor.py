import re

def refactor():
    with open('src/screens/HomeScreen.js', 'r', encoding='utf-8') as f:
        code = f.read()

    # Import Reanimated
    if 'react-native-reanimated' not in code:
        code = code.replace("import LottieView from 'lottie-react-native';", 
                            "import LottieView from 'lottie-react-native';\nimport Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor, interpolate } from 'react-native-reanimated';")

    # Replace pulseAnim definition
    code = re.sub(r'const pulseAnim = useRef\(new Animated\.Value\(0\)\)\.current;\n?', '', code)
    # Remove pulseAnim usages
    code = re.sub(r'\s*// Moved pulseAnim to top of component\n?', '', code)
    pulse_anim_effect = r'useEffect\(\(\) => \{\n\s*if \(activeResumeSession\) \{\n\s*Animated\.loop\(\n\s*Animated\.sequence\(\[\n\s*Animated\.timing\(pulseAnim, \{\n\s*toValue: 1,\n\s*duration: 1000,\n\s*useNativeDriver: false, // Required for color interpolation\n\s*\}\),\n\s*Animated\.timing\(pulseAnim, \{\n\s*toValue: 0,\n\s*duration: 1000,\n\s*useNativeDriver: false,\n\s*\}\),\n\s*\]\)\n\s*\)\.start\(\);\n\s*\} else \{\n\s*pulseAnim\.setValue\(0\); // Reset\n\s*\}\n\s*\}, \[activeResumeSession\]\);\n?'
    code = re.sub(pulse_anim_effect, '', code, flags=re.MULTILINE)

    # Convert simple useNativeDriver: false to true for Opacity animations
    code = code.replace("useNativeDriver: false, // Required for color interpolation", "useNativeDriver: true,")
    code = code.replace("Animated.timing(skeletonOpacity, {\n                    toValue: 0,\n                    duration: 500,\n                    useNativeDriver: false,\n                })", "Animated.timing(skeletonOpacity, {\n                    toValue: 0,\n                    duration: 500,\n                    useNativeDriver: true,\n                })")
    code = code.replace("Animated.timing(contentOpacity, {\n                    toValue: 1,\n                    duration: 500,\n                    useNativeDriver: false,\n                })", "Animated.timing(contentOpacity, {\n                    toValue: 1,\n                    duration: 500,\n                    useNativeDriver: true,\n                })")
    code = code.replace("Animated.timing(bottomUiFade, {\n                toValue: 1,\n                duration: 250,\n                useNativeDriver: false,\n            })", "Animated.timing(bottomUiFade, {\n                toValue: 1,\n                duration: 250,\n                useNativeDriver: true,\n            })")

    # Leave PanResponder alone since converting it to Reanimated GestureHandler is too invasive and risky.
    
    # Convert navTabAnim to Reanimated
    code = code.replace("const navTabAnim = useRef(new Animated.Value(0)).current; // 0 = Home, 1 = Activity", "const navTabAnim = useSharedValue(0);")
    
    # Replace Animated.timing for navTabAnim
    code = code.replace("""Animated.timing(navTabAnim, {
            toValue: tab === 'Home' ? 0 : 1,
            duration: 250,
            useNativeDriver: false,
        }).start();""", "navTabAnim.value = withTiming(tab === 'Home' ? 0 : 1, { duration: 250 });")

    # Add useAnimatedStyles
    styles_injection = """
    const homeTabStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(navTabAnim.value, [0, 1], [64, 30]),
            backgroundColor: interpolateColor(navTabAnim.value, [0, 1], ['#ffffff', 'rgba(30,30,30,0)'])
        };
    });
    
    const activityTabStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(navTabAnim.value, [0, 1], [30, 70]),
            backgroundColor: interpolateColor(navTabAnim.value, [0, 1], ['rgba(30,30,30,0)', '#ffffff'])
        };
    });
    
    const homeIconStyle1 = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [1, 0]) }));
    const homeIconStyle2 = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [0, 1]) }));
    const activityIconStyle1 = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [1, 0]) }));
    const activityIconStyle2 = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [0, 1]) }));
    const mapOpacityStyle = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [1, 0]) }));
    const activityScreenStyle = useAnimatedStyle(() => ({ opacity: interpolate(navTabAnim.value, [0, 1], [0, 1]) }));
    """
    
    code = code.replace("const pan = useRef(new Animated.Value(300)).current;", styles_injection + "\n    const pan = useRef(new Animated.Value(300)).current;")

    # Replace JSX
    # Map opacity
    code = code.replace("opacity: navTabAnim.interpolate({\n                                inputRange: [0, 1],\n                                outputRange: [1, 0]\n                            })", "/*opacity managed by reanimated*/")
    code = code.replace("StyleSheet.absoluteFill,\n                        {\n                            /*opacity managed by reanimated*/\n                        }", "StyleSheet.absoluteFill, mapOpacityStyle")
    
    # Map Overlay opacity
    code = code.replace("opacity: navTabAnim.interpolate({\n                                    inputRange: [0, 1],\n                                    outputRange: [1, 0]\n                                })", "/*opacity managed by reanimated*/")
    code = code.replace("zIndex: 20,\n                                /*opacity managed by reanimated*/", "zIndex: 20")
    code = code.replace("StyleSheet.absoluteFill,\n                            {\n                                zIndex: 20\n                            }", "StyleSheet.absoluteFill, mapOpacityStyle, { zIndex: 20 }")
    
    # Activity Screen opacity
    code = code.replace("style={[{ flex: 1, paddingTop: 100, opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), ...StyleSheet.absoluteFillObject }]}", "style={[{ flex: 1, paddingTop: 100, ...StyleSheet.absoluteFillObject }, activityScreenStyle]}")

    # Tabs
    code = code.replace("<Animated.View style={[styles.navPill, { width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [64, 30] }), backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', 'rgba(30,30,30,0)'] }) }]}>", "<Reanimated.View style={[styles.navPill, homeTabStyle]}>")
    code = code.replace("<Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}><HomeIconFilled width={24} height={24} fill={Colors.matteBlack} /></Animated.View>", "<Reanimated.View style={[styles.iconNavWrapper, homeIconStyle1]}><HomeIconFilled width={24} height={24} fill={Colors.matteBlack} /></Reanimated.View>")
    code = code.replace("<Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}><HomeIcon width={24} height={24} fill={Colors.white} /></Animated.View>", "<Reanimated.View style={[styles.iconNavWrapper, homeIconStyle2]}><HomeIcon width={24} height={24} fill={Colors.white} /></Reanimated.View>")

    code = code.replace("<Animated.View style={[styles.navPill, { width: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 70] }), backgroundColor: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(30,30,30,0)', '#ffffff'] }) }]}>", "<Reanimated.View style={[styles.navPill, activityTabStyle]}>")
    code = code.replace("<Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}><LibraryIcon width={24} height={24} fill={Colors.white} /></Animated.View>", "<Reanimated.View style={[styles.iconNavWrapper, activityIconStyle1]}><LibraryIcon width={24} height={24} fill={Colors.white} /></Reanimated.View>")
    code = code.replace("<Animated.View style={[styles.iconNavWrapper, { opacity: navTabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}><LibraryIconFilled width={24} height={24} fill={Colors.matteBlack} /></Animated.View>", "<Reanimated.View style={[styles.iconNavWrapper, activityIconStyle2]}><LibraryIconFilled width={24} height={24} fill={Colors.matteBlack} /></Reanimated.View>")

    code = code.replace("</Animated.View>\n                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>", "</Reanimated.View>\n                    <Text style={currentTab === 'Home' ? styles.navTextActive : styles.navText}>Home</Text>")
    code = code.replace("</Animated.View>\n                    <Text style={currentTab === 'Activity' ? styles.navTextActive : styles.navText}>Activity</Text>", "</Reanimated.View>\n                    <Text style={currentTab === 'Activity' ? styles.navTextActive : styles.navText}>Activity</Text>")

    code = code.replace("< Animated.View", "<Reanimated.View")
    code = code.replace("</Animated.View >", "</Reanimated.View >")

    with open('src/screens/HomeScreen.js', 'w', encoding='utf-8') as f:
        f.write(code)

refactor()
