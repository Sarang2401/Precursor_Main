import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ShipmentCard from '../../components/ShipmentCard';
import StatsCard from '../../components/StatsCard';

export default function ManufacturerDashboard() {
  const shipments = [
    { urn: 'URN-2025-001234', name: 'Acetaminophen', quantity: 5000, status: 'IN_TRANSIT', date: 'Oct 12, 2025' },
    { urn: 'URN-2025-001233', name: 'Ibuprofen', quantity: 3000, status: 'DELIVERED', date: 'Oct 10, 2025' },
    { urn: 'URN-2025-001232', name: 'Morphine', quantity: 1000, status: 'CREATED', date: 'Oct 9, 2025' }
  ];
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.back}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MANUFACTURER</Text>
        <TouchableOpacity onPress={() => router.push('/(manufacturer)/create-shipment')}>
          <Text style={styles.add}>+</Text>
        </TouchableOpacity>
      </View>
      <StatsCard active={12} total={45} />
      <Text style={styles.sectionTitle}>Recent Shipments</Text>
      <ScrollView>
        {shipments.map((s, idx) => (
          <ShipmentCard key={idx} shipment={s} />
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 16, padding: 8, marginBottom: 15 },
  back: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 2, textAlign: 'center' },
  add: { color: '#fff', fontSize: 23 },
  sectionTitle: { marginTop: 12, fontWeight: '600', fontSize: 15, color: '#111827', marginBottom: 10 }
});
