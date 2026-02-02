import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';

const AboutScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const appVersion = "1.0.0"; // Replace with actual version logic if available

    // Use a placeholder if about.png is not available, or assume it will be there.
    // For now, using a require that might fail if I didn't successfully copy it.
    // So I will use the locally available logo_inverted.png as a safe placeholder 
    // but name the variable aboutImage so it's easy to swap.
    const aboutImage = require('../assets/images/logo_inverted.png');

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About Us</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={aboutImage}
                        style={styles.image}
                        resizeMode="cover" // or contain depending on the image aspect ratio
                    />
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={styles.paragraph}>
                        Bentork Industries is a leading manufacturer of Lithium-ion and LFP
                        battery packs in India with over five years of experience delivering
                        safe, high-performance, and long-lasting energy solutions for EVs,
                        solar, industrial, and other applications.
                    </Text>
                    <Text style={styles.paragraph}>
                        Building on this expertise, we are expanding into EV charging
                        infrastructure, providing safe, reliable, and user-friendly charging
                        experiences with smart technology, real-time monitoring, and seamless
                        digital payments.
                    </Text>
                    <Text style={styles.paragraph}>
                        Our commitment: “Connecting to the Modern World” through innovation,
                        quality, and accessible energy solutions for businesses and everyday
                        users.
                    </Text>
                </View>

                {/* Version Number */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>Version {appVersion}</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginTop: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: '#1E1E1E', // Placeholder background
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        marginBottom: 32,
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 16,
        textAlign: 'justify',
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    versionText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
});

export default AboutScreen;
