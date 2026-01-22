import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import AlertBanner from '../../components/AlertBanner';
import { api } from '../../config/api';

export default function RegulatorAlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const data = await api.getMLAlerts();

      // Transform ML alerts to display format
      const transformedAlerts = data.map((alert, index) => ({
        id: alert.alert_id || `alert-${index}`,
        urn: alert.device || 'Unknown Device',
        type: alert.alerts?.[0]?.detail?.replace(/_/g, ' ') || alert.risk,
        location: `Risk: ${alert.risk}`,
        time: formatTime(alert.timestamp),
        risk: alert.risk
      }));

      setAlerts(transformedAlerts);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to load ML alerts:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading ML alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ML Anomaly Alerts</Text>
      <FlatList
        data={alerts}
        renderItem={({ item }) => <AlertBanner {...item} />}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAlerts(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>✅ No ML alerts</Text>
            <Text style={styles.emptySubtext}>Sensor readings are within normal parameters</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6B7280' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 14, color: '#DC2626' },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' }
});
