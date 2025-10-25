import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../config/api';

export default function AuditTrailScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, gps, checkpoint

  useEffect(() => {
    loadEvents();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const eventsData = await api.getAllEvents();
      setEvents(eventsData.events);
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to load events:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadEvents(true);
  };

  const getFilteredEvents = () => {
    if (filter === 'gps') {
      return events.filter(e => e.type === 'GPS_UPDATE');
    }
    if (filter === 'checkpoint') {
      return events.filter(e => e.type === 'CHECKPOINT_SCAN');
    }
    return events;
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'GPS_UPDATE': return '🛰️';
      case 'CHECKPOINT_SCAN': return '📷';
      default: return '📋';
    }
  };

  const getEventColor = (type, offRoute) => {
    if (offRoute) return '#FEE2E2';
    if (type === 'GPS_UPDATE') return '#EFF6FF';
    if (type === 'CHECKPOINT_SCAN') return '#D1FAE5';
    return '#F3F4F6';
  };

  const renderEventItem = ({ item }) => (
    <View style={[styles.eventCard, { backgroundColor: getEventColor(item.type, item.offRoute) }]}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventIcon}>{getEventIcon(item.type)}</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventType}>{item.type.replace('_', ' ')}</Text>
          <Text style={styles.eventTime}>{formatDateTime(item.timestamp)}</Text>
        </View>
        {item.offRoute === 1 && (
          <View style={styles.offRouteBadge}>
            <Text style={styles.offRouteText}>⚠️</Text>
          </View>
        )}
      </View>

      <View style={styles.eventDetails}>
        {item.latitude && item.longitude && (
          <Text style={styles.detailText}>
            📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        )}
        
        {item.temperature && (
          <Text style={styles.detailText}>
            🌡️ {item.temperature.toFixed(1)}°C
          </Text>
        )}
        
        {item.humidity && (
          <Text style={styles.detailText}>
            💧 {item.humidity.toFixed(1)}%
          </Text>
        )}
        
        {item.weight && (
          <Text style={styles.detailText}>
            ⚖️ {item.weight.toFixed(2)} kg
          </Text>
        )}
        
        <Text style={styles.shipmentId}>
          Shipment: {item.shipmentId.slice(0, 8)}...
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading audit trail...</Text>
      </View>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 Audit Trail</Text>
        <Text style={styles.subtitle}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'gps' && styles.filterTabActive]}
          onPress={() => setFilter('gps')}
        >
          <Text style={[styles.filterText, filter === 'gps' && styles.filterTextActive]}>
            GPS ({events.filter(e => e.type === 'GPS_UPDATE').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'checkpoint' && styles.filterTabActive]}
          onPress={() => setFilter('checkpoint')}
        >
          <Text style={[styles.filterText, filter === 'checkpoint' && styles.filterTextActive]}>
            Checkpoints ({events.filter(e => e.type === 'CHECKPOINT_SCAN').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Events will appear here once recorded</Text>
          </View>
        }
        contentContainerStyle={filteredEvents.length === 0 && styles.emptyList}
      />

      {/* Stats Footer */}
      {filteredEvents.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {events.filter(e => e.offRoute === 1).length}
            </Text>
            <Text style={styles.statLabel}>Off-Route</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {events.filter(e => e.type === 'CHECKPOINT_SCAN').length}
            </Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
        </View>
      )}
    </View>
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
    color: '#D97706',
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 8
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  filterTabActive: {
    borderBottomColor: '#D97706'
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  filterTextActive: {
    color: '#D97706'
  },
  eventCard: {
    margin: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6'
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  eventIcon: {
    fontSize: 24,
    marginRight: 12
  },
  eventInfo: {
    flex: 1
  },
  eventType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'capitalize'
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  offRouteBadge: {
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 6
  },
  offRouteText: {
    fontSize: 16
  },
  eventDetails: {
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace'
  },
  shipmentId: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'monospace'
  },
  emptyList: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D97706',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  }
});