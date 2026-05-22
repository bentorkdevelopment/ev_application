import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Linking, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Phone, Mail, MessageSquare, HelpCircle,
    CheckCircle, ChevronRight, AlertTriangle, Sparkles
} from 'lucide-react-native';
import { Colors, Fonts } from '../styles/GlobalStyles';
import { authService } from '../services/auth';
import { useAlert } from '../context/AlertContext';

export default function ContactsScreen({ navigation }) {
    const { showAlert } = useAlert();
    const [user, setUser] = useState(null);
    const [category, setCategory] = useState('Charging'); // 'Charging' | 'Billing' | 'App' | 'Other'
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } catch (error) {
            console.log("Failed to load user info:", error);
        }
    };

    const handleCallSupport = () => {
        Linking.openURL('tel:+918237943808').catch(() => {
            showAlert("Error", "Unable to launch dialer. Please call +91 82379 43808 directly.");
        });
    };

    const handleEmailSupport = () => {
        const subject = encodeURIComponent(`[Bentork Support] Issue with ${category}`);
        const body = encodeURIComponent(
            `Hi Bentork Support Team,\n\nI am experiencing an issue regarding: ${category}.\n\n` +
            (user ? `User Details:\nName: ${user.name || 'N/A'}\nEmail: ${user.email || 'N/A'}\n\n` : '') +
            `Issue Description:\n${message || '[Describe your issue here]'}\n\nSent from Bentork EV App`
        );
        Linking.openURL(`mailto:support@bentork.com?subject=${subject}&body=${body}`).catch(() => {
            showAlert("Error", "Unable to open email client. Please email support@bentork.com directly.");
        });
    };

    const handleWhatsAppSupport = () => {
        const whatsappMsg = encodeURIComponent(
            `Hi Bentork Support team, I have a query/issue regarding ${category}.\n\nDescription: ${message || 'Need general assistance'}`
        );
        Linking.openURL(`https://wa.me/918237943808?text=${whatsappMsg}`).catch(() => {
            showAlert("Error", "Unable to launch WhatsApp. Please contact +91 82379 43808.");
        });
    };

    const handleSubmitTicket = async () => {
        if (!message.trim()) {
            showAlert("Required", "Please write a brief description of the issue before submitting.");
            return;
        }

        setIsSubmitting(true);
        // Simulate API network request
        setTimeout(() => {
            setIsSubmitting(false);
            setMessage('');
            showAlert(
                "Support Ticket Raised",
                "Your issue has been filed. Our tech team is reviewing it and will reach out to you via email shortly.",
                [{ text: "OK" }]
            );
        }, 1500);
    };

    const categories = [
        { id: 'Charging', label: 'Charging', color: Colors.primaryContainer },
        { id: 'Billing', label: 'Payment', color: Colors.statusOrange || '#FF9800' },
        { id: 'App', label: 'App Bug', color: Colors.statusRed || '#FF4213' },
        { id: 'Other', label: 'Other', color: '#aaa' }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support Center</Text>
                <View style={{ width: 40 }} /> {/* Balanced spacer */}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Welcome Banner */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeTitle}>{user?.name ? `How can we help, ${user.name.split(' ')[0]}?` : 'How can we help you?'}</Text>
                        <Text style={styles.welcomeSubtitle}>Select a category below or contact our official team channels. Available 24/7.</Text>
                    </View>

                    {/* Support Channels Grid */}
                    <View style={styles.gridContainer}>
                        {/* Phone Card */}
                        <TouchableOpacity style={styles.channelCard} onPress={handleCallSupport} activeOpacity={0.8}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(57, 226, 155, 0.1)' }]}>
                                <Phone size={24} color={Colors.primaryContainer} />
                            </View>
                            <Text style={styles.cardMainLabel}>Call Helpline</Text>
                            <Text style={styles.cardValue} numberOfLines={1}>+91 82379 43808</Text>
                        </TouchableOpacity>

                        {/* Email Card */}
                        <TouchableOpacity style={styles.channelCard} onPress={handleEmailSupport} activeOpacity={0.8}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(57, 226, 155, 0.1)' }]}>
                                <Mail size={24} color={Colors.primaryContainer} />
                            </View>
                            <Text style={styles.cardMainLabel}>Email Support</Text>
                            <Text style={styles.cardValue} numberOfLines={1}>support@bentork.com</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Support Interactive Options List */}
                    <View style={styles.listCard}>
                        <TouchableOpacity style={styles.listItem} onPress={handleWhatsAppSupport} activeOpacity={0.7}>
                            <View style={[styles.listIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.1)' }]}>
                                <MessageSquare size={20} color={Colors.statusGreen || '#00E676'} />
                            </View>
                            <View style={styles.listContent}>
                                <Text style={styles.listTitle}>Chat on WhatsApp</Text>
                                <Text style={styles.listSubText}>Instant chat support and queries</Text>
                            </View>
                            <ChevronRight size={18} color="#555" />
                        </TouchableOpacity>

                        <View style={styles.listDivider} />

                        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('FAQ')} activeOpacity={0.7}>
                            <View style={[styles.listIconBox, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                                <HelpCircle size={20} color={Colors.statusOrange || '#FF9800'} />
                            </View>
                            <View style={styles.listContent}>
                                <Text style={styles.listTitle}>Browse FAQs</Text>
                                <Text style={styles.listSubText}>Search solved problems immediately</Text>
                            </View>
                            <ChevronRight size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {/* Support Form Section */}
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionTitle}>File a Technical Issue</Text>

                        {/* Category Selector Pills */}
                        <Text style={styles.inputLabel}>Select Category</Text>
                        <View style={styles.categoryRow}>
                            {categories.map((cat) => {
                                const selected = category === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.catChip,
                                            selected && { backgroundColor: '#ffffff', borderColor: '#ffffff' }
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.catChipText, selected && { color: '#0F0F0F', fontWeight: '800' }]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Message Input */}
                        <Text style={styles.inputLabel}>Write Message / Details</Text>
                        <TextInput
                            style={[
                                styles.messageInput,
                                isFocused && { borderColor: Colors.primaryContainer }
                            ]}
                            placeholder="Please explain the issue (e.g. Charger ID, Station location, wallet discrepancy)..."
                            placeholderTextColor="#666"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />

                        {/* Submit Button (Disabled - Under Development) */}
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                styles.disabledBtn
                            ]}
                            disabled={true}
                            activeOpacity={1}
                        >
                            <Text style={[styles.submitBtnText, styles.disabledBtnText]}>Submit Ticket (Under Development)</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.primary,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 15,
    },
    welcomeSection: {
        marginBottom: 20,
    },
    supportLabel: {
        color: Colors.primaryContainer,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    welcomeTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Fonts.primary,
        marginTop: 6,
        marginBottom: 8,
    },
    welcomeSubtitle: {
        color: '#aaa',
        fontSize: 13,
        lineHeight: 18,
        fontFamily: Fonts.primary,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    channelCard: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#252528',
        alignItems: 'flex-start',
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardMainLabel: {
        color: '#888',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    cardValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardSubText: {
        color: Colors.primaryContainer,
        fontSize: 10,
        fontWeight: '600',
    },
    listCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#252528',
        marginBottom: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    listIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    listSubText: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    listDivider: {
        height: 1,
        backgroundColor: '#252528',
    },
    formContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#252528',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Fonts.primary,
        marginBottom: 15,
    },
    inputLabel: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    catChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#252528',
        backgroundColor: '#0F0F0F',
    },
    catChipText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '500',
    },
    messageInput: {
        height: 100,
        backgroundColor: '#0F0F0F',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#252528',
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    submitBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#0F0F0F',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: Fonts.primary,
    },
    disabledBtn: {
        backgroundColor: '#252528',
        borderColor: '#2D2D30',
        borderWidth: 1,
        opacity: 0.5,
    },
    disabledBtnText: {
        color: '#666',
    },
});
