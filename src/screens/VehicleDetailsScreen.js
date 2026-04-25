import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Car, Battery, Zap, Save, CheckCircle, Trash2 } from 'lucide-react-native';
import { Colors } from '../styles/GlobalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VEHICLE_STORAGE_KEY = '@user_vehicle_details';

export default function VehicleDetailsScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // List State
    const [vehicles, setVehicles] = useState([]);
    const [isAddingNew, setIsAddingNew] = useState(false);

    // Form State
    const [vehicleType, setVehicleType] = useState('4W'); // 2W, 3W, 4W
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [batteryCapacity, setBatteryCapacity] = useState('');
    const [connectorType, setConnectorType] = useState('CCS 2');

    useEffect(() => {
        loadVehicleDetails();
    }, []);

    const loadVehicleDetails = async () => {
        setLoading(true);
        try {
            const stored = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (Array.isArray(data)) {
                    setVehicles(data);
                } else if (data && data.make) {
                    // Migrate single object to array
                    const initialVehicle = { ...data, id: Date.now().toString() };
                    setVehicles([initialVehicle]);
                    await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify([initialVehicle]));
                }
            }
        } catch (e) {
            console.error("Failed to load vehicle details", e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setVehicleType('4W');
        setMake('');
        setModel('');
        setRegistrationNumber('');
        setBatteryCapacity('');
        setConnectorType('CCS 2');
        setIsAddingNew(false);
    };

    const handleSave = async () => {
        if (!make || !model || !registrationNumber) {
            Alert.alert("Missing Information", "Please fill in Make, Model and Registration Number.");
            return;
        }

        setSaving(true);
        try {
            const newVehicle = {
                id: Date.now().toString(),
                vehicleType,
                make,
                model,
                registrationNumber,
                batteryCapacity,
                connectorType,
                updatedAt: new Date().toISOString()
            };

            const updatedList = [...vehicles, newVehicle];
            await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updatedList));
            setVehicles(updatedList);

            // Simulate API delay
            setTimeout(() => {
                setSaving(false);
                Alert.alert("Success", "Vehicle added successfully!");
                resetForm();
            }, 500);

        } catch (e) {
            console.error("Failed to save", e);
            Alert.alert("Error", "Could not save details.");
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Vehicle",
            "Are you sure you want to remove this vehicle?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updatedList = vehicles.filter(v => v.id !== id);
                            setVehicles(updatedList);
                            await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updatedList));
                        } catch (e) {
                            console.error("Failed to delete", e);
                            Alert.alert("Error", "Could not delete vehicle.");
                        }
                    }
                }
            ]
        );
    };

    const SelectableChip = ({ label, value, selectedValue, onSelect }) => (
        <TouchableOpacity
            style={[styles.chip, selectedValue === value && styles.chipActive]}
            onPress={() => onSelect(value)}
        >
            <Text style={[styles.chipText, selectedValue === value && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderVehicleList = () => (
        <View>
            {vehicles.length === 0 ? (
                <View style={styles.emptyState}>
                    <Car size={48} color="#333" />
                    <Text style={styles.emptyText}>No vehicles added yet</Text>
                    <Text style={styles.emptySubText}>Add your EV details to get started</Text>
                </View>
            ) : (
                vehicles.map((item) => (
                    <View key={item.id} style={styles.vehicleCard}>
                        <View style={styles.vehicleIconContainer}>
                            <Car size={24} color={Colors.white} />
                        </View>
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>{item.make} {item.model}</Text>
                            <Text style={styles.vehicleReg}>{item.registrationNumber}</Text>
                            <Text style={styles.vehicleSpecs}>
                                {item.vehicleType} • {item.connectorType}
                                {item.batteryCapacity ? ` • ${item.batteryCapacity} kWh` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Trash2 size={20} color="#FF5252" />
                        </TouchableOpacity>
                    </View>
                ))
            )}

            <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingNew(true)}>
                <Text style={styles.addBtnText}>+ Add New Vehicle</Text>
            </TouchableOpacity>
        </View>
    );

    const renderForm = () => (
        <View>
            <Text style={styles.sectionTitle}>Vehicle Type</Text>
            <View style={styles.row}>
                <SelectableChip label="2 Wheeler" value="2W" selectedValue={vehicleType} onSelect={setVehicleType} />
                <SelectableChip label="3 Wheeler" value="3W" selectedValue={vehicleType} onSelect={setVehicleType} />
                <SelectableChip label="4 Wheeler" value="4W" selectedValue={vehicleType} onSelect={setVehicleType} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Make (Brand)</Text>
                <View style={styles.inputWrapper}>
                    <Car size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Tata, Tesla, MG"
                        placeholderTextColor="#555"
                        value={make}
                        onChangeText={setMake}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Model</Text>
                <View style={styles.inputWrapper}>
                    <Car size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Nexon EV, Model 3"
                        placeholderTextColor="#555"
                        value={model}
                        onChangeText={setModel}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration Number</Text>
                <View style={styles.inputWrapper}>
                    <Text style={[styles.inputIcon, { color: '#666', fontWeight: 'bold' }]}>#</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. MH 12 AB 1234"
                        placeholderTextColor="#555"
                        value={registrationNumber}
                        onChangeText={setRegistrationNumber}
                        autoCapitalize="characters"
                    />
                </View>
            </View>

            <Text style={styles.sectionTitle}>Charging Specs</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Battery Capacity (kWh) - Optional</Text>
                <View style={styles.inputWrapper}>
                    <Battery size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 40.5"
                        placeholderTextColor="#555"
                        value={batteryCapacity}
                        onChangeText={setBatteryCapacity}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <Text style={styles.label}>Connector Type</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
                {['CCS 2', 'Type 2', 'CHAdeMO', 'GB/T'].map(type => (
                    <SelectableChip key={type} label={type} value={type} selectedValue={connectorType} onSelect={setConnectorType} />
                ))}
            </View>

            <View style={{ height: 40 }} />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <>
                        <Save size={20} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.saveBtnText}>Save Vehicle</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                        if (isAddingNew && vehicles.length > 0) {
                            setIsAddingNew(false);
                        } else {
                            navigation.goBack();
                        }
                    }}
                >
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isAddingNew ? 'Add Vehicle' : 'My Vehicles'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : isAddingNew || vehicles.length === 0 ? renderForm() : renderVehicleList()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.matteBlack,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Colors.matteBlack,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
        paddingBottom: 100
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#333',
    },
    chipActive: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
    },
    chipText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#333',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    saveBtn: {
        backgroundColor: Colors.primaryContainer || '#00E676', // Fallback
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelBtn: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    cancelBtnText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600'
    },
    // List Styles
    vehicleCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333'
    },
    vehicleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    vehicleReg: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4
    },
    vehicleSpecs: {
        color: '#888',
        fontSize: 12
    },
    deleteBtn: {
        padding: 10,
    },
    addBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        marginTop: 10
    },
    addBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        opacity: 0.5
    },
    emptyText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16
    },
    emptySubText: {
        color: '#888',
        fontSize: 14,
        marginTop: 8
    }
});
