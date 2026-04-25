import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

const StarRating = ({ rating, size = 16, interactive = false, onRatingChange, style }) => {
    const [currentRating, setCurrentRating] = useState(rating);

    const handlePress = (newRating) => {
        if (interactive && onRatingChange) {
            setCurrentRating(newRating);
            onRatingChange(newRating);
        }
    };

    return (
        <View style={[styles.container, style]}>
            {[1, 2, 3, 4, 5].map((star) => {
                const isFull = star <= (interactive ? currentRating : rating);
                const isHalf = !interactive && star > rating && star - 1 < rating; // Simple half star logic if needed, currently treating as full/empty based on floor

                return (
                    <TouchableOpacity
                        key={star}
                        disabled={!interactive}
                        onPress={() => handlePress(star)}
                        style={styles.starContainer}
                    >
                        <Star
                            size={size}
                            fill={isFull ? "#FFD700" : "transparent"} // Gold fill if active
                            color={isFull ? "#FFD700" : "#555"} // Gold border if active, otherwise dark grey
                            strokeWidth={isFull ? 0 : 2}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starContainer: {
        marginRight: 2,
    },
});

export default StarRating;
