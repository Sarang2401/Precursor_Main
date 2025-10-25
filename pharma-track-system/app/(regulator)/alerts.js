import { FlatList, StyleSheet, Text, View } from 'react-native';
import AlertBanner from '../../components/AlertBanner';

const alerts = [
  { urn: 'URN-2025-001234', type: 'Tamper', location: 'Pune Checkpoint', time: '15 min ago' },
  { urn: 'URN-2025-001230', type: 'Temperature Out of Range', location: 'Mumbai Facility', time: '1 hr ago' },
];

export default function RegulatorAlertsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Active Alerts</Text>
      <FlatList
        data={alerts}
        renderItem={({ item }) => <AlertBanner {...item} />}
        keyExtractor={item => item.urn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 14, color: '#DC2626' },
});
