import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    FlatList, Image, ActivityIndicator, SectionList, ActionSheetIOS, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Phone, Mail, MessageSquare, ChevronLeft, User as UserIcon, Star, Filter } from 'lucide-react-native';
import { Colors, Fonts, GlobalStyles } from '../styles/GlobalStyles';
import { contactService } from '../services/contactService';
import { useAlert } from '../context/AlertContext';
import AddContactModal from '../components/AddContactModal'; // We'll create this later or just inline it

export default function ContactsScreen({ navigation }) {
    const { showAlert } = useAlert();
    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'favorites'
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        setIsLoading(true);
        try {
            const data = await contactService.getContacts();
            setContacts(data);
        } catch (error) {
            showAlert("Error", "Failed to load contacts");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
    };

    const groupedContacts = useMemo(() => {
        let filtered = contacts.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  c.phone.includes(searchQuery) || 
                                  c.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterMode === 'favorites' ? c.isFavorite : true;
            return matchesSearch && matchesFilter;
        });

        // Grouping logic (A-Z)
        const groups = {};
        for (const contact of filtered) {
            const firstLetter = contact.name.charAt(0).toUpperCase();
            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(contact);
        }

        const sections = Object.keys(groups).sort().map(letter => ({
            title: letter,
            data: groups[letter].sort((a, b) => a.name.localeCompare(b.name))
        }));

        // If Favorites mode or no search, maybe add Favorites group at top? 
        // We'll stick to simple A-Z for now, user can toggle "Favorites" only.
        return sections;
    }, [contacts, searchQuery, filterMode]);

    const handleContactPress = (contact) => {
        navigation.navigate('ContactDetails', { contactId: contact.id, contact });
    };

    const handleLongPress = (contact) => {
        showAlert(
            "Quick Actions",
            `Choose an action for ${contact.name}`,
            [
                { text: "Call", onPress: () => console.log('Calling', contact.phone) },
                { text: "Message", onPress: () => console.log('Messaging', contact.phone) },
                { text: "Email", onPress: () => console.log('Emailing', contact.email) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const toggleFavorite = async (id) => {
        const updatedContacts = await contactService.toggleFavorite(id);
        setContacts(updatedContacts);
    };

    const handleAddContact = async (contactData) => {
        const newContact = await contactService.addContact(contactData);
        setContacts([...contacts, newContact]);
        setIsAddModalVisible(false);
        showAlert("Success", "Contact added successfully.");
    };

    const renderContactItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.contactCard} 
            onPress={() => handleContactPress(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                {item.status === 'online' && <View style={styles.statusIndicator} />}
            </View>

            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactSub}>{item.phone}</Text>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleFavorite(item.id)}>
                <Star size={20} color={item.isFavorite ? '#FFD700' : '#666'} fill={item.isFavorite ? '#FFD700' : 'transparent'} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contacts</Text>
                <TouchableOpacity onPress={() => setFilterMode(filterMode === 'all' ? 'favorites' : 'all')}>
                    <Star size={24} color={filterMode === 'favorites' ? Colors.primaryContainer : '#fff'} fill={filterMode === 'favorites' ? Colors.primaryContainer : 'transparent'} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : groupedContacts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No contacts found.</Text>
                </View>
            ) : (
                <SectionList
                    sections={groupedContacts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderContactItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={true}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => setIsAddModalVisible(true)}
            >
                <Plus size={28} color="#000" />
            </TouchableOpacity>

            {isAddModalVisible && (
                <AddContactModal 
                    visible={isAddModalVisible} 
                    onClose={() => setIsAddModalVisible(false)} 
                    onSave={handleAddContact} 
                />
            )}
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
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: Fonts.primary,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        fontFamily: Fonts.primary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        backgroundColor: '#0F0F0F',
        paddingVertical: 8,
        marginTop: 10,
    },
    sectionHeaderText: {
        color: Colors.primaryContainer,
        fontSize: 14,
        fontWeight: 'bold',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 15,
        marginBottom: 10,
    },
    avatarContainer: {
        marginRight: 15,
        position: 'relative',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.statusGreen || '#00E676',
        borderWidth: 2,
        borderColor: '#1C1C1E',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    contactSub: {
        color: '#888',
        fontSize: 13,
    },
    actionBtn: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
});
