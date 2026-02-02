import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

// 1. Setup: MapLibre technically requires an access token for some sources, 
// but for free/open sources (like the demo style below), we can set it to null.
MapLibreGL.setAccessToken(null);

const MapScreen = () => {
    // 2. State: This controls where the map looks. 
    // Updating this state causes the map to fly there instantly.
    const [cameraConfig, setCameraConfig] = useState({
        centerCoordinate: [77.2090, 28.6139], // [Longitude, Latitude] (Delhi)
        zoomLevel: 12,
    });

    // Function to simulate selecting a station
    const goToStation = () => {
        setCameraConfig({
            centerCoordinate: [72.8777, 19.0760], // Mumbai
            zoomLevel: 14, // Zoom in closer
        });
    };

    return (
        <View style={styles.page}>
            <MapLibreGL.MapView
                style={styles.map}
                // 3. StyleURL: This determines the "look" of the map.
                // This is a free demo style. To fully customize colors/roads, you create your own JSON.
                styleURL="https://demotiles.maplibre.org/style.json"

                // Remove the logo if allowed by your tile provider
                logoEnabled={false}
                attributionEnabled={true}
            >
                {/* 4. The Camera: Handles the view. 
            animationMode="flyTo" makes it smooth. */}
                <MapLibreGL.Camera
                    zoomLevel={cameraConfig.zoomLevel}
                    centerCoordinate={cameraConfig.centerCoordinate}
                    animationMode="flyTo"
                    animationDuration={2000} // 2 seconds to fly
                />

                {/* 5. Custom Marker: You can use ANY React Native View here */}
                <MapLibreGL.PointAnnotation
                    id="station-1"
                    coordinate={[72.8777, 19.0760]} // Mumbai coordinates
                >
                    {/* Your Custom Icon Design */}
                    <View style={styles.customMarker}>
                        <View style={styles.markerInner} />
                    </View>

                    {/* Tooltip / Callout */}
                    <MapLibreGL.Callout title="EV Station A" />
                </MapLibreGL.PointAnnotation>

            </MapLibreGL.MapView>

            {/* Button to test real-time movement */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={goToStation}>
                    <Text style={styles.buttonText}>Go to Mumbai Station</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    page: { flex: 1 },
    map: { flex: 1 },
    customMarker: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#007AFF', // Blue border
    },
    markerInner: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: '#007AFF', // Blue center
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    button: {
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: 'bold' }
});

export default MapScreen;