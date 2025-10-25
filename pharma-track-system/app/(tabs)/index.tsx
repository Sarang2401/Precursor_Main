import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pharma Track System</Text>
      <Text style={styles.subtitle}>Select Your Role</Text>
      <TouchableOpacity
        style={[styles.card, { borderColor: '#2563EB' }]}
        onPress={() => router.push('/(manufacturer)/dashboard')}
      >
        <Text style={styles.icon}>👷</Text>
        <Text style={styles.roleTitle}>MANUFACTURER</Text>
        <Text style={styles.roleDesc}>Create & manage shipments</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.card, { borderColor: '#8B5CF6' }]}
        onPress={() => router.push('/(driver)/dashboard')}
      >
        <Text style={styles.icon}>🚚</Text>
        <Text style={styles.roleTitle}>DRIVER</Text>
        <Text style={styles.roleDesc}>Scan & transport shipments</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.card, { borderColor: '#F59E0B' }]}
        onPress={() => router.push('/(regulator)/dashboard')}
      >
        <Text style={styles.icon}>🦺</Text>
        <Text style={styles.roleTitle}>REGULATOR</Text>
        <Text style={styles.roleDesc}>Monitor & audit shipments</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E40AF', marginBottom: 10 },
  subtitle: { fontSize: 17, color: '#6B7280', marginBottom: 20 },
  card: { width: 300, padding: 20, borderRadius: 12, backgroundColor: '#fff', marginBottom: 18, borderWidth: 2 },
  icon: { fontSize: 32 },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E40AF' },
  roleDesc: { fontSize: 13, color: '#6B7280' }
});
