import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, Platform, PanResponder, Easing, Modal, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, ChevronRight, Wallet, Settings, HelpCircle, MessageCircle, Info, FileText, LogOut, MapPin, Mail, Phone, CheckCircle, Users } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import { authService } from '../services/auth';



const MenuItem = ({ icon: Icon, label, onPress, active = false }) => (
    <TouchableOpacity
        style={[styles.menuItem, active && styles.menuItemActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
            <Icon size={22} color={active ? Colors.statusGreen : '#aaa'} />
        </View>
        <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
    </TouchableOpacity>
);

export default function SideMenu({ visible, onClose, navigation }) {
    const { width } = useWindowDimensions();
    const DRAWER_WIDTH = Math.min(width * 0.85, 340);

    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);

    const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-1000)).current; // Start hidden (large negative value)
    const fadeAnim = useRef(new Animated.Value(0)).current; // Overlay fade

    // PanResponder for smooth drag to close
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only capture horizontal swipes
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (evt, gestureState) => {
                // Ensure we don't drag past 0 (fully open)
                if (gestureState.dx < 0) {
                    slideAnim.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // If dragged more than 1/3 of drawer width or high velocity, close it
                if (gestureState.dx < -DRAWER_WIDTH / 3 || gestureState.vx < -0.5) {
                    onClose();
                } else {
                    // Snap back to open
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            loadUser();
            // Reset to hidden position before animating in if it was way off
            if (slideAnim._value < -DRAWER_WIDTH) {
                slideAnim.setValue(-DRAWER_WIDTH);
            }
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.poly(4)),
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.poly(4)),
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.poly(4)),
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.poly(4)),
                }),
            ]).start();
        }
    }, [visible, DRAWER_WIDTH]);



    const loadUser = async () => {
        const userData = await authService.getUser();
        setUser(userData);
    };

    const handleNavigation = (screen, params) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen, params);
        }, 300);
    };

    const handleBuyStation = () => {
        // Don't close side menu immediately, just show modal over it? 
        // Or close side menu then show modal. Let's keep side menu open or close it.
        // User asked for a dialog. 
        setIsBuyModalVisible(true);
    };

    const closeBuyModal = () => {
        setIsBuyModalVisible(false);
    };

    const contactWhatsApp = () => {
        const phoneNumber = "+918237943808";
        const message = "Hi Bentork team, I'm interested in buying/hosting an EV charging station for my property. Please guide me through the process.";
        const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(err => console.error("Failed to open WhatsApp", err));
    };

    const handleLogout = async () => {
        onClose();
        setTimeout(async () => {
            await authService.logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }, 300);
    };

    // Optimized: Keep mounted to avoid re-mount delay
    // if (!visible && slideAnim._value === -DRAWER_WIDTH) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            {/* Drawer */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.drawer,
                    {
                        transform: [{ translateX: slideAnim }],
                        width: DRAWER_WIDTH,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom
                    }
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        tintColor="#ffffffff"
                    />
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* User Profile Summary */}
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        {user?.imageUrl ? (
                            <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
                        ) : (
                            <User size={24} color="#ccc" />
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Guest User'}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{user?.email || 'Sign in'}</Text>
                    </View>
                    {/* Removed Redirect Chevron */}
                </View>

                <View style={styles.divider} />

                {/* Menu Items */}
                <ScrollView
                    style={styles.menuContainer}
                    contentContainerStyle={{ flexGrow: 1, paddingVertical: 10 }}
                    showsVerticalScrollIndicator={false}
                >

                    <MenuItem icon={Wallet} label="Wallet" onPress={() => handleNavigation('Wallet')} />
                    <MenuItem icon={Settings} label="Settings" onPress={() => handleNavigation('Settings')} />

                    <View style={[styles.divider, { marginVertical: 10, height: 1, backgroundColor: '#333' }]} />

                    <MenuItem icon={MapPin} label="Buy Station" onPress={handleBuyStation} />
                    <MenuItem icon={HelpCircle} label="FAQs" onPress={() => handleNavigation('FAQ')} />
                    <MenuItem icon={Users} label="Contacts" onPress={() => handleNavigation('Contacts')} />
                    <MenuItem icon={Info} label="About" onPress={() => handleNavigation('About')} />
                    <MenuItem icon={FileText} label="Terms & Conditions" onPress={() => handleNavigation('Terms')} />

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={20} color={Colors.statusRed} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>



            </Animated.View>

            {/* Buy Station Modal */}
            <Modal
                transparent={true}
                visible={isBuyModalVisible}
                animationType="fade"
                onRequestClose={closeBuyModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Buy Station</Text>
                            <TouchableOpacity onPress={closeBuyModal} style={styles.closeModalBtn}>
                                <X size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody}>
                            <Text style={styles.modalSubtitle}>Join our network and earn by hosting an EV charging station.</Text>

                            <View style={styles.stepsContainer}>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={20} color={Colors.primaryContainer} style={styles.stepIcon} />
                                    <Text style={styles.stepText}>Contact our support team with your property details.</Text>
                                </View>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={20} color={Colors.primaryContainer} style={styles.stepIcon} />
                                    <Text style={styles.stepText}>Our team will verify the location and feasibility.</Text>
                                </View>
                                <View style={styles.stepRow}>
                                    <CheckCircle size={20} color={Colors.primaryContainer} style={styles.stepIcon} />
                                    <Text style={styles.stepText}>Once approved, we will assist with installation and setup.</Text>
                                </View>
                            </View>

                            {/* <View style={styles.contactBox}>
                                <Text style={styles.contactLabel}>Chat with us on WhatsApp:</Text>
                                <TouchableOpacity onPress={contactWhatsApp} style={styles.emailRow}>
                                    <MessageCircle size={22} color={Colors.primaryContainer} />
                                    <Text style={styles.emailText}>Message on WhatsApp</Text>
                                </TouchableOpacity>
                            </View> */}

                            <TouchableOpacity style={styles.primaryBtn} onPress={contactWhatsApp}>
                                <Text style={styles.primaryBtnText}>Contact on WhatsApp</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#181818',
        borderRightWidth: 1,
        borderRightColor: '#333',
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    logo: {
        width: 100,
        height: 35,
    },
    closeBtn: {
        padding: 5,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#202020',
        marginBottom: 5,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#444'
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    userEmail: {
        color: '#888',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#252525',
        marginHorizontal: 0,
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
        marginRight: 15,
    },
    iconContainerActive: {
        // 
    },
    menuLabel: {
        color: '#ccc',
        fontSize: 15,
        fontWeight: '500',
    },
    menuLabelActive: {
        color: Colors.statusGreen,
        fontWeight: '700',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginTop: 10,
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        marginBottom: 20,
    },
    logoutText: {
        color: Colors.statusRed, // Red
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 15,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    closeModalBtn: {
        padding: 4
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold'
    },
    modalBody: {
        alignItems: 'flex-start'
    },
    modalSubtitle: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20
    },
    stepsContainer: {
        marginBottom: 24,
        width: '100%'
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    stepIcon: {
        marginTop: 2,
        marginRight: 12
    },
    stepText: {
        color: '#eee',
        fontSize: 14,
        flex: 1,
        lineHeight: 20
    },
    contactBox: {
        backgroundColor: '#252525',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20
    },
    contactLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 8
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    emailText: {
        color: '#fff', // or Colors.primaryContainer
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline'
    },
    primaryBtn: {
        backgroundColor: Colors.primaryContainer,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    primaryBtnText: {
        color: Colors.matteBlack,
        fontSize: 16,
        fontWeight: 'bold'
    }
});
