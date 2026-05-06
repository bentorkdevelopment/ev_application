import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { stationsApi } from './api';

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const GOOGLE_PLACES_API_KEY = GOOGLE_MAPS_API_KEY; // Usually shared
const GOOGLE_PLACES_V1_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export const SUPPORTED_LOCATIONS = [
    "Koregaon Park, Pune",
    "Baner, Pune",
    "Hinjewadi, Pune",
    "Viman Nagar, Pune",
    "Kothrud, Pune",
    "Wakad, Pune",
    "Magarpatta City, Pune",
    "Shivajinagar, Pune",
    "Swargate, Pune",
    "Aundh, Pune",
    "Hadapsar, Pune",
    "Kalyani Nagar, Pune",
    "FC Road, Pune",
    "JM Road, Pune",
    "Pimple Saudagar, Pune"
];

const routeService = {
    /**
     * Fetch route from Google Directions API
     * @param {Object} origin - { latitude, longitude } or address string
     * @param {Object} destination - { latitude, longitude } or address string
     */
    getRoute: async (origin, destination) => {
        try {
            // Check for API Key
            if (!GOOGLE_MAPS_API_KEY) throw new Error("Missing Google Maps API Key");

            const originStr = typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
            const destStr = typeof destination === 'string' ? destination : `${destination.latitude},${destination.longitude}`;

            console.log(`[RouteService] Fetching: ${originStr} -> ${destStr}`);

            const response = await axios.get(GOOGLE_DIRECTIONS_URL, {
                params: {
                    origin: originStr,
                    destination: destStr,
                    key: GOOGLE_MAPS_API_KEY,
                    mode: 'driving',
                    alternatives: false
                }
            });

            if (response.data.status !== 'OK') {
                console.warn(`[RouteService] API Error: ${response.data.status}`);
                throw new Error(`Directions API Error: ${response.data.status}`);
            }

            const route = response.data.routes[0];
            const leg = route.legs[0];

            // 1. Decode all step polylines for high-resolution road following
            let allPoints = [];
            const steps = leg.steps.map(step => {
                const stepPoints = decodePolyline(step.polyline.points);
                allPoints = [...allPoints, ...stepPoints];

                return {
                    instruction: step.html_instructions.replace(/<[^>]*>?/gm, ''),
                    distance: step.distance.text,
                    duration: step.duration.text,
                    startLocation: step.start_location,
                    endLocation: step.end_location,
                    maneuver: step.maneuver
                };
            });

            // 2. Use high-res points, fallback to overview if needed
            const points = allPoints.length > 0 ? allPoints : decodePolyline(route.overview_polyline.points);

            return {
                points,
                steps,
                distanceKm: leg.distance.value / 1000,
                durationMins: leg.duration.value / 60,
                startAddress: leg.start_address,
                endAddress: leg.end_address,
                // Exact endpoint lat/lng for Navigation SDK
                endLocation: {
                    lat: leg.end_location.lat,
                    lng: leg.end_location.lng,
                },
                bounds: route.bounds
            };

        } catch (error) {
            console.error("[RouteService] Error:", error);

            // --- FALLBACK MOCK FOR DEMO ---
            // If API fails (quota/billing), using simple mock points
            console.log("Using Fallback Route Logic due to API failure.");

            const p1 = typeof origin === 'object' ? origin : { latitude: 18.5204, longitude: 73.8567 };
            const p2 = typeof destination === 'object' ? destination : { latitude: 19.0760, longitude: 72.8777 };

            return {
                points: [p1, p2], // Just a straight line
                distanceKm: 0,
                durationMins: 0,
                startAddress: "Origin",
                endAddress: "Destination",
                bounds: null
            };
        }
    },

    /**
     * Find stations along the route within a buffer distance
     * @param {Array} routePoints - Array of {latitude, longitude} from getRoute
     * @param {number} bufferKm - Distance in KM to search from route (e.g. 5km)
     */
    findStationsAlongRoute: async (routePoints, bufferKm = 5) => {
        try {
            // 1. Fetch from Local DB
            const allStationsData = await stationsApi.getAllStations();
            const localStations = Array.isArray(allStationsData) ? allStationsData : (allStationsData?.stations || []);

            // 2. Fetch from Google Places (New API v1)
            const googleStations = await routeService.findEVStationsFromGooglePlaces(routePoints, bufferKm * 1000);

            // 3. Merge & Deduplicate by Proximity (200m)
            // Priority: Keep Local DB station if a Google result is nearby
            const mergedStations = [...localStations];
            
            googleStations.forEach(gStation => {
                const isDuplicate = localStations.some(lStation => {
                    const dist = getDistanceFromLatLonInKm(
                        lStation.latitude, lStation.longitude, 
                        gStation.latitude, gStation.longitude
                    );
                    return dist < 0.2; // 200 meters
                });

                if (!isDuplicate) {
                    mergedStations.push(gStation);
                }
            });

            // 4. Simplify Route for distance calculations
            const simplifiedRoute = routePoints.filter((_, i) => i % 10 === 0);

            // 5. Filter and Tag Stations with Route Position
            const stationsOnRoute = mergedStations.filter(station => {
                if (!station.latitude || !station.longitude) return false;
                const stationLat = Number(station.latitude);
                const stationLng = Number(station.longitude);

                const minDistance = simplifiedRoute.reduce((min, point) => {
                    const d = getDistanceFromLatLonInKm(point.latitude, point.longitude, stationLat, stationLng);
                    return d < min ? d : min;
                }, Infinity);

                return minDistance <= bufferKm;
            }).map(station => {
                const stationLat = Number(station.latitude);
                const stationLng = Number(station.longitude);

                // Find index of closest point on FULL route for accurate sorting
                let closestIdx = 0;
                let minDist = Infinity;

                routePoints.forEach((p, idx) => {
                    const d = getDistanceFromLatLonInKm(p.latitude, p.longitude, stationLat, stationLng);
                    if (d < minDist) {
                        minDist = d;
                        closestIdx = idx;
                    }
                });

                // Add Brand info if missing
                let brandName = station.brand || 'EV Network';
                if (station.name.toLowerCase().includes('tata')) brandName = 'Tata Power';
                else if (station.name.toLowerCase().includes('jio')) brandName = 'Jio-bp Pulse';
                else if (station.name.toLowerCase().includes('bpcl')) brandName = 'BPCL Charge';
                else if (station.name.toLowerCase().includes('zeon')) brandName = 'Zeon Charging';

                return {
                    ...station,
                    brand: brandName,
                    routeIndex: closestIdx, // Position along full route
                    image_url: station.imageUrl || station.image_url || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7'
                };
            });

            // 6. Sort stations by their appearance on the route
            return stationsOnRoute.sort((a, b) => a.routeIndex - b.routeIndex);

        } catch (error) {
            console.error("Find Stations Error:", error);
            return [];
        }
    },

    /**
     * Fetch EV stations from Google Places API v1 along the route
     */
    findEVStationsFromGooglePlaces: async (routePoints, radiusMeters = 5000) => {
        try {
            if (!GOOGLE_PLACES_API_KEY) return [];

            // Sample ~5 points across the route to cover the distance
            const len = routePoints.length;
            if (len < 10) return [];

            const anchorIndices = [0, Math.floor(len * 0.25), Math.floor(len * 0.5), Math.floor(len * 0.75), len - 1];
            const anchors = anchorIndices.map(idx => routePoints[idx]);

            let allPlaces = [];
            const seenPlaceIds = new Set();

            for (const point of anchors) {
                try {
                    const response = await axios.post(GOOGLE_PLACES_V1_URL, {
                        includedTypes: ['electric_vehicle_charging_station'],
                        maxResultCount: 15,
                        locationRestriction: {
                            circle: {
                                center: {
                                    latitude: point.latitude,
                                    longitude: point.longitude
                                },
                                radius: radiusMeters
                            }
                        }
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
                        }
                    });

                    if (response.data?.places) {
                        response.data.places.forEach(place => {
                            if (!seenPlaceIds.has(place.id)) {
                                seenPlaceIds.add(place.id);
                                allPlaces.push({
                                    placeId: place.id,
                                    name: place.displayName?.text || 'Charging Station',
                                    location: place.formattedAddress || 'Nearby Route',
                                    latitude: place.location.latitude,
                                    longitude: place.location.longitude,
                                    status: 'Available', // Default for Google results
                                    brand: 'EV Network'
                                });
                            }
                        });
                    }
                } catch (pErr) {
                    console.warn(`[Places] Anchor search failed:`, pErr.message);
                }
            }

            return allPlaces;
        } catch (error) {
            console.error("[RouteService] Google Places Search Error:", error);
            return [];
        }
    },

    /**
     * Fetch place suggestions from Google Places API
     * @param {string} input - Search query
     */
    getPlaceSuggestions: async (input) => {
        try {
            if (!GOOGLE_MAPS_API_KEY) throw new Error("Missing Google Maps API Key");
            if (!input || input.length < 3) return [];

            const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

            const response = await axios.get(GOOGLE_PLACES_URL, {
                params: {
                    input: input,
                    key: GOOGLE_MAPS_API_KEY,
                    types: 'geocode|establishment'
                }
            });

            if (response.data.status !== 'OK') {
                return [];
            }

            return response.data.predictions.map(p => p.description);

        } catch (error) {
            console.error("[RouteService] Autocomplete Error:", error);
            return [];
        }
    }
};

// --- Utilities ---

/**
 * Decodes Google Polyline String into array of coordinates
 */
function decodePolyline(t, e) {
    for (var n, o, u = 0, l = 0, r = 0, d = [], h = 0, i = 0, a = null, c = Math.pow(10, e || 5); u < t.length;) {
        a = null, h = 0, i = 0;
        do {
            a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5;
        } while (a >= 32);
        n = 1 & i ? ~(i >> 1) : i >> 1, h = i = 0;
        do {
            a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5;
        } while (a >= 32);
        o = 1 & i ? ~(i >> 1) : i >> 1, l += n, r += o, d.push({
            latitude: l / c,
            longitude: r / c
        });
    }
    return d;
}

export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function rad2deg(rad) {
    return rad * (180 / Math.PI);
}

export function getBearing(lat1, lon1, lat2, lon2) {
    const startLat = deg2rad(lat1);
    const startLon = deg2rad(lon1);
    const destLat = deg2rad(lat2);
    const destLon = deg2rad(lon2);

    const y = Math.sin(destLon - startLon) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
        Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLon - startLon);
    const brng = Math.atan2(y, x);
    const brngDeg = rad2deg(brng);
    return (brngDeg + 360) % 360;
}

export default routeService;
