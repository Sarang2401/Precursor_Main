import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../../config/api';

export default function TamperScreen() {
  const { shipmentId } = useLocalSearchParams();
  const router = useRouter();
  const [tampered, setTampered] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRaiseTamperFlag = async () => {
    if (!shipmentId) {
      Alert.alert('Error', 'No shipment ID provided');
      return;
    }

    try {
      setLoading(true);

      // Create a tamper alert in the backend
      const alertData = {
        alert_id: `TAMPER-${Date.now()}`,
        device: `SHIPMENT-${shipmentId.substring(0, 8)}`,
        timestamp: Date.now() / 1000,
        alerts: [{ type: 'tampering', detail: 'Manual tamper flag raised by driver', severity: 'HIGH' }],
        categories: ['SECURITY', 'TAMPERING'],
        risk: 'HIGH',
        status: 'UNCONFIRMED'
      };

      const response = await fetch(`${API_BASE_URL}/api/ml-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });

      if (response.ok) {
        setTampered(true);
        Alert.alert(
          '🚩 Tamper Alert Raised!',
          'A HIGH risk tampering alert has been sent to regulators.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Failed to create alert');
      }
    } catch (error) {
      console.error('Failed to raise tamper flag:', error);
      Alert.alert('Error', 'Could not send tamper alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearTamperFlag = () => {
    setTampered(false);
    Alert.alert('✅ Flag Cleared', 'Tamper flag has been cleared locally.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tamper Detection</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>🚩 Tamper Flag System</Text>
        <Text style={styles.subtitle}>
          Use this to report suspected tampering with the shipment
        </Text>

        {shipmentId && (
          <View style={styles.shipmentInfo}>
            <Text style={styles.infoLabel}>Shipment:</Text>
            <Text style={styles.infoValue}>{shipmentId.substring(0, 8)}...</Text>
          </View>
        )}

        {!tampered ? (
          <TouchableOpacity
            style={[styles.flagBtn, styles.raiseBtn]}
            onPress={handleRaiseTamperFlag}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.flagText}>🚩 Raise Tamper Flag</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.flagBtn, styles.clearBtn]}
            onPress={handleClearTamperFlag}
          >
            <Text style={styles.flagText}>✓ Clear Flag</Text>
          </TouchableOpacity>
        )}

        {tampered && (
          <View style={styles.alertBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertTitle}>TAMPERING DETECTED!</Text>
            <Text style={styles.alertSubtitle}>Alert sent to regulators</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ What happens when you raise a flag?</Text>
          <Text style={styles.infoDescription}>
            • A HIGH risk alert is created{'\n'}
            • Regulators are notified immediately{'\n'}
            • The alert is stored permanently{'\n'}
            • Shipment may be flagged for inspection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30
  },
  shipmentInfo: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
    justifyContent: 'center'
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827'
  },
  flagBtn: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  raiseBtn: {
    backgroundColor: '#DC2626',
  },
  clearBtn: {
    backgroundColor: '#10B981',
  },
  flagText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FECACA'
  },
  alertIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 4
  },
  alertSubtitle: {
    fontSize: 14,
    color: '#991B1B'
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 20
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 10
  },
  infoDescription: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 22
  }
});
