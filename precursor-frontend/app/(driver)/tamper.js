import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TamperScreen() {
  const [tampered, setTampered] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tamper Shipment Simulation</Text>
      <TouchableOpacity
        style={[styles.flagBtn, tampered ? styles.tampered : styles.safe]}
        onPress={() => setTampered(!tampered)}
      >
        <Text style={styles.flagText}>
          {tampered ? 'Raise Tamper Flag 🚩' : 'Clear Tamper Flag'}
        </Text>
      </TouchableOpacity>
      {tampered && (
        <View style={styles.alert}>
          <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Tampering Detected!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', justifyContent: 'center' },
  header: { fontSize: 21, fontWeight: 'bold', marginBottom: 20 },
  flagBtn: { padding: 20, borderRadius: 20, marginBottom: 18, alignItems: 'center' },
  tampered: { backgroundColor: '#FEE2E2' },
  safe: { backgroundColor: '#D1FAE5' },
  flagText: { fontSize: 18, fontWeight: 'bold', color: '#991B1B' },
  alert: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8, marginTop: 10 }
});
