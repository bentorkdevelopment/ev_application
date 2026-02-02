import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqData = [
    {
        q: "How do I start charging my vehicle?",
        a: "Select a charger, choose a plan or custom power, connect your vehicle, and tap Start Charging from the app."
    },
    {
        q: "What types of chargers are available?",
        a: "We offer AC chargers for regular charging and DC fast chargers for quicker charging."
    },
    {
        q: "How is charging cost calculated?",
        a: "Charging cost is calculated based on energy consumed (kWh) multiplied by the rate per kWh."
    },
    {
        q: "Can I choose custom charging power?",
        a: "Yes, you can select a custom power (kW) depending on charger availability and your vehicle compatibility."
    },
    {
        q: "What payment methods are supported?",
        a: "You can only pay using your wallet balance."
    },
    {
        q: "Is GST included in the charging amount?",
        a: "GST is not added separately to the charging amount; it is deducted from your TopPop wallet balance."
    },
    {
        q: "Will I receive an invoice after charging?",
        a: "The charging invoice is only shown , while the TopPop wallet invoice is automatically sent to your registered email."
    },
    {
        q: "What happens if charging is interrupted?",
        a: "If charging stops due to power or network issues, billing will be calculated only for the energy consumed."
    },
    {
        q: "Can I stop charging anytime?",
        a: "Yes, you can stop charging at any time from the app. Charges apply only for the energy used. An emergency stop button is also available at the charging station."
    },
    {
        q: "What should I do if the charger is unavailable?",
        a: "If a charger is busy or offline, please try another nearby charger or check again after some time."
    },
    {
        q: "Who can I contact for support?",
        a: "You can contact our support team from the Help section or email us at support@bentork.com."
    }
];

const FAQScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFaq = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                {/* Title is displayed below header row in the web design, so keeping this minimal */}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Title Section */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>FAQs</Text>
                    <Text style={styles.subtitle}>Everything you need to know</Text>
                </View>

                {/* FAQ List */}
                <View style={styles.listContainer}>
                    {faqData.map((item, index) => {
                        const isActive = activeIndex === index;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.faqItem, isActive && styles.faqItemActive]}
                                onPress={() => toggleFaq(index)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.questionRow}>
                                    <Text style={styles.questionText}>{item.q}</Text>
                                    <View style={[styles.iconContainer, isActive && styles.iconActive]}>
                                        <ChevronDown
                                            size={20}
                                            color={isActive ? "#39E29B" : "rgba(255, 255, 255, 0.5)"}
                                        />
                                    </View>
                                </View>

                                {isActive && (
                                    <View style={styles.answerContainer}>
                                        <Text style={styles.answerText}>{item.a}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Still have questions?</Text>
                    <Text style={styles.footerEmail}>support@bentork.com</Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Match web bg
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        marginTop: 10,
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    content: {
        paddingBottom: 40,
    },
    titleContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#39E29B',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    listContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    faqItem: {
        backgroundColor: 'rgba(36, 36, 36, 0.9)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 12,
        overflow: 'hidden',
    },
    faqItemActive: {
        backgroundColor: 'rgba(57, 226, 155, 0.08)',
        borderColor: 'rgba(57, 226, 155, 0.4)',
    },
    questionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 20,
    },
    questionText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#fff',
        flex: 1,
        marginRight: 10,
        lineHeight: 22,
    },
    iconContainer: {
        // transform handled by style change or logic if needed, but react native vector icons don't animate rotation automatically without Animated API. 
        // We'll just switch color/icon logic or rely on simple state for now.
    },
    iconActive: {
        transform: [{ rotate: '180deg' }]
    },
    answerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    answerText: {
        fontSize: 14,
        lineHeight: 22,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '300',
    },
    footer: {
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        marginHorizontal: 24,
    },
    footerText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    footerEmail: {
        fontSize: 13,
        color: '#39E29B',
        fontWeight: '500',
    },
});

export default FAQScreen;
