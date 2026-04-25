import { Alert } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@env';

const GOOGLE_MAPS_APIKEY = GOOGLE_MAPS_API_KEY;

export const getDirections = async (startLoc, destinationLoc) => {
    try {
        const mode = 'driving';
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destinationLoc.latitude},${destinationLoc.longitude}&key=${GOOGLE_MAPS_APIKEY}&mode=${mode}`;

        console.log("Directions URL:", url); // Debug
        const response = await fetch(url);
        const result = await response.json();

        console.log("Directions Result:", JSON.stringify(result)); // Debug

        if (result.routes && result.routes.length) {
            const points = decode(result.routes[0].overview_polyline.points);
            const coordinates = points.map(point => ({ latitude: point.latitude, longitude: point.longitude }));
            return coordinates;
        } else {
            // Show exact reason from Google (OVER_QUERY_LIMIT, REQUEST_DENIED, ZERO_RESULTS)
            Alert.alert("Directions Error", `Google API: ${result.status}\n${result.error_message || ''}`);
            return null;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        Alert.alert("Error", error.message);
        return null;
    }
};

// Polyline decode function
const decode = (t, e) => {
    for (
        var n,
        o,
        u = 0,
        l = 0,
        r = 0,
        d = [],
        h = 0,
        i = 0,
        a = null,
        c = Math.pow(10, e || 5);
        u < t.length;

    ) {
        (a = null), (h = 0), (i = 0);
        do {
            (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
        } while (a >= 32);
        (n = 1 & i ? ~(i >> 1) : i >> 1), (h = i = 0);
        do {
            (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
        } while (a >= 32);
        (o = 1 & i ? ~(i >> 1) : i >> 1),
            (l += n),
            (r += o),
            d.push({ latitude: l / c, longitude: r / c });
    }
    return d;
};
