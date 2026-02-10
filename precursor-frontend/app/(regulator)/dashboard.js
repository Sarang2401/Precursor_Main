import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AlertBanner from '../../components/AlertBanner';
import ShipmentCard from '../../components/ShipmentCard';
import StatsCard from '../../components/StatsCard';
import { api, API_BASE_URL, formatDate, formatStatus } from '../../config/api';
import { useAuth } from '../../config/AuthContext';

export default function RegulatorDashboard() {
  const router = useRouter();
  const { logout, getToken } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [events, setEvents] = useState([]);
  const [mlAlerts, setMlAlerts] = useState([]);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [stats, setStats] = useState({
    monitored: 0,
    activeAlerts: 0,
    blockchainRecords: 0,
    signatureRate: '0%',
    integrityStatus: 'UNKNOWN'
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

      // Fetch shipments, events, ML alerts, and blockchain status in parallel
      const [shipmentsData, eventsData, mlAlertsData, blockchainData] = await Promise.all([
        api.getShipments(),
        api.getAllEvents(),
        api.getMLAlerts(),
        fetch(`${API_BASE_URL}/api/blockchain/status`).then(r => r.json()).catch(() => null)
      ]);

      // Transform shipments with enhanced chemical identity
      const transformedShipments = shipmentsData.shipments.map(ship => ({
        id: ship.id,
        urn: ship.chemicalURN || ship.productId,
        name: ship.productId,
        batchId: ship.batchId,
        manufacturerURN: ship.manufacturerURN,
        regulatoryClass: ship.regulatoryClass,
        quantity: Math.round(ship.currentWeight * 100),
        unit: ship.unit || 'kg',
        status: formatStatus(ship.status),
        date: formatDate(ship.createdAt),
        origin: ship.origin,
        destination: ship.destination,
        rawStatus: ship.status
      }));

      setShipments(transformedShipments);
      setEvents(eventsData.events);
      setMlAlerts(mlAlertsData || []);
      setBlockchainStatus(blockchainData);

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
        blockchainRecords,
        signatureRate: blockchainData?.signatureRate || '0%',
        integrityStatus: blockchainData?.integrityStatus || 'UNKNOWN'
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

  // Download PDF report for a shipment
  const downloadReport = async (shipmentId, productId) => {
    try {
      const token = getToken();
      if (!token) {
        Alert.alert('Error', 'You must be logged in to download reports');
        return;
      }

      // For web, open in new tab with authorization
      const reportUrl = `${API_BASE_URL}/api/reports/shipment/${shipmentId}`;

      // Use fetch with authorization header
      const response = await fetch(reportUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipment-report-${productId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Alert.alert('Success', `Report downloaded for ${productId}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report. Please try again.');
    }
  };

  // Download daily summary report
  const downloadDailySummary = async () => {
    try {
      const token = getToken();
      if (!token) {
        Alert.alert('Error', 'You must be logged in to download reports');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const reportUrl = `${API_BASE_URL}/api/reports/daily/${today}`;

      const response = await fetch(reportUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-summary-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Alert.alert('Success', `Daily summary report downloaded for ${today}`);
    } catch (error) {
      console.error('Error downloading daily report:', error);
      Alert.alert('Error', 'Failed to download daily report. Please try again.');
    }
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

        {/* Blockchain Integrity Panel */}
        <View style={[
          styles.blockchainPanel,
          stats.integrityStatus === 'FULL' ? styles.blockchainFull : styles.blockchainPartial
        ]}>
          <View style={styles.blockchainHeader}>
            <Text style={styles.blockchainTitle}>🔗 Blockchain Integrity</Text>
            <Text style={[
              styles.blockchainStatus,
              stats.integrityStatus === 'FULL' ? styles.statusFull : styles.statusPartial
            ]}>
              {stats.integrityStatus === 'FULL' ? '✓ VERIFIED' : '⚠ PARTIAL'}
            </Text>
          </View>
          <View style={styles.blockchainStats}>
            <View style={styles.blockchainStat}>
              <Text style={styles.blockchainStatValue}>{stats.signatureRate}</Text>
              <Text style={styles.blockchainStatLabel}>Signed Events</Text>
            </View>
            <View style={styles.blockchainStat}>
              <Text style={styles.blockchainStatValue}>{blockchainStatus?.signedEvents || 0}</Text>
              <Text style={styles.blockchainStatLabel}>Digital Signatures</Text>
            </View>
          </View>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>All Shipments ({shipments.length})</Text>
          <TouchableOpacity style={styles.dailyReportBtn} onPress={downloadDailySummary}>
            <Ionicons name="document-text" size={16} color="#fff" />
            <Text style={styles.dailyReportText}>Daily Summary</Text>
          </TouchableOpacity>
        </View>
        {shipments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shipments to monitor</Text>
            <Text style={styles.emptySubtext}>Shipments will appear here once created</Text>
          </View>
        ) : (
          <View>
            {shipments.map((item) => (
              <View key={item.id} style={styles.shipmentRow}>
                <View style={styles.shipmentCardContainer}>
                  <ShipmentCard shipment={item} />
                </View>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => downloadReport(item.id, item.name)}
                >
                  <Ionicons name="download-outline" size={22} color="#D97706" />
                  <Text style={styles.downloadBtnText}>PDF</Text>
                </TouchableOpacity>
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
  blockchainPanel: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2
  },
  blockchainFull: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  blockchainPartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B'
  },
  blockchainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  blockchainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  blockchainStatus: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusFull: {
    backgroundColor: '#10B981',
    color: '#fff'
  },
  statusPartial: {
    backgroundColor: '#F59E0B',
    color: '#fff'
  },
  blockchainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  blockchainStat: {
    alignItems: 'center'
  },
  blockchainStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  blockchainStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
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
  },
  // New styles for PDF download feature
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  dailyReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4
  },
  dailyReportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  shipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  shipmentCardContainer: {
    flex: 1
  },
  downloadBtn: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 50
  },
  downloadBtnText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2
  }
});