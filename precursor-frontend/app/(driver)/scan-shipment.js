import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Make sure you have expo-barcode-scanner installed
// import { BarCodeScanner } from 'expo-barcode-scanner'; (use actual implementation for real scanning)
import QRScanner from '../../components/QRScanner'; // Placeholder or real implementation

export default function ScanShipmentScreen() {
  const [qrResult, setQrResult] = useState(null);

  // Simulate QR scanning checkpoint validation
  const handleScan = (data) => {
    setQrResult(data);
    Alert.alert('Checkpoint Scan', `Shipment scanned: ${data}`, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Scan Shipment at Checkpoint</Text>
      <QRScanner onScan={handleScan} />
      {qrResult && (
        <View style={styles.result}>
          <Text>Scanned URN/QR:</Text>
          <Text style={styles.code}>{qrResult}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnTxt}>Upload QR from File</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  result: { marginTop: 16, backgroundColor: '#EDE9FE', padding: 8, borderRadius: 7 },
  code: { fontWeight: 'bold', color: '#8B5CF6' },
  btn: { marginTop: 12, backgroundColor: '#8B5CF6', padding: 13, borderRadius: 6 },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});
