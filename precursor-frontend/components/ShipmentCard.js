import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getStatusColor } from '../config/api';

export default function ShipmentCard({ shipment, onPress }) {
  const statusColor = getStatusColor(shipment.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.urn}>{shipment.urn}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{shipment.status}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Product:</Text>
          <Text style={styles.value}>{shipment.name}</Text>
        </View>

        {shipment.origin && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.value} numberOfLines={1}>{shipment.origin}</Text>
          </View>
        )}

        {shipment.destination && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.value} numberOfLines={1}>{shipment.destination}</Text>
          </View>
        )}

        {shipment.quantity && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{shipment.quantity} units</Text>
          </View>
        )}

        {shipment.currentWeight && shipment.initialWeight && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Weight:</Text>
            <Text style={styles.value}>
              {shipment.currentWeight.toFixed(2)} / {shipment.initialWeight} kg
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.label}>Created:</Text>
          <Text style={styles.dateText}>{shipment.date}</Text>
        </View>
      </View>

      {/* Weight loss warning */}
      {shipment.currentWeight && shipment.initialWeight && 
       (shipment.initialWeight - shipment.currentWeight) > 0.5 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Weight loss detected: {(shipment.initialWeight - shipment.currentWeight).toFixed(2)} kg
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  urn: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  details: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right'
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 2,
    textAlign: 'right'
  },
  warningBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B'
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600'
  }
});