import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../config/api';

export default function GPSHopsScreen() {
  const { shipmentId } = useLocalSearchParams();
  const [gpsState, setGpsState] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
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
        shipmentId ? api.getShipmentDetails(shipmentId) : Promise.resolve({ shipment: null, events: [] })
      ]);

      setGpsState(gpsData);
      if (shipmentData.shipment) {
        setShipment(shipmentData.shipment);
        // Filter GPS_UPDATE events
        const gpsEvents = shipmentData.events
          .filter(e => e.type === 'GPS_UPDATE')
          .slice(0, 20); // Show last 20 GPS updates
        setEvents(gpsEvents);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load GPS data:', error);
      Alert.alert('Error', 'Could not load GPS data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading GPS tracker...</Text>
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
        <Text style={styles.title}>🛰️ GPS Tracker</Text>
      </View>

      {/* Current Position Card */}
      {gpsState && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Position</Text>
          <View style={styles.coordRow}>
            <Text style={styles.label}>Latitude:</Text>
            <Text style={styles.coordValue}>{gpsState.lat.toFixed(6)}</Text>
          </View>
          <View style={styles.coordRow}>
            <Text style={styles.label}>Longitude:</Text>
            <Text style={styles.coordValue}>{gpsState.lon.toFixed(6)}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: gpsState.offRoute ? '#FEE2E2' : '#D1FAE5' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: gpsState.offRoute ? '#EF4444' : '#10B981' }
            ]}>
              {gpsState.offRoute ? '⚠️ OFF ROUTE' : '✅ On Route'}
            </Text>
          </View>
        </View>
      )}

      {/* Shipment Info */}
      {shipment && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipment Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Product ID:</Text>
            <Text style={styles.value}>{shipment.productId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Origin:</Text>
            <Text style={styles.value}>{shipment.origin}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Destination:</Text>
            <Text style={styles.value}>{shipment.destination}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[
              styles.value,
              { color: shipment.status === 'OFF_ROUTE' ? '#EF4444' : '#10B981' }
            ]}>
              {shipment.status}
            </Text>
          </View>
        </View>
      )}

      {/* GPS History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>GPS History ({events.length} updates)</Text>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No GPS updates yet</Text>
          </View>
        ) : (
          events.map((event, index) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventIndex}>#{events.length - index}</Text>
                <Text style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.eventCoords}>
                <Text style={styles.eventCoordText}>
                  📍 {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                </Text>
              </View>
              {event.temperature && (
                <View style={styles.eventMetrics}>
                  <Text style={styles.metricText}>
                    🌡️ {event.temperature.toFixed(1)}°C
                  </Text>
                  <Text style={styles.metricText}>
                    💧 {event.humidity.toFixed(1)}%
                  </Text>
                </View>
              )}
              {event.offRoute === 1 && (
                <View style={styles.offRouteBadge}>
                  <Text style={styles.offRouteText}>⚠️ OFF ROUTE</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Manual Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
        <Text style={styles.refreshButtonText}>🔄 Refresh Now</Text>
      </TouchableOpacity>
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
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    fontSize: 16,
    color: '#1976D2',
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
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  coordValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    fontFamily: 'monospace'
  },
  statusBadge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600'
  },
  historySection: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  eventIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2'
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280'
  },
  eventCoords: {
    marginVertical: 4
  },
  eventCoordText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace'
  },
  eventMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280'
  },
  offRouteBadge: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center'
  },
  offRouteText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444'
  },
  refreshButton: {
    margin: 16,
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});