import re
import sys

def refactor():
    try:
        with open('src/screens/SessionScreen.js', 'r', encoding='utf-8') as f:
            code = f.read()

        # 1. Imports
        if 'import Reanimated' not in code:
            code = code.replace(
                "import {", 
                "import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withRepeat, withSequence, interpolateColor, interpolate, Easing as ReanimatedEasing, Extrapolation } from 'react-native-reanimated';\nimport {",
                1
            )
        
        if 'const ReanimatedCircle' not in code:
            code = code.replace(
                "const AnimatedCircle = Animated.createAnimatedComponent(Circle);",
                "const AnimatedCircle = Animated.createAnimatedComponent(Circle);\nconst ReanimatedCircle = Reanimated.createAnimatedComponent(Circle);"
            )

        # 2. Convert Hooks
        code = code.replace("const tabAnim = useRef(new Animated.Value(0)).current;", "const tabAnim = useSharedValue(0);")
        code = code.replace("const contentFadeAnim = useRef(new Animated.Value(1)).current;", "const contentFadeAnim = useSharedValue(1);")
        code = code.replace("const progressAnim = useRef(new Animated.Value(0)).current;", "const progressAnim = useSharedValue(0);")
        code = code.replace("const pulseAnim = useRef(new Animated.Value(1)).current;", "const pulseAnim = useSharedValue(1);")
        code = code.replace("const aqiBarAnim = useRef(new Animated.Value(0)).current;", "const aqiBarAnim = useSharedValue(0);")
        code = code.replace("const bannerPulseAnim = useRef(new Animated.Value(0.18)).current;", "const bannerPulseAnim = useSharedValue(0.18);")

        # 3. Update animations in useEffects
        
        # progressAnim
        code = re.sub(
            r"Animated\.timing\(progressAnim, \{\n\s*toValue: pct,\n\s*duration: 1000,\n\s*easing: Easing\.out\(Easing\.cubic\),\n\s*useNativeDriver: false\n\s*\}\)\.start\(\);",
            "progressAnim.value = withTiming(pct, { duration: 1000, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });",
            code
        )

        # pulseAnim
        code = re.sub(
            r"Animated\.loop\(\n\s*Animated\.sequence\(\[\n\s*Animated\.timing\(pulseAnim, \{ toValue: 1\.18, duration: 900, useNativeDriver: false \}\),\n\s*Animated\.timing\(pulseAnim, \{ toValue: 1, duration: 900, useNativeDriver: false \}\),\n\s*\]\)\n\s*\)\.start\(\);",
            "pulseAnim.value = withRepeat(withSequence(withTiming(1.18, { duration: 900 }), withTiming(1, { duration: 900 })), -1, False);".replace("False", "false"),
            code
        )

        # aqiBarAnim
        code = re.sub(
            r"Animated\.timing\(aqiBarAnim, \{\n\s*toValue: pct,\n\s*duration: 1500,\n\s*easing: Easing\.inOut\(Easing\.ease\),\n\s*useNativeDriver: false\n\s*\}\)\.start\(\);",
            "aqiBarAnim.value = withTiming(pct, { duration: 1500, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) });",
            code
        )

        # bannerPulseAnim
        code = re.sub(
            r"Animated\.loop\(\n\s*Animated\.sequence\(\[\n\s*Animated\.timing\(bannerPulseAnim, \{ toValue: 0\.55, duration: 1600, easing: Easing\.inOut\(Easing\.sin\), useNativeDriver: false \}\),\n\s*Animated\.timing\(bannerPulseAnim, \{ toValue: 0\.18, duration: 1600, easing: Easing\.inOut\(Easing\.sin\), useNativeDriver: false \}\),\n\s*\]\)\n\s*\)\.start\(\);",
            "bannerPulseAnim.value = withRepeat(withSequence(withTiming(0.55, { duration: 1600, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) }), withTiming(0.18, { duration: 1600, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) })), -1, false);",
            code
        )

        # tabAnim & contentFadeAnim (parallel)
        parallel_anim = r"Animated\.parallel\(\[\n\s*Animated\.timing\(tabAnim, \{\n\s*toValue: activeTab === 'Details' \? 1 : 0,\n\s*duration: 250,\n\s*easing: Easing\.inOut\(Easing\.ease\),\n\s*useNativeDriver: false\n\s*\}\),\n\s*Animated\.timing\(contentFadeAnim, \{\n\s*toValue: 0,\n\s*duration: 100,\n\s*useNativeDriver: false\n\s*\}\)\n\s*\]\)\.start\(\(\) => \{\n\s*setRenderTab\(activeTab\);\n\s*Animated\.timing\(contentFadeAnim, \{\n\s*toValue: 1,\n\s*duration: 150,\n\s*useNativeDriver: false\n\s*\}\)\.start\(\);\n\s*\}\);"
        replacement_parallel = "tabAnim.value = withTiming(activeTab === 'Details' ? 1 : 0, { duration: 250, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) });\n        contentFadeAnim.value = withTiming(0, { duration: 100 });\n        setTimeout(() => {\n            setRenderTab(activeTab);\n            contentFadeAnim.value = withTiming(1, { duration: 150 });\n        }, 120);"
        code = re.sub(parallel_anim, replacement_parallel, code)

        # 4. Styles & Props injection
        styles_injection = """
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulseAnim.value, [1, 1.18], [1, 1.1]) }] }));
    const bannerStyle = useAnimatedStyle(() => ({ borderColor: interpolateColor(bannerPulseAnim.value, [0, 1], ['rgba(57,226,155,0)', 'rgba(57,226,155,1)']) }));
    const progressBarStyle = useAnimatedStyle(() => ({ width: `${interpolate(progressAnim.value, [0, 100], [0, 100], Extrapolation.CLAMP)}%` }));
    const aqiBarStyle = useAnimatedStyle(() => ({ width: `${interpolate(aqiBarAnim.value, [0, 100], [0, 100], Extrapolation.CLAMP)}%` }));
    const tabIndicatorStyle = useAnimatedStyle(() => ({ left: `${interpolate(tabAnim.value, [0, 1], [0, 50])}%` }));
    const tabContentStyle = useAnimatedStyle(() => ({ opacity: contentFadeAnim.value }));
    const mainRingProps = useAnimatedProps(() => ({ strokeDashoffset: interpolate(progressAnim.value, [0, 100], [CIRCUMFERENCE, 0]) }));
    const miniRingProps = useAnimatedProps(() => ({ strokeDashoffset: interpolate(progressAnim.value, [0, 100], [2 * Math.PI * 19, 0]) }));
"""
        
        # Inject styles right before strokeDashoffset is defined
        code = code.replace("const strokeDashoffset = progressAnim.interpolate({", styles_injection + "\n    const strokeDashoffset = progressAnim.interpolate({")
        
        # Remove old interpolate definitions
        code = re.sub(r"const strokeDashoffset = progressAnim\.interpolate\(\{\s*inputRange: \[0, 100\],\s*outputRange: \[CIRCUMFERENCE, 0\],\s*\}\);\n?", "", code)
        code = re.sub(r"const indicatorLeft = tabAnim\.interpolate\(\{\s*inputRange: \[0, 1\],\s*outputRange: \['0%', '50%'\],\s*\}\);\n?", "", code)

        # 5. JSX replacements (Replacing precise blocks to avoid breaking unmatched tags)
        
        # bannerStyle
        code = code.replace("""<Animated.View style={[
                        styles.sessionBanner,
                        { borderColor: bannerPulseAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(57,226,155,0)', 'rgba(57,226,155,1)'] }) },
                    ]}>""", "<Reanimated.View style={[styles.sessionBanner, bannerStyle]}>")
        code = code.replace("</Animated.View>\n                        <View style={styles.sessionBannerContent}>", "</Reanimated.View>\n                        <View style={styles.sessionBannerContent}>")

        # pulseStyle
        code = code.replace("""<Animated.View style={{ transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.18], outputRange: [1, 1.1] }) }] }}>""", "<Reanimated.View style={pulseStyle}>")
        code = code.replace("""</Animated.View>\n                                <Bolt size={32} color="#000" style={{ position: 'absolute' }} />""", """</Reanimated.View>\n                                <Bolt size={32} color="#000" style={{ position: 'absolute' }} />""")

        # aqiBarStyle
        code = code.replace("""<Animated.View
                                style={[
                                    styles.aqiBarFill,
                                    {
                                        width: aqiBarAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                            extrapolate: 'clamp'
                                        })
                                    }
                                ]}
                            />""", "<Reanimated.View style={[styles.aqiBarFill, aqiBarStyle]} />")

        # progressBarStyle
        code = code.replace("""<Animated.View
                        style={[styles.progressFill, {
                            width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                                extrapolate: 'clamp'
                            })
                        }]}
                    />""", "<Reanimated.View style={[styles.progressFill, progressBarStyle]} />")

        # tabIndicatorStyle
        code = code.replace("""<Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />""", "<Reanimated.View style={[styles.tabIndicator, tabIndicatorStyle]} />")
        
        # tabContentStyle
        code = code.replace("""<Animated.View style={[styles.tabContent, { paddingHorizontal: 20, opacity: contentFadeAnim }]}>""", "<Reanimated.View style={[styles.tabContent, { paddingHorizontal: 20 }, tabContentStyle]}>")
        code = code.replace("""</Animated.View>\n                            </ScrollView>""", """</Reanimated.View>\n                            </ScrollView>""")

        # AnimatedCircle replacements
        code = code.replace("""<AnimatedCircle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke="#39E29B"
                            strokeWidth={STROKE}
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            rotation="-90"
                            originX={CIRCLE_SIZE / 2}
                            originY={CIRCLE_SIZE / 2}
                        />""", """<ReanimatedCircle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke="#39E29B"
                            strokeWidth={STROKE}
                            strokeDasharray={CIRCUMFERENCE}
                            animatedProps={mainRingProps}
                            strokeLinecap="round"
                            rotation="-90"
                            originX={CIRCLE_SIZE / 2}
                            originY={CIRCLE_SIZE / 2}
                        />""")

        code = code.replace("""<AnimatedCircle
                            cx={24}
                            cy={24}
                            r={19}
                            stroke="#39E29B"
                            strokeWidth={4}
                            strokeDasharray={`${2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                            strokeDashoffset={progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: [2 * Math.PI * 19, 0],
                            })}
                            strokeLinecap="round"
                            rotation="-90"
                            originX={24}
                            originY={24}
                        />""", """<ReanimatedCircle
                            cx={24}
                            cy={24}
                            r={19}
                            stroke="#39E29B"
                            strokeWidth={4}
                            strokeDasharray={`${2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                            animatedProps={miniRingProps}
                            strokeLinecap="round"
                            rotation="-90"
                            originX={24}
                            originY={24}
                        />""")

        with open('src/screens/SessionScreen.js', 'w', encoding='utf-8') as f:
            f.write(code)
            
        print("Done")
    except Exception as e:
        print("Error:", e)

refactor()
