import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    Animated, StatusBar, Dimensions, Platform, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    ChevronRight, ChevronLeft, Check, User, Users, 
    Briefcase, ArrowRight, HelpCircle, X
} from 'lucide-react-native';
import { authService } from '../services/auth';

const { width } = Dimensions.get('window');

const INTERESTS_OPTIONS = [
    'Technology', 'Travel', 'Music', 'Fitness', 'Dining', 
    'Gaming', 'Automotive', 'Sustainability', 'Finance', 'Art',
    'Sports', 'Photography', 'Movies', 'Reading', 'Fashion'
];

const OCCUPATION_OPTIONS = [
    'Private Sector', 'Government Sector', 'Self-Employed', 'Student', 'Other'
];

export default function OnboardingSurveyScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const [showHelp, setShowHelp] = useState(false);
    const totalSteps = 3;

    // Form State
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [occupation, setOccupation] = useState('');

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadExistingData = async () => {
            const data = await authService.getSurveyData();
            if (data) {
                if (data.age) setAge(data.age);
                if (data.gender) setGender(data.gender);
                if (data.interests) setSelectedInterests(data.interests);
                if (data.occupation) setOccupation(data.occupation);
            }
        };
        loadExistingData();
    }, []);

    const nextStep = () => {
        if (step < totalSteps) {
            animateTransition(() => setStep(step + 1), 'next');
        } else {
            handleFinish();
        }
    };

    const prevStep = () => {
        if (step > 1) {
            animateTransition(() => setStep(step - 1), 'prev');
        }
    };

    const animateTransition = (updateState, direction) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { 
                toValue: direction === 'next' ? -50 : 50, 
                duration: 200, 
                useNativeDriver: true 
            })
        ]).start(() => {
            updateState();
            slideAnim.setValue(direction === 'next' ? 50 : -50);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
            ]).start();
        });
    };

    const toggleInterest = (interest) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(prev => prev.filter(i => i !== interest));
        } else if (selectedInterests.length < 5) {
            setSelectedInterests(prev => [...prev, interest]);
        }
    };

    const handleFinish = async () => {
        const surveyData = { age, gender, interests: selectedInterests, occupation };
        await authService.setSurveyData(surveyData);
        
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            const targetScreen = route?.params?.postLoginTarget || 'Home';
            const targetParams = route?.params?.postLoginParams || {};

            navigation.navigate('TermsConsent', { 
                nextScreen: targetScreen, 
                nextParams: targetParams 
            });
        }
    };

    const renderProgressBar = () => {
        const progress = (step / totalSteps) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
        );
    };

    const isStepValid = () => {
        if (step === 1) return age && gender;
        if (step === 2) return selectedInterests.length > 0;
        if (step === 3) return occupation;
        return false;
    };

    const renderHelpModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={showHelp}
            onRequestClose={() => setShowHelp(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <HelpCircle size={24} color="#39E29B" />
                        <Text style={styles.modalTitle}>Why we ask?</Text>
                        <TouchableOpacity onPress={() => setShowHelp(false)}>
                            <X size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalBody}>
                        We collect this information to curate a <Text style={{color: '#39E29B', fontWeight: 'bold'}}>personalized feed</Text> and send relevant notifications tailored to your lifestyle.
                    </Text>
                    <Text style={[styles.modalBody, { marginTop: 12 }]}>
                        We value your digital peace—<Text style={{fontWeight: 'bold', color: '#fff'}}>no spamming, ever.</Text>
                    </Text>
                    <TouchableOpacity 
                        style={styles.modalCloseBtn}
                        onPress={() => setShowHelp(false)}
                    >
                        <Text style={styles.modalCloseBtnText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderStep1 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <Text style={styles.stepSubtitle}>This helps us personalize your experience.</Text>

            <View style={styles.section}>
                <Text style={styles.label}>Your Age</Text>
                <View style={styles.ageGrid}>
                    {['18-25', '26-35', '36-50', '50+'].map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, age === item && styles.selectedChip]}
                            onPress={() => setAge(item)}
                        >
                            <Text style={[styles.chipText, age === item && styles.selectedChipText]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderContainer}>
                    {[
                        { label: 'Male', icon: <User size={24} color={gender === 'Male' ? '#000' : '#888'} /> },
                        { label: 'Female', icon: <User size={24} color={gender === 'Female' ? '#000' : '#888'} /> },
                        { label: 'Other', icon: <Users size={24} color={gender === 'Other' ? '#000' : '#888'} /> }
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.genderCard, gender === item.label && styles.selectedGenderCard]}
                            onPress={() => setGender(item.label)}
                        >
                            {item.icon}
                            <Text style={[styles.genderLabel, gender === item.label && styles.selectedGenderLabel]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Animated.View>
    );

    const renderStep2 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>What are your interests?</Text>
            <Text style={styles.stepSubtitle}>Choose up to 5 interests that define you.</Text>

            <View style={styles.interestsGrid}>
                {INTERESTS_OPTIONS.map((item) => {
                    const isSelected = selectedInterests.includes(item);
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[styles.interestChip, isSelected && styles.selectedInterestChip]}
                            onPress={() => toggleInterest(item)}
                        >
                            <Text style={[styles.interestChipText, isSelected && styles.selectedInterestChipText]}>
                                {item}
                            </Text>
                            {isSelected && <Check size={14} color="#000" style={{marginLeft: 4}} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
            <Text style={styles.limitText}>{selectedInterests.length}/5 selected</Text>
        </Animated.View>
    );

    const renderStep3 = () => (
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Lifestyle details</Text>
            <Text style={styles.stepSubtitle}>Almost there! Just one last thing.</Text>

            <View style={styles.section}>
                <Text style={styles.label}>Occupation</Text>
                <View style={styles.optionsContainer}>
                    {OCCUPATION_OPTIONS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.optionRow, occupation === item && styles.selectedOptionRow]}
                            onPress={() => setOccupation(item)}
                        >
                            <Briefcase size={20} color={occupation === item ? '#39E29B' : '#888'} />
                            <Text style={[styles.optionText, occupation === item && styles.selectedOptionText]}>{item}</Text>
                            <View style={[styles.radio, occupation === item && styles.radioSelected]}>
                                {occupation === item && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={prevStep} disabled={step === 1} style={styles.backButton}>
                    {step > 1 ? <ChevronLeft size={24} color="#fff" /> : <View style={{width: 24}} />}
                </TouchableOpacity>
                {renderProgressBar()}
                <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelp(true)}>
                    <HelpCircle size={24} color="#888" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </ScrollView>

            {renderHelpModal()}

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.nextButton, !isStepValid() && styles.disabledButton]}
                    onPress={nextStep}
                    disabled={!isStepValid()}
                >
                    <Text style={styles.nextButtonText}>
                        {step === totalSteps ? 'Finish' : 'Next Step'}
                    </Text>
                    {step < totalSteps && <ChevronRight size={20} color="#000" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    spacer: {
        width: 40,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#39E29B',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#888',
        marginBottom: 32,
    },
    section: {
        marginBottom: 32,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    ageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedChip: {
        backgroundColor: '#39E29B',
        borderColor: '#39E29B',
    },
    chipText: {
        color: '#888',
        fontSize: 15,
        fontWeight: '500',
    },
    selectedChipText: {
        color: '#000',
        fontWeight: 'bold',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    genderCard: {
        flex: 1,
        height: 100,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedGenderCard: {
        backgroundColor: '#39E29B',
        borderColor: '#39E29B',
    },
    genderLabel: {
        marginTop: 8,
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    selectedGenderLabel: {
        color: '#000',
        fontWeight: 'bold',
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    interestChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedInterestChip: {
        backgroundColor: '#39E29B',
        borderColor: '#39E29B',
    },
    interestChipText: {
        color: '#888',
        fontSize: 14,
    },
    selectedInterestChipText: {
        color: '#000',
        fontWeight: 'bold',
    },
    limitText: {
        marginTop: 16,
        fontSize: 14,
        color: '#666',
        textAlign: 'right',
    },
    optionsContainer: {
        gap: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedOptionRow: {
        borderColor: '#39E29B',
        backgroundColor: 'rgba(57, 226, 155, 0.05)',
    },
    optionText: {
        flex: 1,
        marginLeft: 12,
        color: '#888',
        fontSize: 16,
    },
    selectedOptionText: {
        color: '#fff',
        fontWeight: '600',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#39E29B',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#39E29B',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        backgroundColor: '#121212',
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    nextButton: {
        flexDirection: 'row',
        backgroundColor: '#39E29B',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#39E29B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#1E7A4E',
        opacity: 0.5,
    },
    nextButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    helpButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        flex: 1,
        marginLeft: 12,
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        color: '#aaa',
        fontSize: 16,
        lineHeight: 24,
    },
    modalCloseBtn: {
        backgroundColor: '#39E29B',
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    modalCloseBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
