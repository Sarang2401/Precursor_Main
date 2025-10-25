import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import AlertBanner from '../../components/AlertBanner';
import ShipmentCard from '../../components/ShipmentCard';
import StatsCard from '../../components/StatsCard';
import { api, formatDate, formatStatus } from '../../config/api';

export default function RegulatorDashboard() {
  const [shipments, setShipments] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    monitored: 0,
    activeAlerts: 0,
    blockchainRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // Fetch shipments and events in parallel
      const [shipmentsData, eventsData] = await Promise.all([
        api.getShipments(),
        api.getAllEvents()
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

      // Calculate statistics
      const monitored = shipmentsData.shipments.length;
      const activeAlerts = shipmentsData.shipments.filter(
        s => s.status === 'OFF_ROUTE'
      ).length;
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

    // Transform to alert format
    const alerts = Object.values(alertMap).map(event => {
      const shipment = shipments.find(s => s.id === event.shipmentId);
      const timeAgo = getTimeAgo(event.timestamp);
      
      return {
        id: event.id,
        urn: shipment?.urn || event.shipmentId,
        type: 'Off-Route',
        location: `[${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}]`,
        time: timeAgo,
        timestamp: event.timestamp
      };
    });

    // Sort by most recent
    return alerts.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 10); // Show top 10
  };

  // Calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
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
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Regulator Dashboard</Text>

      {/* Statistics Cards */}
      <View style={styles.stats}>
        <StatsCard title="Shipments Monitored" stat={stats.monitored} />
        <StatsCard title="Active Alerts" stat={stats.activeAlerts} />
        <StatsCard title="Total Events" stat={stats.blockchainRecords} />
      </View>

      {/* Active Alerts Section */}
      <Text style={styles.section}>Active Alerts {alerts.length > 0 && `(${alerts.length})`}</Text>
      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>✅ No active alerts</Text>
          <Text style={styles.emptySubtext}>All shipments are on authorized routes</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={({ item }) => <AlertBanner {...item} />}
          keyExtractor={item => item.id}
          style={styles.alertsList}
          nestedScrollEnabled
        />
      )}

      {/* All Shipments Section */}
      <Text style={styles.section}>All Shipments ({shipments.length})</Text>
      <FlatList
        data={shipments}
        renderItem={({ item }) => <ShipmentCard shipment={item} />}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shipments to monitor</Text>
            <Text style={styles.emptySubtext}>Shipments will appear here once created</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#fff' 
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
    maxHeight: 200,
    marginBottom: 10
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
  }
});