import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AlertBanner from '../../components/AlertBanner';
import ShipmentCard from '../../components/ShipmentCard';
import StatsCard from '../../components/StatsCard';
import { api, formatDate, formatStatus } from '../../config/api';
import { useAuth } from '../../config/AuthContext';

export default function RegulatorDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [events, setEvents] = useState([]);
  const [mlAlerts, setMlAlerts] = useState([]);
  const [stats, setStats] = useState({
    monitored: 0,
    activeAlerts: 0,
    blockchainRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Convert timestamp to IST (UTC +5:30)
  const convertToIST = (timestamp) => {
    const date = new Date(timestamp * 1000);
    // Add 5 hours 30 minutes for IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(date.getTime() + istOffset);
  };

  // Load data on mount
  useEffect(() => {
    loadData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all data from backend
  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      // Fetch shipments, events, and ML alerts in parallel
      const [shipmentsData, eventsData, mlAlertsData] = await Promise.all([
        api.getShipments(),
        api.getAllEvents(),
        api.getMLAlerts()
      ]);

      // Transform shipments
      const transformedShipments = shipmentsData.shipments.map(ship => ({
        id: ship.id,
        urn: ship.productId,
        name: ship.productId,
        quantity: Math.round(ship.currentWeight * 100),
        status: formatStatus(ship.status),
        date: formatDate(ship.createdAt),
        origin: ship.origin,
        destination: ship.destination,
        rawStatus: ship.status
      }));

      setShipments(transformedShipments);
      setEvents(eventsData.events);
      setMlAlerts(mlAlertsData || []);

      // Calculate statistics
      const monitored = shipmentsData.shipments.length;
      const offRouteAlerts = shipmentsData.shipments.filter(
        s => s.status === 'OFF_ROUTE'
      ).length;
      const mlAlertCount = (mlAlertsData || []).length;
      const activeAlerts = offRouteAlerts + mlAlertCount;
      const blockchainRecords = eventsData.events.length;

      setStats({
        monitored,
        activeAlerts,
        blockchainRecords
      });

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to load regulator data:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to backend. Make sure the server is running.',
        [{ text: 'OK' }]
      );
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    loadData(true);
  };

  // Extract alerts from events
  const getActiveAlerts = () => {
    const allAlerts = [];

    // Get off-route events
    const offRouteEvents = events.filter(e => e.offRoute === 1 && e.type === 'GPS_UPDATE');

    // Group by shipment and get latest
    const alertMap = {};
    offRouteEvents.forEach(event => {
      if (!alertMap[event.shipmentId] ||
        new Date(event.timestamp) > new Date(alertMap[event.shipmentId].timestamp)) {
        alertMap[event.shipmentId] = event;
      }
    });

    // Transform shipment off-route events to alert format
    Object.values(alertMap).forEach(event => {
      const shipment = shipments.find(s => s.id === event.shipmentId);
      const timeAgo = getTimeAgo(event.timestamp, false); // Use standard time for off-route

      allAlerts.push({
        id: event.id,
        urn: shipment?.urn || event.shipmentId,
        type: 'Off-Route',
        location: `[${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}]`,
        time: timeAgo,
        timestamp: event.timestamp,
        alertDetails: null // No extra details for off-route
      });
    });

    // Add ML alerts
    mlAlerts.forEach((alert, index) => {
      const formattedType = alert.alerts?.[0]?.detail?.replace(/_/g, ' ') || 'ML Anomaly';
      const istTimeAgo = getTimeAgo(alert.timestamp, true); // Use IST for ML alerts

      allAlerts.push({
        id: alert.alert_id || `ml-alert-${index}`,
        urn: alert.device || 'Unknown Device',
        type: formattedType,
        location: `Risk: ${alert.risk}`,
        time: istTimeAgo,
        timestamp: alert.timestamp,
        alertDetails: {
          temp: alert.temp,
          hum: alert.hum,
          weight: alert.weight,
          alerts: alert.alerts,
          risk: alert.risk
        }
      });
    });

    // Sort by most recent
    return allAlerts.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 20); // Show top 20
  };

  // Calculate time ago
  const getTimeAgo = (timestamp, useIST = false) => {
    const now = new Date();
    let past;

    if (useIST && typeof timestamp === 'number') {
      // Convert Unix timestamp to IST
      past = convertToIST(timestamp);
    } else {
      past = new Date(timestamp);
    }

    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Show loading spinner
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading regulator dashboard...</Text>
      </View>
    );
  }

  const alerts = getActiveAlerts();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar with Logout */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); router.replace('/login'); }}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>REGULATOR</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Text style={styles.header}>Regulator Dashboard</Text>

        {/* Statistics Cards */}
        <View style={styles.stats}>
          <StatsCard title="Shipments Monitored" stat={stats.monitored} />
          <StatsCard title="Active Alerts" stat={stats.activeAlerts} />
          <StatsCard title="Total Events" stat={stats.blockchainRecords} />
        </View>

        {/* ML Alert Button */}
        <TouchableOpacity
          style={styles.mlAlertButton}
          onPress={() => router.push('/(regulator)/alerts')}
        >
          <Text style={styles.mlAlertText}>⚠️ View ML Anomalies</Text>
          <Ionicons name="chevron-forward" size={20} color="#DC2626" />
        </TouchableOpacity>


        {/* Active Alerts Section */}
        <Text style={styles.section}>Active Alerts {alerts.length > 0 && `(${alerts.length})`}</Text>
        {alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>✅ No active alerts</Text>
            <Text style={styles.emptySubtext}>All shipments are on authorized routes</Text>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {alerts.slice(0, 5).map((item) => (
              <AlertBanner key={item.id} {...item} />
            ))}
            {alerts.length > 5 && (
              <Text style={styles.moreAlerts}>+{alerts.length - 5} more alerts (see ML Anomalies)</Text>
            )}
          </View>
        )}


        {/* All Shipments Section */}
        <Text style={styles.section}>All Shipments ({shipments.length})</Text>
        {shipments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shipments to monitor</Text>
            <Text style={styles.emptySubtext}>Shipments will appear here once created</Text>
          </View>
        ) : (
          <View>
            {shipments.map((item) => (
              <ShipmentCard key={item.id} shipment={item} />
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
    backgroundColor: '#D97706'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#D97706',
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
  headerBarTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#D97706'
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 10,
    color: '#111827'
  },
  alertsList: {
    marginBottom: 20
  },
  moreAlerts: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10
  },
  mlAlertButton: {
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  mlAlertText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});