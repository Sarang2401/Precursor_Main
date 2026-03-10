import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../config/AuthContext';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter username and password');
            return;
        }

        setLoading(true);
        const result = await login(username, password);
        setLoading(false);

        if (result.success) {
            // Navigate based on user role
            const { role } = result.user;
            if (role === 'manufacturer') {
                router.replace('/(manufacturer)');
            } else if (role === 'driver') {
                router.replace('/(driver)/dashboard');
            } else if (role === 'regulator') {
                router.replace('/(regulator)/dashboard');
            }
        } else {
            Alert.alert('Login Failed', result.error || 'Invalid credentials');
        }
    };

    const quickLogin = async (role) => {
        const credentials = {
            manufacturer: { username: 'manufacturer', password: 'manu123' },
            driver: { username: 'driver', password: 'driver123' },
            regulator: { username: 'regulator', password: 'reg123' },
        };

        const { username: u, password: p } = credentials[role];

        // Fill fields so the user sees what was used
        setUsername(u);
        setPassword(p);

        // Login directly with the credentials — don't rely on state update timing
        setLoading(true);
        const result = await login(u, p);
        setLoading(false);

        if (result.success) {
            const { role: userRole } = result.user;
            if (userRole === 'manufacturer') {
                router.replace('/(manufacturer)');
            } else if (userRole === 'driver') {
                router.replace('/(driver)/dashboard');
            } else if (userRole === 'regulator') {
                router.replace('/(regulator)/dashboard');
            }
        } else {
            Alert.alert('Login Failed', result.error || 'Invalid credentials');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Precursor Login</Text>
            <Text style={styles.subtitle}>Pharmaceutical Supply Chain Tracking</Text>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.quickLogin}>
                <Text style={styles.quickLoginTitle}>Quick Login (Demo)</Text>
                <View style={styles.quickButtonsRow}>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#059669' }]}
                        onPress={() => quickLogin('manufacturer')}
                    >
                        <Text style={styles.quickButtonText}>👷 Manufacturer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#2563EB' }]}
                        onPress={() => quickLogin('driver')}
                    >
                        <Text style={styles.quickButtonText}>🚚 Driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#D97706' }]}
                        onPress={() => quickLogin('regulator')}
                    >
                        <Text style={styles.quickButtonText}>🦺 Regulator</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1E40AF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 40,
    },
    form: {
        width: '100%',
        maxWidth: 400,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    button: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    quickLogin: {
        marginTop: 40,
        width: '100%',
        maxWidth: 400,
    },
    quickLoginTitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    quickButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    quickButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    quickButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
