import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function DebugPanelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>DEBUG SETTINGS</Text>
      <Text style={styles.label}>RPC Endpoint</Text>
      <TextInput style={styles.input} placeholder="http://localhost:8545" defaultValue="http://localhost:8545" />
      <Text style={styles.label}>Contract Address</Text>
      <TextInput style={styles.input} placeholder="0x742d...Cc66" defaultValue="0x742d35Cc6634C0532925..." />
      <Text style={styles.label}>Private Key</Text>
      <TextInput style={styles.input} placeholder="Private Key" secureTextEntry />
      <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>TEST CONNECTION</Text></TouchableOpacity>
      <Text style={{marginVertical: 12, color: "#059669"}}>Status: Connected (Block 12,456)</Text>
      <TouchableOpacity style={styles.secondaryBtn}><Text style={styles.secondaryText}>GENERATE 5 TEST SHIPMENTS</Text></TouchableOpacity>
      <TouchableOpacity style={styles.dangerBtn}><Text style={styles.dangerText}>CLEAR ALL LOCAL DATA</Text></TouchableOpacity>
      <Text style={styles.label}>Advanced Options</Text>
      <TouchableOpacity style={styles.optBtn}><Text>Enable Offline Mode</Text></TouchableOpacity>
      <TouchableOpacity style={styles.optBtn}><Text>Mock GPS Location</Text></TouchableOpacity>
      <TouchableOpacity style={styles.optBtn}><Text>Show Transaction Logs</Text></TouchableOpacity>
      <Text style={{ marginTop: 22, fontSize: 10, color: "#6B7280" }}>App Version 1.0.0 | Environment: Development</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#6B7280' },
  label: { fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", padding: 11, borderRadius: 8, marginVertical: 6 },
  btn: { backgroundColor: "#2563EB", padding: 14, borderRadius: 22, alignItems: "center", marginVertical: 10 },
  btnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: { backgroundColor: "#F3F4F6", padding: 13, borderRadius: 20, alignItems: "center", marginVertical: 6 },
  secondaryText: { color: "#6B7280", fontWeight: "800" },
  dangerBtn: { backgroundColor: "#FEE2E2", padding: 13, borderRadius: 20, alignItems: "center", marginVertical: 6 },
  dangerText: { color: "#DC2626", fontWeight: "800" },
  optBtn: { borderWidth: 1, borderColor: "#D1D5DB", padding: 7, borderRadius: 8, marginBottom: 6, marginTop: 2 }
});
