import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRCodeScreen({ route, navigation }) {
  const shipment = route.params;
  const qrValue = JSON.stringify(shipment);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.back} onPress={() => navigation.goBack()}>{'← Back'}</Text>
        <Text style={styles.headerTitle}>SHIPMENT QR CODE</Text>
      </View>
      <Text style={styles.success}>✅ Created!</Text>
      <View style={styles.qrCard}>
        <QRCode value={qrValue} size={160} />
        <Text style={styles.urn}>{shipment.batchId}</Text>
      </View>
      <View style={styles.details}>
        <Text>Chemical: {shipment.chemical}</Text>
        <Text>Quantity: {shipment.quantity} {shipment.unit}</Text>
        <Text>Origin: {shipment.origin} → Destination: {shipment.destination}</Text>
      </View>
      <Text style={styles.submitBtn}>📤 SUBMIT TO BLOCKCHAIN</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 16, padding: 8 },
  back: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 2, textAlign: 'center' },
  success: { fontSize: 18, textAlign: 'center', color: '#10B981', marginTop: 18, marginBottom: 10 },
  qrCard: { padding: 18, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, marginBottom: 15 },
  urn: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  details: { marginVertical: 12, backgroundColor: '#F9FAFB', borderRadius: 6, padding: 10 },
  submitBtn: { color: '#2563EB', fontWeight: 'bold', fontSize: 14, paddingTop: 15, textAlign: 'center' }
});
