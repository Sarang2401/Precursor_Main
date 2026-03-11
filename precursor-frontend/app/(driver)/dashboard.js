import { useIsFocused } from '@react-navigation/native';
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api, formatStatus } from "../../config/api";
import { useAuth } from "../../config/AuthContext";

export default function DriverDashboardScreen() {
  const { logout } = useAuth();
  const isFocused = useIsFocused();
  const fetchingRef = useRef(false); // guard against overlapping fetches
  const [activeShipment, setActiveShipment] = useState(null);
  const [gpsState, setGpsState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allShipments, setAllShipments] = useState([]);
  const [sensorData, setSensorData] = useState(null); // ThingSpeak live readings

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  useEffect(() => {
    // Only poll when this screen is actually visible — pauses when child screens are open
    if (!isFocused) return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // Handle hardware back button — only when THIS screen is focused
  useEffect(() => {
    const backAction = () => {
      if (!isFocused) return false; // Let Stack handle it for child screens
      logout();
      router.replace('/login');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isFocused]);

  const loadData = async () => {
    if (fetchingRef.current) return; // skip if previous fetch still running
    fetchingRef.current = true;
    try {
      const shipmentsData = await api.getShipments();
      const shipments = shipmentsData?.shipments || [];
      setAllShipments(shipments);

      const gpsData = await api.getGPSState();
      setGpsState(gpsData);

      // Determine active shipment by status (not GPS pointer, which stays fixed after delivery)
      const activeOnes = shipments.filter(s => {
        const st = (s.status || '').toUpperCase().replace(/\s/g, '_');
        return ['IN_TRANSIT', 'OFF_ROUTE', 'DISPATCHED'].includes(st);
      });
      // Prefer the GPS-simulated one if it's still active, otherwise first active one
      const gpsActive = gpsData?.activeShipmentId
        ? activeOnes.find(s => s.id === gpsData.activeShipmentId)
        : null;
      setActiveShipment(gpsActive || activeOnes[0] || null);

      // Fetch ThingSpeak live sensor readings (silent fail — no crash if unavailable)
      try {
        const sensors = await api.getLiveSensors();
        if (sensors?.available) setSensorData(sensors);
      } catch (_) { /* ThingSpeak unavailable — keep last reading */ }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Silent fail on polling errors — avoids blocking Alert dialogs
      if (loading) setLoading(false);
    } finally {
      fetchingRef.current = false;
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

        {/* Live Sensor Readings from ThingSpeak */}
        {sensorData && sensorData.available && (
          <View style={styles.sensorCard}>
            <Text style={styles.sensorTitle}>🌡️ Live Sensor Readings</Text>
            <Text style={styles.sensorSub}>From ThingSpeak Channel</Text>
            <View style={styles.sensorRow}>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorIcon}>🌡️</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.temperature != null ? sensorData.temperature.toFixed(1) + '°C' : '--'}
                </Text>
                <Text style={styles.sensorLabel}>Temperature</Text>
              </View>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorIcon}>💧</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.humidity != null ? sensorData.humidity.toFixed(1) + '%' : '--'}
                </Text>
                <Text style={styles.sensorLabel}>Humidity</Text>
              </View>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorIcon}>⚖️</Text>
                <Text style={styles.sensorValue}>
                  {sensorData.weight != null ? sensorData.weight.toFixed(2) + ' kg' : '--'}
                </Text>
                <Text style={styles.sensorLabel}>Weight</Text>
              </View>
            </View>
            {sensorData.updatedAt && (
              <Text style={styles.sensorTimestamp}>
                Last updated: {new Date(sensorData.updatedAt).toLocaleTimeString()}
              </Text>
            )}
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

        {/* All Shipments Section */}
        {allShipments.length > 0 && (
          <View style={styles.shipmentsSection}>
            <Text style={styles.sectionTitle}>All Shipments ({allShipments.length})</Text>
            {allShipments.map((ship) => {
              const s = (ship.status || '').toUpperCase().replace(/\s/g, '_');
              const isActive = ['IN_TRANSIT', 'OFF_ROUTE', 'DISPATCHED'].includes(s);
              const isDelivered = s === 'DELIVERED';
              const statusColor = s === 'OFF_ROUTE' ? '#EF4444' : isDelivered ? '#6B7280' : '#10B981';
              return (
                <View key={ship.id} style={styles.shipmentItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shipmentText}>{ship.productId}</Text>
                    <Text style={[styles.shipmentStatus, { color: statusColor }]}>
                      {formatStatus(ship.status)}
                    </Text>
                  </View>
                  {isActive && (
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => router.push(`/(driver)/shipment-control?shipmentId=${ship.id}`)}
                    >
                      <Text style={styles.controlBtnText}>⚙️ Controls</Text>
                    </TouchableOpacity>
                  )}
                  {isDelivered && (
                    <View style={styles.deliveredBadge}>
                      <Text style={styles.deliveredBadgeText}>✅ Done</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingTop: StatusBar.currentHeight || 0,
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
  },
  controlBtn: {
    backgroundColor: '#F57C00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  controlBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deliveredBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  deliveredBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  sensorCard: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sensorTitle: { fontSize: 15, fontWeight: 'bold', color: '#1D4ED8', marginBottom: 2 },
  sensorSub: { fontSize: 11, color: '#6B7280', marginBottom: 12 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sensorItem: { alignItems: 'center', flex: 1 },
  sensorIcon: { fontSize: 22, marginBottom: 4 },
  sensorValue: { fontSize: 16, fontWeight: 'bold', color: '#1E40AF' },
  sensorLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sensorTimestamp: { fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: 10 },
});
