import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const StationCardSkeleton = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const SkeletonBlock = ({ width, height, style }) => (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#333',
                    marginBottom: 10,
                    borderRadius: 4,
                    opacity
                },
                style
            ]}
        />
    );

    return (
        <View style={[styles.cardContainer, {
            width: Dimensions.get('window').width * 0.95,
            marginRight: 20
        }]}>
            {/* Top Row: Info + Image */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <SkeletonBlock width="80%" height={24} style={{ marginBottom: 10 }} />
                    <SkeletonBlock width="40%" height={16} style={{ marginBottom: 10 }} />
                    <SkeletonBlock width="90%" height={14} />
                    <SkeletonBlock width="70%" height={14} />
                </View>
                <View style={styles.imageContainerNew}>
                    <Animated.View style={{ flex: 1, backgroundColor: '#333', opacity }} />
                </View>
            </View>

            {/* Bottom Row: Status/Connectors + Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                    <SkeletonBlock width="40%" height={16} style={{ marginBottom: 8 }} />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SkeletonBlock width={80} height={24} style={{ borderRadius: 6 }} />
                        <SkeletonBlock width={30} height={24} style={{ borderRadius: 6 }} />
                    </View>
                </View>

                {/* Right: Action Buttons */}
                <View style={{ justifyContent: 'flex-end', paddingBottom: 0, paddingEnd: 8 }}>
                    <Animated.View style={{
                        width: 80,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#333',
                        opacity
                    }} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    imageContainerNew: {
        width: 110,
        height: 110,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#333',
        marginLeft: 10,
    },
});

export default StationCardSkeleton;
