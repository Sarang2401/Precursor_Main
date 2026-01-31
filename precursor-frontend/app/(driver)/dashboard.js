import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api, formatStatus } from "../../config/api";
import { useAuth } from "../../config/AuthContext";

export default function DriverDashboardScreen() {
  const { logout } = useAuth();
  const [activeShipment, setActiveShipment] = useState(null);
  const [gpsState, setGpsState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allShipments, setAllShipments] = useState([]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const shipmentsData = await api.getShipments();
      const shipments = shipmentsData?.shipments || [];
      setAllShipments(shipments);

      const gpsData = await api.getGPSState();
      setGpsState(gpsData);

      if (gpsData?.activeShipmentId) {
        const active = shipments.find(s => s.id === gpsData.activeShipmentId);
        setActiveShipment(active);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Connection Error', 'Could not connect to backend.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading driver dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar with Logout */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DRIVER</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🚚 Driver Dashboard</Text>

        {/* Active Shipment Card */}
        {activeShipment ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Shipment</Text>
            <Text style={styles.cardText}>Product: {activeShipment.productId}</Text>
            <Text style={styles.cardText}>From: {activeShipment.origin}</Text>
            <Text style={styles.cardText}>To: {activeShipment.destination}</Text>
            <Text style={[
              styles.cardText,
              styles.statusText,
              { color: activeShipment.status === 'OFF_ROUTE' ? '#EF4444' : '#10B981' }
            ]}>
              Status: {activeShipment.status}
            </Text>
            <Text style={styles.cardText}>
              Weight: {activeShipment.currentWeight?.toFixed(2) || 0} kg / {activeShipment.initialWeight} kg
            </Text>
            {gpsState && (
              <Text style={styles.cardText}>
                📍 Location: {gpsState.lat?.toFixed(4)}, {gpsState.lon?.toFixed(4)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No Active Shipment</Text>
            <Text style={styles.cardText}>
              {allShipments.length === 0
                ? 'No shipments available. Ask manufacturer to create one.'
                : 'All shipments have been delivered or are pending assignment.'}
            </Text>
          </View>
        )}

        {/* GPS Status Indicator */}
        {gpsState && activeShipment && (
          <View style={[
            styles.gpsIndicator,
            { backgroundColor: gpsState.offRoute ? '#FEE2E2' : '#D1FAE5' }
          ]}>
            <Text style={[
              styles.gpsText,
              { color: gpsState.offRoute ? '#EF4444' : '#10B981' }
            ]}>
              {gpsState.offRoute ? '⚠️ OFF ROUTE!' : '✅ On Authorized Route'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#43A047" }]}
          onPress={() => {
            if (activeShipment) {
              router.push(`/(driver)/scan-shipment?shipmentId=${activeShipment.id}`);
            } else {
              Alert.alert('No Active Shipment', 'No shipment to scan.');
            }
          }}
          disabled={!activeShipment}
        >
          <Text style={styles.buttonText}>📷 Scan QR at Checkpoint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#1976D2" }]}
          onPress={() => {
            if (activeShipment) {
              router.push(`/(driver)/gps-hops?shipmentId=${activeShipment.id}`);
            } else {
              Alert.alert('No Active Shipment', 'No shipment to track.');
            }
          }}
          disabled={!activeShipment}
        >
          <Text style={styles.buttonText}>📍 View Live GPS Tracker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#F57C00" }]}
          onPress={() => {
            if (activeShipment) {
              router.push(`/(driver)/shipment-control?shipmentId=${activeShipment.id}`);
            } else {
              Alert.alert('No Active Shipment', 'No shipment to control.');
            }
          }}
          disabled={!activeShipment}
        >
          <Text style={styles.buttonText}>⚙️ Shipment Controls</Text>
        </TouchableOpacity>

        {/* All Shipments Section */}
        {allShipments.length > 0 && (
          <View style={styles.shipmentsSection}>
            <Text style={styles.sectionTitle}>All Shipments ({allShipments.length})</Text>
            {allShipments.map((ship) => (
              <View key={ship.id} style={styles.shipmentItem}>
                <Text style={styles.shipmentText}>{ship.productId}</Text>
                <Text style={[
                  styles.shipmentStatus,
                  { color: ship.status === 'OFF_ROUTE' ? '#EF4444' : '#10B981' }
                ]}>
                  {formatStatus(ship.status)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1976D2'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280'
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0D47A1",
  },
  cardText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 17,
    marginTop: 4
  },
  gpsIndicator: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB'
  },
  gpsText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  shipmentsSection: {
    width: '100%',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10
  },
  shipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  shipmentText: {
    fontSize: 14,
    color: '#374151'
  },
  shipmentStatus: {
    fontSize: 12,
    fontWeight: 'bold'
  }
});