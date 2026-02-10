import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShipmentCard from '../../components/ShipmentCard';
import StatsCard from '../../components/StatsCard';
import { QRCodeModal } from '../../components/ShipmentQRCode';
import { api, API_BASE_URL, formatStatus, formatDate } from '../../config/api';
import { useAuth } from '../../config/AuthContext';

export default function ManufacturerDashboard() {
  const { user, logout, getToken } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ active: 0, total: 0 });
  const [actionMessage, setActionMessage] = useState(null);

  // QR Code Modal state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Load shipments on mount
  useEffect(() => {
    loadShipments();
    const interval = setInterval(loadShipments, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadShipments = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const data = await api.getShipments();

      const transformedShipments = data.shipments.map(ship => ({
        id: ship.id,
        urn: ship.chemicalURN || ship.productId,
        name: ship.productId,
        batchId: ship.batchId,
        quantity: ship.currentWeight,
        unit: ship.unit || 'kg',
        status: formatStatus(ship.status),
        rawStatus: ship.status,
        date: formatDate(ship.createdAt),
        origin: ship.origin,
        destination: ship.destination
      }));

      setShipments(transformedShipments);

      const activeCount = transformedShipments.filter(s =>
        ['IN_TRANSIT', 'DISPATCHED', 'OFF_ROUTE'].includes(s.rawStatus)
      ).length;
      setStats({ active: activeCount, total: transformedShipments.length });

    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const onRefresh = () => loadShipments(true);

  const showQRCode = (shipment) => {
    setSelectedShipment(shipment);
    setQrModalVisible(true);
  };

  // Dispatch shipment (CREATED → DISPATCHED)
  const dispatchShipment = async (shipment) => {
    const token = getToken();
    if (!token) {
      setActionMessage({ type: 'error', text: 'You must be logged in' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newState: 'DISPATCHED'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Failed to dispatch' });
        setTimeout(() => setActionMessage(null), 4000);
        return;
      }

      setActionMessage({ type: 'success', text: `✅ ${shipment.name} dispatched successfully!` });
      setTimeout(() => setActionMessage(null), 4000);
      loadShipments(); // Refresh list
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Network error. Check backend is running.' });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading shipments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MANUFACTURER</Text>
        <TouchableOpacity onPress={() => router.push('/(manufacturer)/create-shipment')}>
          <Text style={styles.add}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Action Message Banner */}
      {actionMessage && (
        <View style={[styles.messageBanner, actionMessage.type === 'error' ? styles.errorBanner : styles.successBanner]}>
          <Text style={styles.messageBannerText}>{actionMessage.text}</Text>
        </View>
      )}

      {/* Stats */}
      <StatsCard active={stats.active} total={stats.total} />

      {/* Section Title */}
      <Text style={styles.sectionTitle}>Recent Shipments ({shipments.length})</Text>

      {/* Shipment List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {shipments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No shipments yet</Text>
            <Text style={styles.emptySubtext}>Create your first shipment to get started</Text>
          </View>
        ) : (
          shipments.map((s) => (
            <View key={s.id} style={styles.shipmentRow}>
              <View style={styles.shipmentCardContainer}>
                <ShipmentCard shipment={s} />
              </View>
              <View style={styles.actionButtons}>
                {/* Dispatch Button - only shown for CREATED shipments */}
                {s.rawStatus === 'CREATED' && (
                  <TouchableOpacity
                    style={styles.dispatchBtn}
                    onPress={() => dispatchShipment(s)}
                  >
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={styles.dispatchBtnText}>Dispatch</Text>
                  </TouchableOpacity>
                )}
                {/* Status badge for already dispatched */}
                {s.rawStatus === 'DISPATCHED' && (
                  <View style={styles.dispatchedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.dispatchedText}>Sent</Text>
                  </View>
                )}
                {/* In Transit badge */}
                {s.rawStatus === 'IN_TRANSIT' && (
                  <View style={styles.transitBadge}>
                    <Ionicons name="car-outline" size={18} color="#3B82F6" />
                    <Text style={styles.transitText}>Moving</Text>
                  </View>
                )}
                {/* QR Button */}
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => showQRCode(s)}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#2563EB" />
                  <Text style={styles.qrButtonText}>QR</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrModalVisible}
        shipmentId={selectedShipment?.id}
        productId={selectedShipment?.name}
        onClose={() => setQrModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 16, padding: 8, marginBottom: 15 },
  logoutBtn: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 2, textAlign: 'center' },
  add: { color: '#fff', fontSize: 23 },
  sectionTitle: { marginTop: 12, fontWeight: '600', fontSize: 15, color: '#111827', marginBottom: 10 },

  // Message banners
  messageBanner: { padding: 12, borderRadius: 8, marginBottom: 10 },
  errorBanner: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  successBanner: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981' },
  messageBannerText: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#111827' },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#6B7280' },

  // Shipment row
  shipmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  shipmentCardContainer: { flex: 1 },
  actionButtons: { marginLeft: 6, alignItems: 'center', gap: 6 },

  // Dispatch button
  dispatchBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65
  },
  dispatchBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Dispatched badge
  dispatchedBadge: { alignItems: 'center', justifyContent: 'center', minWidth: 65, paddingVertical: 6 },
  dispatchedText: { color: '#10B981', fontSize: 10, fontWeight: '600', marginTop: 2 },

  // In Transit badge
  transitBadge: { alignItems: 'center', justifyContent: 'center', minWidth: 65, paddingVertical: 6 },
  transitText: { color: '#3B82F6', fontSize: 10, fontWeight: '600', marginTop: 2 },

  // QR button
  qrButton: {
    backgroundColor: '#DBEAFE',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65
  },
  qrButtonText: { color: '#2563EB', fontSize: 10, fontWeight: '600', marginTop: 2 }
});
