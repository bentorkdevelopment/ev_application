import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScanIcon from '../assets/icons/Rounded Fill/qr_code_scanner_24dp_E3E3E3_FILL1_wght400_GRAD0_opsz24.svg';

export default function QRScannerScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ScanIcon width={64} height={64} fill="#fff" />
                <Text style={styles.text}>Scanner Feature</Text>
                <Text style={styles.subText}>Camera integration required.</Text>

                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    subText: {
        color: '#aaa',
        fontSize: 16,
        marginTop: 10,
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#00E676',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
