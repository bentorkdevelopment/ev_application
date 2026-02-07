
import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const placesService = {
    fetchNearbyCafes: async (latitude, longitude, radius = 2000) => { // 2km radius default
        try {
            if (!GOOGLE_MAPS_API_KEY) {
                console.warn('Google Maps API Key is missing');
                return [];
            }

            console.log(`PlacesService: Fetching cafes near ${latitude}, ${longitude}`);

            // Try searching with the New Places API (v1)
            // Note: If this fails repeatedly, ensure "Places API (New)" is enabled in Google Cloud Console
            const response = await axios.post(
                PLACES_API_URL,
                {
                    includedTypes: ['cafe', 'coffee_shop', 'restaurant', 'store'],
                    maxResultCount: 20,
                    locationRestriction: {
                        circle: {
                            center: {
                                latitude,
                                longitude,
                            },
                            radius,
                        },
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                        // Simpler Field Mask to avoid errors
                        'X-Goog-FieldMask': 'places.displayName,places.location,places.rating,places.businessStatus,places.photos,places.id,places.formattedAddress',
                    },
                }
            );

            console.log("PlacesService: Response Status:", response.status);

            if (response.data && response.data.places) {
                console.log(`PlacesService: Found ${response.data.places.length} places.`);
                return response.data.places.map((place) => ({
                    id: place.id,
                    name: place.displayName?.text || 'Unknown Place',
                    latitude: place.location?.latitude,
                    longitude: place.location?.longitude,
                    rating: place.rating || 0, // Default 0 if missing
                    address: place.formattedAddress || 'No Address',
                    isOpen: place.businessStatus === 'OPERATIONAL',
                    // Construct photo URL if photo exists
                    imageUrl: place.photos && place.photos.length > 0
                        ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeight=400&maxWidth=400&key=${GOOGLE_MAPS_API_KEY}`
                        : null
                }));
            }

            console.warn("PlacesService: No 'places' array in response", response.data);
            return [];
        } catch (error) {
            // Extensive logging for debugging
            console.error('PlacesService Error:', error.message);
            if (error.response) {
                console.error('PlacesService API Error Data:', JSON.stringify(error.response.data));
                console.error('PlacesService API Status:', error.response.status);
            }
            return [];
        }
    },
};

export default placesService;
