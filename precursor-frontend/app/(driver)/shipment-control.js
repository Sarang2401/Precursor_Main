import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../config/api';

export default function ShipmentControlScreen() {
  const { shipmentId } = useLocalSearchParams();
  const [shipment, setShipment] = useState(null);
  const [gpsState, setGpsState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [shipmentId]);

  const loadData = async () => {
    try {
      const [gpsData, shipmentData] = await Promise.all([
        api.getGPSState(),
        shipmentId ? api.getShipmentDetails(shipmentId) : Promise.resolve({ shipment: null })
      ]);

      setGpsState(gpsData);
      if (shipmentData.shipment) {
        setShipment(shipmentData.shipment);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load shipment:', error);
      Alert.alert('Error', 'Could not load shipment data');
      setLoading(false);
    }
  };

  const handleManualGPSStep = async () => {
    try {
      await api.triggerGPSStep();
      Alert.alert('Success', 'GPS position advanced manually');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to advance GPS');
    }
  };

  const handleScanCheckpoint = () => {
    router.push(`/(driver)/scan-shipment?shipmentId=${shipmentId}`);
  };

  const handleViewGPS = () => {
    router.push(`/(driver)/gps-hops?shipmentId=${shipmentId}`);
  };

  const handleReportIssue = () => {
    router.push(`/(driver)/tamper?shipmentId=${shipmentId}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F57C00" />
        <Text style={styles.loadingText}>Loading controls...</Text>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No shipment found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ Shipment Control</Text>
      </View>

      {/* Shipment Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shipment Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Product ID:</Text>
          <Text style={styles.value}>{shipment.productId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>From:</Text>
          <Text style={styles.value}>{shipment.origin}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.value}>{shipment.destination}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[
            styles.value,
            { color: shipment.status === 'OFF_ROUTE' ? '#EF4444' : '#10B981', fontWeight: 'bold' }
          ]}>
            {shipment.status}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Weight:</Text>
          <Text style={styles.value}>
            {shipment.currentWeight.toFixed(2)} / {shipment.initialWeight} kg
          </Text>
        </View>
      </View>

      {/* GPS Status Card */}
      {gpsState && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GPS Status</Text>
          <View style={styles.gpsInfo}>
            <Text style={styles.gpsText}>
              📍 {gpsState.lat.toFixed(6)}, {gpsState.lon.toFixed(6)}
            </Text>
            <View style={[
              styles.gpsStatusBadge,
              { backgroundColor: gpsState.offRoute ? '#FEE2E2' : '#D1FAE5' }
            ]}>
              <Text style={[
                styles.gpsStatusText,
                { color: gpsState.offRoute ? '#EF4444' : '#10B981' }
              ]}>
                {gpsState.offRoute ? '⚠️ OFF ROUTE' : '✅ On Route'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Control Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Control Actions</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#43A047' }]}
          onPress={handleScanCheckpoint}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Scan Checkpoint</Text>
            <Text style={styles.actionSubtitle}>Record checkpoint with sensors</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#1976D2' }]}
          onPress={handleViewGPS}
        >
          <Text style={styles.actionIcon}>🛰️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View GPS Tracker</Text>
            <Text style={styles.actionSubtitle}>See live GPS updates and history</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F57C00' }]}
          onPress={handleManualGPSStep}
        >
          <Text style={styles.actionIcon}>➡️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Manual GPS Step</Text>
            <Text style={styles.actionSubtitle}>Advance GPS to next position</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
          onPress={handleReportIssue}
        >
          <Text style={styles.actionIcon}>⚠️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Report Issue</Text>
            <Text style={styles.actionSubtitle}>Report tampering or damage</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ All actions are logged to the blockchain for audit trail. 
          GPS updates automatically every 5 seconds.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280'
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    fontSize: 16,
    color: '#F57C00',
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600'
  },
  gpsInfo: {
    gap: 10
  },
  gpsText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151'
  },
  gpsStatusBadge: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  gpsStatusText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  actionsSection: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16
  },
  actionTextContainer: {
    flex: 1
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9
  },
  infoBox: {
    margin: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6'
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20
  },
  button: {
    backgroundColor: '#F57C00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});