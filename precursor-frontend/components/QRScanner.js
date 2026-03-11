import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../config/AuthContext';

export default function QRScanner({ onScan, onCancel }) {
  const { getToken } = useAuth();
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [checkpointComplete, setCheckpointComplete] = useState(false);
  const [checkpointResult, setCheckpointResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Valid states for checkpoint scanning
  const VALID_CHECKPOINT_STATES = ['DISPATCHED', 'IN_TRANSIT', 'OFF_ROUTE'];

  // Get simulated GPS location (Pune area)
  const getSimulatedLocation = () => {
    const baseLocations = [
      { lat: 18.5204, lon: 73.8567, name: 'Pune Station' },
      { lat: 18.5314, lon: 73.8446, name: 'Shivajinagar' },
      { lat: 18.5362, lon: 73.8253, name: 'Deccan' },
      { lat: 18.5435, lon: 73.8258, name: 'FC Road' },
      { lat: 18.5562, lon: 73.8090, name: 'Kothrud' }
    ];
    const loc = baseLocations[Math.floor(Math.random() * baseLocations.length)];
    // Add small random offset for realism
    return {
      latitude: loc.lat + (Math.random() - 0.5) * 0.01,
      longitude: loc.lon + (Math.random() - 0.5) * 0.01,
      name: loc.name
    };
  };

  // Parse QR data (handles both JSON and plain ID)
  const parseQRData = (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'PRECURSOR_SHIPMENT' && parsed.shipmentId) {
        return { id: parsed.shipmentId, parsed };
      }
    } catch (e) {
      // Not JSON, treat as plain shipment ID
    }
    return { id: data.trim(), parsed: null };
  };

  // Lookup shipment after scan/entry
  const lookupShipment = async (inputData) => {
    const { id } = parseQRData(inputData);
    if (!id) {
      Alert.alert('Error', 'Please enter a valid shipment ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/shipments/${id}`);
      if (!response.ok) {
        throw new Error('Shipment not found');
      }
      const data = await response.json();
      setShipmentData(data.shipment);
    } catch (error) {
      Alert.alert('Error', 'Shipment not found. Please check the ID and try again.');
      setShipmentData(null);
    } finally {
      setLoading(false);
    }
  };

  // Record checkpoint
  const recordCheckpoint = async () => {
    setErrorMessage(null);

    const token = getToken();
    if (!token) {
      setErrorMessage('You must be logged in as a driver');
      return;
    }

    // Check if shipment is in valid state
    if (!VALID_CHECKPOINT_STATES.includes(shipmentData.status)) {
      setErrorMessage(`Cannot scan checkpoint for shipment in ${shipmentData.status} state. The manufacturer must first DISPATCH the shipment.`);
      return;
    }

    setLoading(true);
    try {
      const location = getSimulatedLocation();

      const response = await fetch(`${API_BASE_URL}/shipments/${shipmentData.id}/checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          notes: `Checkpoint scan at ${location.name}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record checkpoint');
      }

      const result = await response.json();
      setCheckpointResult(result);
      setCheckpointComplete(true);

      // Notify parent if callback provided
      if (onScan) {
        onScan(shipmentData.id);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to record checkpoint');
    } finally {
      setLoading(false);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setShipmentData(null);
    setCheckpointComplete(false);
    setCheckpointResult(null);
    setManualInput('');
    setErrorMessage(null);
  };

  // Handle manual input confirm
  const handleManualScan = () => {
    if (manualInput.trim()) {
      lookupShipment(manualInput.trim());
    } else {
      Alert.alert('Error', 'Please enter a shipment ID');
    }
  };

  // Render checkpoint success
  if (checkpointComplete && checkpointResult) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Checkpoint Recorded!</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Shipment</Text>
            <Text style={styles.resultValue}>{checkpointResult.checkpoint.productId}</Text>

            <Text style={styles.resultLabel}>Location</Text>
            <Text style={styles.resultValue}>
              [{checkpointResult.checkpoint.location.latitude.toFixed(4)}, {checkpointResult.checkpoint.location.longitude.toFixed(4)}]
            </Text>

            <Text style={styles.resultLabel}>Time</Text>
            <Text style={styles.resultValue}>{new Date(checkpointResult.checkpoint.timestamp).toLocaleString()}</Text>

            <Text style={styles.resultLabel}>Digitally Signed</Text>
            <Text style={[styles.resultValue, { color: checkpointResult.checkpoint.signed ? '#10B981' : '#EF4444' }]}>
              {checkpointResult.checkpoint.signed ? '✓ Yes' : '✗ No'}
            </Text>
          </View>

          {checkpointResult.stateChanged && (
            <View style={styles.stateChangeCard}>
              <Text style={styles.stateChangeText}>
                📦 State Changed: {checkpointResult.stateChanged.from} → {checkpointResult.stateChanged.to}
              </Text>
            </View>
          )}

          {checkpointResult.weightAlert && (
            <View style={[styles.alertCard, checkpointResult.weightAlert.level === 'THEFT' ? styles.alertDanger : styles.alertWarning]}>
              <Text style={styles.alertText}>
                ⚠️ Weight Alert: {checkpointResult.weightAlert.message}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.newScanButton} onPress={resetScanner}>
            <Text style={styles.newScanButtonText}>📷 Scan Another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Render shipment verification
  if (shipmentData) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📦 Verify Shipment</Text>
          <Text style={styles.subtitle}>Confirm this is the correct shipment</Text>
        </View>

        <View style={styles.shipmentCard}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Product ID</Text>
            <Text style={styles.cardValue}>{shipmentData.productId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Chemical URN</Text>
            <Text style={styles.cardValueSmall}>{shipmentData.chemicalURN || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Batch ID</Text>
            <Text style={styles.cardValue}>{shipmentData.batchId || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Route</Text>
            <Text style={styles.cardValue}>{shipmentData.origin} → {shipmentData.destination}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status</Text>
            <Text style={[styles.cardValue, { color: '#2563EB' }]}>{shipmentData.status}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Weight</Text>
            <Text style={styles.cardValue}>{shipmentData.currentWeight} {shipmentData.unit || 'kg'}</Text>
          </View>
        </View>

        {/* Status Warning */}
        {!VALID_CHECKPOINT_STATES.includes(shipmentData.status) && (
          <View style={styles.statusWarning}>
            <Text style={styles.statusWarningText}>
              ⚠️ This shipment is in <Text style={{ fontWeight: 'bold' }}>{shipmentData.status}</Text> state.
              {'\n'}The manufacturer must DISPATCH it before you can scan checkpoints.
            </Text>
          </View>
        )}

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>❌ {errorMessage}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !VALID_CHECKPOINT_STATES.includes(shipmentData.status) && styles.confirmButtonDisabled
              ]}
              onPress={recordCheckpoint}
            >
              <Text style={styles.confirmButtonText}>✓ Confirm & Record Checkpoint</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={resetScanner}>
              <Text style={styles.backButtonText}>← Scan Different Shipment</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  // Render scanner input
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📷 QR Scanner</Text>
        <Text style={styles.subtitle}>Scan or enter shipment ID manually</Text>
      </View>

      {/* Camera Placeholder */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraIcon}>📱</Text>
        <Text style={styles.cameraText}>Camera Scanner</Text>
        <Text style={styles.cameraSubtext}>Camera scanning requires a development build</Text>
        <Text style={styles.noteText}>For now, use manual entry or quick test buttons below</Text>
      </View>

      {/* Manual Input */}
      <View style={styles.manualSection}>
        <Text style={styles.sectionTitle}>Enter Manually</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Shipment ID"
          value={manualInput}
          onChangeText={setManualInput}
          autoCapitalize="characters"
        />
        {loading ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <TouchableOpacity style={styles.scanButton} onPress={handleManualScan}>
            <Text style={styles.scanButtonText}>🔍 Lookup Shipment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Test Buttons - Now fetches real shipment */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>Quick Test (Sample IDs)</Text>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => { setManualInput('PHARMA-001'); lookupShipment('PHARMA-001'); }}
        >
          <Text style={styles.quickButtonText}>📦 PHARMA-001</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => { setManualInput('PHARMA-002'); lookupShipment('PHARMA-002'); }}
        >
          <Text style={styles.quickButtonText}>📦 PHARMA-002</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => { setManualInput('PHARMA-003'); lookupShipment('PHARMA-003'); }}
        >
          <Text style={styles.quickButtonText}>📦 PHARMA-003</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel Button */}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280' },

  // Camera placeholder
  cameraPlaceholder: { backgroundColor: '#E5E7EB', borderRadius: 12, padding: 40, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed' },
  cameraIcon: { fontSize: 64, marginBottom: 16 },
  cameraText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  cameraSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  noteText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },

  // Manual section
  manualSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#F9FAFB' },
  scanButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center' },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Quick section
  quickSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  quickButton: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  quickButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Cancel button
  cancelButton: { backgroundColor: '#EF4444', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 32, marginTop: 8 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Shipment verification card
  shipmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  cardValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  cardValueSmall: { fontSize: 11, color: '#111827', fontWeight: '600', maxWidth: 180 },

  // Confirm button
  confirmButton: { backgroundColor: '#10B981', padding: 18, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  confirmButtonDisabled: { backgroundColor: '#9CA3AF' },
  confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backButton: { backgroundColor: '#6B7280', padding: 14, borderRadius: 8, alignItems: 'center' },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Error & warning banners
  statusWarning: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 10, padding: 14, marginBottom: 12 },
  statusWarningText: { color: '#92400E', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBanner: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', borderRadius: 10, padding: 14, marginBottom: 12 },
  errorBannerText: { color: '#991B1B', fontSize: 14, textAlign: 'center', fontWeight: '600' },

  // Success state
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successIcon: { fontSize: 80, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#10B981', marginBottom: 24 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '100%', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  resultLabel: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  resultValue: { fontSize: 16, color: '#111827', fontWeight: '600', marginBottom: 4 },
  stateChangeCard: { backgroundColor: '#DBEAFE', borderRadius: 8, padding: 12, width: '100%', marginBottom: 12 },
  stateChangeText: { color: '#1D4ED8', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  alertCard: { borderRadius: 8, padding: 12, width: '100%', marginBottom: 12 },
  alertWarning: { backgroundColor: '#FEF3C7' },
  alertDanger: { backgroundColor: '#FEE2E2' },
  alertText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  newScanButton: { backgroundColor: '#2563EB', padding: 16, borderRadius: 10, alignItems: 'center', width: '100%', marginTop: 8 },
  newScanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});