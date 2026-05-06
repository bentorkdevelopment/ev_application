import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import StarRating from './StarRating';
import { Colors } from '../styles/GlobalStyles';
import { X } from 'lucide-react-native';
import { reviewsApi } from '../services/api';

const { width } = Dimensions.get('window');

const AddReviewModal = ({ visible, onClose, stationId, existingReview, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const progress = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            progress.value = withTiming(1, { duration: 200 });
        } else {
            progress.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const cardStyle = useAnimatedStyle(() => {
        const translateY = interpolate(progress.value, [0, 1], [100, 0], Extrapolation.CLAMP);
        const scale = interpolate(progress.value, [0, 1], [0.9, 1], Extrapolation.CLAMP);
        const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP);

        return {
            opacity,
            transform: [
                { translateY: withSpring(translateY, { damping: 1150, stiffness: 1000 }) },
                { scale: withSpring(scale, { damping: 1150, stiffness: 1000 }) }
            ],
        };
    });

    useEffect(() => {
        if (visible) {
            if (existingReview) {
                setRating(existingReview.rating || 0);
                // Check all possible fields for review text
                const text = existingReview.review_text ||
                    existingReview.comment ||
                    existingReview.text ||
                    existingReview.description ||
                    '';
                setComment(text);
            } else {
                setRating(0);
                setComment('');
            }
            setError(null);
        }
    }, [visible, existingReview]);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please select a star rating");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const reviewData = {
                rating,
                ratingValue: rating, // Optional fallback
                review_text: comment.trim(),
                comment: comment.trim(),
                reviewText: comment.trim(),
                description: comment.trim(),
                text: comment.trim(),
                stationId
            };

            let result;
            if (existingReview) {
                // UPDATE
                result = await reviewsApi.updateReview(existingReview.id, reviewData);
            } else {
                // CREATE
                result = await reviewsApi.createReview(reviewData);
            }

            if (result) {
                onReviewSubmitted(result);
                onClose();
            }
        } catch (err) {
            console.error("Submission Failed:", err);
            setError(err.userMessage || "Failed to submit review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.modalContainer, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{existingReview ? "Edit Review" : "Write a Review"}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#aaa" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.label}>Rate your experience</Text>
                        <View style={styles.starContainer}>
                            <StarRating
                                rating={rating}
                                size={32}
                                interactive={true}
                                onRatingChange={setRating}
                                style={{ gap: 8 }}
                            />
                        </View>

                        <Text style={styles.label}>Share your feedback (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tell us about your charging session..."
                            placeholderTextColor="#666"
                            multiline
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{comment.length}/500</Text>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>{existingReview ? "Update Review" : "Submit Review"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        gap: 16,
    },
    label: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 8,
    },
    starContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 14,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
    },
    charCount: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
        marginTop: -12,
        marginBottom: 12,

    },
    errorText: {
        color: Colors.statusRed,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    submitBtn: {
        backgroundColor: Colors.primaryContainer,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }

});

export default AddReviewModal;
