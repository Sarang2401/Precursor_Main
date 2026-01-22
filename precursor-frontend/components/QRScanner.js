import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';

export default function QRScanner({ onScan, onCancel }) {
  const [manualInput, setManualInput] = useState('');

  const handleManualScan = () => {
    if (manualInput.trim()) {
      if (onScan) {
        onScan(manualInput.trim());
      } else {
        Alert.alert('Scanned', `ID: ${manualInput.trim()}`);
      }
      setManualInput('');
    } else {
      Alert.alert('Error', 'Please enter a shipment ID');
    }
  };

  const handleQuickScan = (sampleId) => {
    if (onScan) {
      onScan(sampleId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📷 QR Scanner</Text>
        <Text style={styles.subtitle}>Scan or enter shipment ID manually</Text>
      </View>

      {/* Camera Placeholder */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraIcon}>📱</Text>
        <Text style={styles.cameraText}>Camera Scanner</Text>
        <Text style={styles.cameraSubtext}>
          Camera scanning requires a development build
        </Text>
        <Text style={styles.noteText}>
          For now, use manual entry or quick test buttons below
        </Text>
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
        <TouchableOpacity style={styles.scanButton} onPress={handleManualScan}>
          <Text style={styles.scanButtonText}>✓ Confirm</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Test Buttons */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>Quick Test (Sample IDs)</Text>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => handleQuickScan('PHARMA-001')}
        >
          <Text style={styles.quickButtonText}>📦 PHARMA-001</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => handleQuickScan('PHARMA-002')}
        >
          <Text style={styles.quickButtonText}>📦 PHARMA-002</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => handleQuickScan('PHARMA-003')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20
  },
  header: {
    marginBottom: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  cameraPlaceholder: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed'
  },
  cameraIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  cameraText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8
  },
  cameraSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8
  },
  noteText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  manualSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB'
  },
  scanButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  quickSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  quickButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});