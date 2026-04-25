import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';

const MapScreen = () => {
    return (
        <View style={styles.container}>
            <MapView
                // 1. PROVIDER_GOOGLE forces the app to use Google Maps on both iOS and Android.
                // If you remove this prop, iOS will use Apple Maps (which is free!).
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: 28.6139,
                    longitude: 77.2090, // Delhi
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                // Enable built-in Google features
                showsTraffic={true}
                showsIndoors={true}
            >
                <Marker
                    coordinate={{ latitude: 28.6139, longitude: 77.2090 }}
                    title={"New Delhi"}
                    description={"Capital of India"}
                />
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default MapScreen;